// Types, storage, messages, errors and pure helpers for the PredictionPool contract.
// The entrypoints live in `PredictionPool.tolk`; this module is import-safe (no entrypoints)
// so wrappers, tests and scripts can reuse the shapes.

enum PoolErrors {
    NotOwner = 100
    InvalidOutcome = 101
    BettingClosed = 102
    BetTooSmall = 103
    OutcomeConflict = 104
    ResolveTooEarly = 105
    ResolveTooLate = 106
    AlreadyResolved = 107
    NotResolved = 108
    CancelTooEarly = 109
    NoBet = 110
    AlreadyClaimed = 111
    NotAWinner = 112
    WithdrawTooEarly = 113
    SeedTooSmall = 114
    InsufficientReserve = 115
    BadConfig = 116
    InvalidMessage = 0xFFFF
}

// status enum
const STATUS_OPEN = 0
const STATUS_RESOLVED = 1
const STATUS_CANCELLED = 2

// outcome enum (0 = unset)
const OUTCOME_YES = 1
const OUTCOME_NO = 2

// economics / safety (nanoton)
const STORAGE_RESERVE = 50000000 // 0.05 TON kept on the contract for storage rent
const MIN_SEED = 100000000 // 0.1 TON minimum deploy seed (covers rent + gas)
const CLAIM_GRACE = 604800 // 7 days; after this the owner may sweep even if not everyone claimed

struct BetInfo {
    outcome: uint8
    amount: coins
    claimed: bool
}

struct PoolStorage {
    ownerAddress: address
    bettingDeadline: uint32
    resolutionDeadline: uint32
    minBet: coins
    feeBps: uint16
    status: uint8
    winningOutcome: uint8
    totalPot: coins
    totalYes: coins
    totalNo: coins
    yesCount: uint32
    noCount: uint32
    claimedCount: uint32
    bets: map<uint256, BetInfo>
}

fun PoolStorage.load(): PoolStorage {
    return PoolStorage.fromCell(contract.getData());
}

fun PoolStorage.save(self) {
    contract.setData(self.toCell());
}

// Number of addresses entitled to a payout/refund in a terminal state.
fun PoolStorage.eligibleCount(self): int {
    if (self.status == STATUS_RESOLVED) {
        return self.winningOutcome == OUTCOME_YES ? self.yesCount : self.noCount;
    }
    // CANCELLED: everyone who bet gets a refund.
    return self.yesCount + self.noCount;
}

// Pro-rata payout (RESOLVED) or full refund (CANCELLED). Returns 0 if `bet` is not entitled.
fun PoolStorage.payoutFor(self, bet: BetInfo): coins {
    if (self.status == STATUS_CANCELLED) {
        return bet.amount;
    }
    if (bet.outcome != self.winningOutcome) {
        return 0;
    }
    val winSide = self.winningOutcome == OUTCOME_YES ? self.totalYes : self.totalNo;
    // winSide > 0 is guaranteed: `resolve` auto-cancels when the winning side is empty.
    // Spec (§7): payout = amount * (totalPot - fee) / winSide, where fee = totalPot * feeBps / 10000.
    // Expanded into a single multiply-before-divide expression (all products first, one final
    // division) for maximum precision; algebraically identical. The floor remainder (dust) stays
    // in the contract and is later swept to the owner.
    return bet.amount * self.totalPot * (10000 - self.feeBps) / (winSide * 10000);
}

// Message bodies (32-bit opcode prefixes).
struct (0x5ada4c01) Bet {
    outcome: uint8
}

struct (0x5ada4c02) Resolve {
    outcome: uint8
}

struct (0x5ada4c03) Claim {}

struct (0x5ada4c04) Cancel {}

struct (0x5ada4c05) WithdrawFee {}

type PoolMessage = Bet | Resolve | Claim | Cancel | WithdrawFee

// Getter reply structs.
struct StatusReply {
    status: uint8
    winningOutcome: uint8
    bettingDeadline: uint32
    resolutionDeadline: uint32
}

struct PoolReply {
    totalPot: coins
    totalYes: coins
    totalNo: coins
    feeBps: uint16
}

struct BetReply {
    outcome: uint8
    amount: coins
    claimed: bool
}
