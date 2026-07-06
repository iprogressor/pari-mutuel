import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/PredictionPool.gen"

/// Emergency-cancels a pool whose owner missed the resolution deadline.
/// Callable by anyone once now >= resolutionDeadline; moves the pool to CANCELLED
/// so every bettor can claim a full refund.
/// Example: acton script contracts/scripts/cancel.tolk <pool-address> --net testnet
fun main(poolAddress: address) {
    val sender = scripts.wallet("deployer");
    val pool = PredictionPool.fromAddress(poolAddress);

    if (!scripts.isContractDeployed(poolAddress)) {
        println("Pool {} is not deployed yet", poolAddress);
        return;
    }

    val res = pool.sendCancel(sender.address, { value: ton("0.05"), bounce: true });
    println(res.waitForTrace());

    val st = pool.getStatus();
    println("Pool {}: status={} (2 = CANCELLED)", poolAddress, st.status);
}
