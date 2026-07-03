import "pool_types"

contract PredictionPool {
    author: "Acton User"
    version: "1.0.0"
    description: "Binary pari-mutuel prediction pool: bet YES/NO, owner resolves, winners claim pro-rata"
    storage: PoolStorage
    incomingMessages: PoolMessage
}

fun onInternalMessage(in: InMessage) {
    val msg = lazy PoolMessage.fromSlice(in.body);

    match (msg) {
        Bet => {
            var storage = lazy PoolStorage.load();
            assert (storage.status == STATUS_OPEN) throw PoolErrors.BettingClosed;
            assert (blockchain.now() < storage.bettingDeadline) throw PoolErrors.BettingClosed;
            assert (
                msg.outcome == OUTCOME_YES || msg.outcome == OUTCOME_NO
            ) throw PoolErrors.InvalidOutcome;
            // The stake is the full attached value; gas is funded by the fee, not deducted here.
            assert (in.valueCoins >= storage.minBet) throw PoolErrors.BetTooSmall;

            val (_, hash) = in.senderAddress.getWorkchainAndHash();
            val existing = storage.bets.get(hash);
            if (existing.isFound) {
                var bet = existing.loadValue();
                // Re-bet on the same outcome accumulates; switching sides is rejected.
                assert (bet.outcome == msg.outcome) throw PoolErrors.OutcomeConflict;
                bet.amount += in.valueCoins;
                storage.bets.set(hash, bet);
            } else {
                storage
                    .bets
                    .set(
                        hash,
                        {
                            outcome: msg.outcome,
                            amount: in.valueCoins,
                            claimed: false,
                        },
                    );
                if (msg.outcome == OUTCOME_YES) {
                    storage.yesCount += 1;
                } else {
                    storage.noCount += 1;
                }
            }

            storage.totalPot += in.valueCoins;
            if (msg.outcome == OUTCOME_YES) {
                storage.totalYes += in.valueCoins;
            } else {
                storage.totalNo += in.valueCoins;
            }
            storage.save();
        }

        Resolve => {
            var storage = lazy PoolStorage.load();
            assert (in.senderAddress == storage.ownerAddress) throw PoolErrors.NotOwner;
            assert (storage.status == STATUS_OPEN) throw PoolErrors.AlreadyResolved;
            assert (blockchain.now() >= storage.bettingDeadline) throw PoolErrors.ResolveTooEarly;
            assert (blockchain.now() < storage.resolutionDeadline) throw PoolErrors.ResolveTooLate;
            assert (
                msg.outcome == OUTCOME_YES || msg.outcome == OUTCOME_NO
            ) throw PoolErrors.InvalidOutcome;

            val winSide = msg.outcome == OUTCOME_YES ? storage.totalYes : storage.totalNo;
            if (winSide == 0) {
                // Nobody backed the winning side -> treat as cancelled, refund everyone.
                storage.status = STATUS_CANCELLED;
            } else {
                storage.status = STATUS_RESOLVED;
                storage.winningOutcome = msg.outcome;
            }
            storage.save();
        }

        Claim => {
            var storage = lazy PoolStorage.load();
            assert (
                storage.status == STATUS_RESOLVED || storage.status == STATUS_CANCELLED
            ) throw PoolErrors.NotResolved;

            val (_, hash) = in.senderAddress.getWorkchainAndHash();
            val found = storage.bets.get(hash);
            assert (found.isFound) throw PoolErrors.NoBet;
            var bet = found.loadValue();
            assert (!bet.claimed) throw PoolErrors.AlreadyClaimed;
            if (storage.status == STATUS_RESOLVED) {
                assert (bet.outcome == storage.winningOutcome) throw PoolErrors.NotAWinner;
            }

            val payout = storage.payoutFor(bet);
            assert (
                contract.getOriginalBalance() >= payout + STORAGE_RESERVE
            ) throw PoolErrors.InsufficientReserve;

            // Mark claimed BEFORE sending; reverted in onBouncedMessage if the payout bounces.
            bet.claimed = true;
            storage.bets.set(hash, bet);
            storage.claimedCount += 1;
            storage.save();

            if (payout > 0) {
                val out = createMessage({
                    bounce: BounceMode.Only256BitsOfBody,
                    value: payout,
                    dest: in.senderAddress,
                });
                // Winner receives the full payout; the forward fee is paid by the contract (from the fee buffer).
                out.send(SEND_MODE_PAY_FEES_SEPARATELY);
            }
        }

        Cancel => {
            var storage = lazy PoolStorage.load();
            assert (storage.status == STATUS_OPEN) throw PoolErrors.AlreadyResolved;
            assert (blockchain.now() >= storage.resolutionDeadline) throw PoolErrors.CancelTooEarly;
            storage.status = STATUS_CANCELLED;
            storage.save();
        }

        WithdrawFee => {
            val storage = lazy PoolStorage.load();
            assert (in.senderAddress == storage.ownerAddress) throw PoolErrors.NotOwner;
            assert (
                storage.status == STATUS_RESOLVED || storage.status == STATUS_CANCELLED
            ) throw PoolErrors.NotResolved;

            // Only after every entitled address has claimed, or after the claim grace period,
            // so a withdrawal can never dip into funds still owed to winners/refundees.
            val allClaimed = storage.claimedCount >= storage.eligibleCount();
            val gracePassed = blockchain.now() >= storage.resolutionDeadline + CLAIM_GRACE;
            assert (allClaimed || gracePassed) throw PoolErrors.WithdrawTooEarly;
            assert (
                contract.getOriginalBalance() > STORAGE_RESERVE
            ) throw PoolErrors.InsufficientReserve;

            // RESOLVED: owner gets fee + dust + leftover seed. CANCELLED: owner gets only the leftover seed.
            reserveToncoinsOnBalance(STORAGE_RESERVE, RESERVE_MODE_EXACT_AMOUNT);
            val out = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: storage.ownerAddress,
            });
            // SAFETY: STORAGE_RESERVE is reserved just above, and this branch only runs once every
            // entitled claim is settled (or after the grace period). The swept balance is therefore
            // exactly the owner's fee + dust + leftover seed, never funds still owed to claimers.
            out.send(SEND_MODE_CARRY_ALL_BALANCE);
        }

        else => {
            // Empty body = deploy message or a plain top-up.
            assert (in.body.isEmpty()) throw PoolErrors.InvalidMessage;
            // Validate immutable config + seed at deploy (the deploy message runs this branch).
            val storage = lazy PoolStorage.load();
            assert (
                storage.bettingDeadline < storage.resolutionDeadline
            ) throw PoolErrors.BadConfig;
            assert (storage.feeBps <= 10000) throw PoolErrors.BadConfig;
            assert (storage.minBet > 0) throw PoolErrors.BadConfig;
            assert (in.valueCoins >= MIN_SEED) throw PoolErrors.SeedTooSmall;
        }
    }
}

