import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@contracts/pool_types"
import "@wrappers/PredictionPool.gen"

/// Owner resolves the winning outcome. Outcome: 1 = YES, 2 = NO.
/// Must be called by the owner wallet within [bettingDeadline, resolutionDeadline).
/// Example: acton script contracts/scripts/resolve.tolk <pool-address> 1 --net testnet
fun main(poolAddress: address, outcome: int) {
    val owner = scripts.wallet("deployer");
    val pool = PredictionPool.fromAddress(poolAddress);

    if (!scripts.isContractDeployed(poolAddress)) {
        println("Pool {} is not deployed yet", poolAddress);
        return;
    }

    val res = pool.sendResolve(
        owner.address,
        outcome as uint8,
        { value: ton("0.05"), bounce: true },
    );
    println(res.waitForTrace());

    val st = pool.getStatus();
    println("Resolved {}: status={} winningOutcome={}", poolAddress, st.status, st.winningOutcome);
}
