import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/PredictionPool.gen"

/// Claims a payout (RESOLVED) or refund (CANCELLED) for the "deployer" wallet.
/// Example: acton script contracts/scripts/claim.tolk <pool-address> --net testnet
fun main(poolAddress: address) {
    val claimer = scripts.wallet("deployer");
    val pool = PredictionPool.fromAddress(poolAddress);

    if (!scripts.isContractDeployed(poolAddress)) {
        println("Pool {} is not deployed yet", poolAddress);
        return;
    }

    println("Claimable for {}: {} nanoton", claimer.address, pool.getPayout(claimer.address));
    val res = pool.sendClaim(claimer.address, { value: ton("0.1") });
    println(res.waitForTrace());
    println("Claim sent to {}", poolAddress);
}