fun onBouncedMessage(in: InMessageBounced) {
    // The only bounceable outgoing message is a claim payout; the bounced-from address
    // identifies the claimer, so we revert their claim to let them retry.
    var storage = lazy PoolStorage.load();
    val (_, hash) = in.senderAddress.getWorkchainAndHash();
    val found = storage.bets.get(hash);
    if (found.isFound) {
        var bet = found.loadValue();
        if (bet.claimed) {
            bet.claimed = false;
            storage.bets.set(hash, bet);
            if (storage.claimedCount > 0) {
                storage.claimedCount -= 1;
            }
            storage.save();
        }
    }
}

get fun getStatus(): StatusReply {
    val storage = lazy PoolStorage.load();
    return {
        status: storage.status,
        winningOutcome: storage.winningOutcome,
        bettingDeadline: storage.bettingDeadline,
        resolutionDeadline: storage.resolutionDeadline,
    };
}

get fun getPool(): PoolReply {
    val storage = lazy PoolStorage.load();
    return {
        totalPot: storage.totalPot,
        totalYes: storage.totalYes,
        totalNo: storage.totalNo,
        feeBps: storage.feeBps,
    };
}

get fun getBet(who: address): BetReply {
    val storage = lazy PoolStorage.load();
    val (_, hash) = who.getWorkchainAndHash();
    val found = storage.bets.get(hash);
    if (!found.isFound) {
        return {
            outcome: 0,
            amount: 0,
            claimed: false,
        };
    }
    val bet = found.loadValue();
    return {
        outcome: bet.outcome,
        amount: bet.amount,
        claimed: bet.claimed,
    };
}

get fun getPayout(who: address): coins {
    val storage = lazy PoolStorage.load();
    if (storage.status == STATUS_OPEN) {
        return 0;
    }
    val (_, hash) = who.getWorkchainAndHash();
    val found = storage.bets.get(hash);
    if (!found.isFound) {
        return 0;
    }
    val bet = found.loadValue();
    if (bet.claimed) {
        return 0;
    }
    return storage.payoutFor(bet);
}
