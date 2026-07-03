import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@contracts/pool_types"
import "@wrappers/PredictionPool.gen"

const DAY = 86400

/// Deploys a fresh pari-mutuel pool owned by the "deployer" wallet.
/// Betting is open for 1 day; the owner must resolve within the following day.
/// Run locally:        acton script contracts/scripts/deployPool.tolk
/// Broadcast (testnet): acton script contracts/scripts/deployPool.tolk --net testnet
/// testnet address kQCIz024HgkVqOtHFTAmnTZ0-QxHU9E229Mvi-UYYold9t8I
fun main() {
    val owner = scripts.wallet("deployer");

    val now = blockchain.now();
    val pool = PredictionPool.fromStorage({
        ownerAddress: owner.address,
        bettingDeadline: now + 7 * DAY,
        resolutionDeadline: now + 2 * 7 * DAY,
        minBet: ton("0.5"),
        feeBps: 500,
        status: 0,
        winningOutcome: 0,
        totalPot: 0,
        totalYes: 0,
        totalNo: 0,
        yesCount: 0,
        noCount: 0,
        claimedCount: 0,
        bets: [],
    });

    // Seed must be >= MIN_SEED (0.1 TON): covers storage rent + gas; leftover returns to owner.
    val res = pool.deploy(owner.address, { value: ton("0.2") });
    println(res.waitForTrace());

    val st = pool.getStatus();
    println("Deployed PredictionPool to {}", pool.address);
    println(
        "  status={} bettingDeadline={} resolutionDeadline={}",
        st.status,
        st.bettingDeadline,
        st.resolutionDeadline,
    );
    println("  feeBps={} (5%), minBet=0.5 TON", pool.getPool().feeBps);
    println("Use this address with bet.tolk / resolve.tolk / claim.tolk");
}
