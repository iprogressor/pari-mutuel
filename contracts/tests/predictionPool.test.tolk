import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"

import "@contracts/pool_types"
import "@wrappers/PredictionPool.gen"

const BETTING_DEADLINE = 2000
const RESOLUTION_DEADLINE = 3000
const BETTING_TIME = 1500 // now < bettingDeadline
const RESOLVE_TIME = 2500 // bettingDeadline <= now < resolutionDeadline
const AFTER_RESOLUTION = 3500 // now >= resolutionDeadline

struct PoolFixture {
    pool: PredictionPool
    owner: Treasury
    alice: Treasury
    bob: Treasury
    carol: Treasury
}

fun freshStorage(owner: address, feeBps: uint16): PoolStorage {
    return {
        ownerAddress: owner,
        bettingDeadline: BETTING_DEADLINE,
        resolutionDeadline: RESOLUTION_DEADLINE,
        minBet: ton("0.5"),
        feeBps,
        status: 0,
        winningOutcome: 0,
        totalPot: 0,
        totalYes: 0,
        totalNo: 0,
        yesCount: 0,
        noCount: 0,
        claimedCount: 0,
        bets: [],
    };
}

fun setupPool(): PoolFixture {
    testing.setNow(BETTING_TIME);
    val owner = testing.treasury("owner");
    val alice = testing.treasury("alice");
    val bob = testing.treasury("bob");
    val carol = testing.treasury("carol");

    val pool = PredictionPool.fromStorage(freshStorage(owner.address, 500));
    expect(
        pool.deploy(owner.address, { value: ton("1") }),
    ).toHaveSuccessfulDeploy({ to: pool.address });

    return {
        pool,
        owner,
        alice,
        bob,
        carol,
    };
}

get fun `test deploy initializes an open pool`() {
    val f = setupPool();

    val status = f.pool.getStatus();
    expect(status.status).toEqual(STATUS_OPEN);
    expect(status.winningOutcome).toEqual(0);
    expect(status.bettingDeadline).toEqual(BETTING_DEADLINE);
    expect(status.resolutionDeadline).toEqual(RESOLUTION_DEADLINE);

    val pool = f.pool.getPool();
    expect(pool.totalPot).toEqual(0);
    expect(pool.feeBps).toEqual(500);
}

