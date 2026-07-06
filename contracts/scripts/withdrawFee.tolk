import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/PredictionPool.gen"

/// Owner sweeps the remainder: fee + dust + leftover seed (RESOLVED) or leftover seed (CANCELLED).
/// Allowed once every entitled claim is settled, or after the 7-day grace period
/// past resolutionDeadline. Must be sent by the owner wallet.
/// Example: acton script contracts/scripts/withdrawFee.tolk <pool-address> --net testnet
fun main(poolAddress: address) {
    val owner = scripts.wallet("deployer");
    val pool = PredictionPool.fromAddress(poolAddress);

    if (!scripts.isContractDeployed(poolAddress)) {
        println("Pool {} is not deployed yet", poolAddress);
        return;
    }

    val before = scripts.fetchAccountBalance(poolAddress);
    println("Pool balance before: {:ton}", before);

    val res = pool.sendWithdrawFee(owner.address, { value: ton("0.05"), bounce: true });
    println(res.waitForTrace());

    println("Pool balance after: {:ton}", scripts.fetchAccountBalance(poolAddress));
}
