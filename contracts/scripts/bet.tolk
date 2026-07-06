import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/PredictionPool.gen"

/// Places a bet on a pool. Outcome: 1 = YES, 2 = NO. Amount is in whole TON.
/// Example: acton script contracts/scripts/bet.tolk <pool-address> 1 2 --net testnet
fun main(poolAddress: address, outcome: int, amountTon: int) {
    val bettor = scripts.wallet("deployer");
    val pool = PredictionPool.fromAddress(poolAddress);

    if (!scripts.isContractDeployed(poolAddress)) {
        println("Pool {} is not deployed yet", poolAddress);
        return;
    }

    val value = (amountTon * 1000000000) as coins;
    // bounce: true — if the contract rejects the bet, the coins return to the sender
    val res = pool.sendBet(bettor.address, outcome as uint8, { value, bounce: true });
    println(res.waitForTrace());
    println("Bet outcome={} amount={} TON placed on {}", outcome, amountTon, poolAddress);
}