get fun `test happy path pays pro-rata and fee to owner`() {
    val f = setupPool();

    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("2") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.bob.address, OUTCOME_YES, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.bob.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.carol.address, OUTCOME_NO, { value: ton("3") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.carol.address, to: f.pool.address });

    val info = f.pool.getPool();
    expect(info.totalPot).toEqual(ton("6"));
    expect(info.totalYes).toEqual(ton("3"));
    expect(info.totalNo).toEqual(ton("3"));

    testing.setNow(RESOLVE_TIME);
    expect(
        f.pool.sendResolve(f.owner.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<Resolve>({ from: f.owner.address, to: f.pool.address });
    expect(f.pool.getStatus().status).toEqual(STATUS_RESOLVED);

    // fee = 6 * 5% = 0.3 ; distributable = 5.7 ; winSide = 3
    expect(f.pool.getPayout(f.alice.address)).toEqual(ton("3.8")); // 2 * 5.7 / 3
    expect(f.pool.getPayout(f.bob.address)).toEqual(ton("1.9"));   // 1 * 5.7 / 3
    expect(f.pool.getPayout(f.carol.address)).toEqual(0);          // loser

    val aliceBefore = testing.getAccountBalance(f.alice.address);
    expect(
        f.pool.sendClaim(f.alice.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.alice.address, to: f.pool.address });
    val aliceGain = testing.getAccountBalance(f.alice.address) - aliceBefore;
    expect(aliceGain).toBeGreater(ton("3.5")); // received ~3.8 payout minus the ~0.1 gas attached
    expect(aliceGain).toBeLess(ton("3.9"));
    expect(f.pool.getBet(f.alice.address).claimed).toBeTrue();
    expect(f.pool.getPayout(f.alice.address)).toEqual(0);

    // repeated claim and loser claim are rejected
    expect(f.pool.sendClaim(f.alice.address, { value: ton("0.1") })).toHaveFailedTx({
        from: f.alice.address,
        to: f.pool.address,
        exitCode: PoolErrors.AlreadyClaimed,
    });
    expect(f.pool.sendClaim(f.carol.address, { value: ton("0.1") })).toHaveFailedTx({
        from: f.carol.address,
        to: f.pool.address,
        exitCode: PoolErrors.NotAWinner,
    });

    expect(
        f.pool.sendClaim(f.bob.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.bob.address, to: f.pool.address });

    // all winners claimed -> owner sweeps fee + dust + leftover seed
    val ownerBefore = testing.getAccountBalance(f.owner.address);
    expect(
        f.pool.sendWithdrawFee(f.owner.address, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<WithdrawFee>({ from: f.owner.address, to: f.pool.address });
    expect(testing.getAccountBalance(f.owner.address) > ownerBefore).toBeTrue();

    // contract is drained down to the storage reserve (conservation: pot = payouts + fee + dust)
    expect(testing.getAccountBalance(f.pool.address)).toBeGreater(ton("0.02"));
    expect(testing.getAccountBalance(f.pool.address)).toBeLess(ton("0.1"));
}

get fun `test no winners auto-cancels and refunds all`() {
    val f = setupPool();

    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_NO, { value: ton("2") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.bob.address, OUTCOME_NO, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.bob.address, to: f.pool.address });

    testing.setNow(RESOLVE_TIME);
    // owner resolves YES but nobody backed YES -> auto cancel
    expect(
        f.pool.sendResolve(f.owner.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<Resolve>({ from: f.owner.address, to: f.pool.address });
    expect(f.pool.getStatus().status).toEqual(STATUS_CANCELLED);

    // full refunds, no fee
    expect(f.pool.getPayout(f.alice.address)).toEqual(ton("2"));
    expect(f.pool.getPayout(f.bob.address)).toEqual(ton("1"));

    val aliceBefore = testing.getAccountBalance(f.alice.address);
    expect(
        f.pool.sendClaim(f.alice.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.alice.address, to: f.pool.address });
    val aliceGain = testing.getAccountBalance(f.alice.address) - aliceBefore;
    expect(aliceGain).toBeGreater(ton("1.7")); // full 2.0 refund minus the ~0.1 gas attached
    expect(aliceGain).toBeLess(ton("2.0"));

    expect(
        f.pool.sendClaim(f.bob.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.bob.address, to: f.pool.address });

    // both refunded -> owner sweeps leftover seed (no fee on cancel)
    val ownerBefore = testing.getAccountBalance(f.owner.address);
    expect(
        f.pool.sendWithdrawFee(f.owner.address, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<WithdrawFee>({ from: f.owner.address, to: f.pool.address });
    expect(testing.getAccountBalance(f.owner.address) > ownerBefore).toBeTrue();
}

get fun `test timeout cancel refunds everyone`() {
    val f = setupPool();

    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("2") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.bob.address, OUTCOME_NO, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.bob.address, to: f.pool.address });

    // resolution deadline passes with no resolve; anyone may cancel
    testing.setNow(AFTER_RESOLUTION);
    expect(
        f.pool.sendCancel(f.alice.address, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<Cancel>({ from: f.alice.address, to: f.pool.address });
    expect(f.pool.getStatus().status).toEqual(STATUS_CANCELLED);

    expect(f.pool.getPayout(f.alice.address)).toEqual(ton("2"));
    expect(f.pool.getPayout(f.bob.address)).toEqual(ton("1"));

    expect(
        f.pool.sendClaim(f.alice.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendClaim(f.bob.address, { value: ton("0.1") }),
    ).toHaveSuccessfulTx<Claim>({ from: f.bob.address, to: f.pool.address });
}

get fun `test rejects bet after betting deadline`() {
    val f = setupPool();
    testing.setNow(RESOLVE_TIME);
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("1") }),
    ).toHaveFailedTx({
        from: f.alice.address,
        to: f.pool.address,
        exitCode: PoolErrors.BettingClosed,
    });
}

get fun `test rejects bet below minimum`() {
    val f = setupPool();
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("0.1") }),
    ).toHaveFailedTx({
        from: f.alice.address,
        to: f.pool.address,
        exitCode: PoolErrors.BetTooSmall,
    });
}

get fun `test rejects resolve by non-owner`() {
    val f = setupPool();
    testing.setNow(RESOLVE_TIME);
    expect(
        f.pool.sendResolve(f.alice.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveFailedTx({ from: f.alice.address, to: f.pool.address, exitCode: PoolErrors.NotOwner });
}

get fun `test rejects resolve before betting deadline`() {
    val f = setupPool();
    // now = BETTING_TIME < bettingDeadline
    expect(
        f.pool.sendResolve(f.owner.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveFailedTx({
        from: f.owner.address,
        to: f.pool.address,
        exitCode: PoolErrors.ResolveTooEarly,
    });
}

get fun `test rejects resolve after resolution deadline`() {
    val f = setupPool();
    testing.setNow(AFTER_RESOLUTION);
    expect(
        f.pool.sendResolve(f.owner.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveFailedTx({
        from: f.owner.address,
        to: f.pool.address,
        exitCode: PoolErrors.ResolveTooLate,
    });
}

get fun `test rejects conflicting outcome rebet`() {
    val f = setupPool();
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_NO, { value: ton("1") }),
    ).toHaveFailedTx({
        from: f.alice.address,
        to: f.pool.address,
        exitCode: PoolErrors.OutcomeConflict,
    });
}

get fun `test rejects claim before resolve`() {
    val f = setupPool();
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(f.pool.sendClaim(f.alice.address, { value: ton("0.1") })).toHaveFailedTx({
        from: f.alice.address,
        to: f.pool.address,
        exitCode: PoolErrors.NotResolved,
    });
}

get fun `test rejects withdraw before claims settle`() {
    val f = setupPool();
    expect(
        f.pool.sendBet(f.alice.address, OUTCOME_YES, { value: ton("2") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.alice.address, to: f.pool.address });
    expect(
        f.pool.sendBet(f.bob.address, OUTCOME_NO, { value: ton("1") }),
    ).toHaveSuccessfulTx<Bet>({ from: f.bob.address, to: f.pool.address });

    testing.setNow(RESOLVE_TIME);
    expect(
        f.pool.sendResolve(f.owner.address, OUTCOME_YES, { value: ton("0.05") }),
    ).toHaveSuccessfulTx<Resolve>({ from: f.owner.address, to: f.pool.address });

    // the only winner (alice) hasn't claimed and the grace period hasn't passed
    expect(f.pool.sendWithdrawFee(f.owner.address, { value: ton("0.05") })).toHaveFailedTx({
        from: f.owner.address,
        to: f.pool.address,
        exitCode: PoolErrors.WithdrawTooEarly,
    });
}

get fun `test rejects deploy with small seed`() {
    testing.setNow(BETTING_TIME);
    val owner = testing.treasury("owner");
    val pool = PredictionPool.fromStorage(freshStorage(owner.address, 500));
    expect(
        pool.deploy(owner.address, { value: ton("0.05") }),
    ).toHaveFailedTx({ from: owner.address, to: pool.address, exitCode: PoolErrors.SeedTooSmall });
}

get fun `test rejects deploy with inverted deadlines`() {
    testing.setNow(BETTING_TIME);
    val owner = testing.treasury("owner");
    var st = freshStorage(owner.address, 500);
    st.bettingDeadline = 3000;
    st.resolutionDeadline = 2000;
    val pool = PredictionPool.fromStorage(st);
    expect(
        pool.deploy(owner.address, { value: ton("1") }),
    ).toHaveFailedTx({ from: owner.address, to: pool.address, exitCode: PoolErrors.BadConfig });
}
