import { Address, toNano, type Cell } from '@ton/core';
import type { SendTransactionRequest } from '@tonconnect/ui-react';
import { PredictionPool } from '@wrappers/PredictionPool.gen';

import { networkChain } from './ton';
import type { Network } from './router';

/**
 * Builders for TON Connect transaction requests — the wallet shows the
 * request to the user and signs it; nothing is sent without their approval.
 * Bodies come from the generated wrapper, so opcodes always match the contract.
 */

// Gas attached to non-bet ops (the contract refunds leftovers via its fee buffer).
export const CLAIM_GAS = toNano('0.1');
export const OP_GAS = toNano('0.05');

function request(
  network: Network,
  poolAddress: string,
  amountNano: bigint,
  body: Cell,
): SendTransactionRequest {
  return {
    // the wallet refuses to send after this moment (protects a stale tab)
    validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
    // hard guard: reject if the wallet is on the other network
    network: networkChain(network),
    messages: [
      {
        // normalize to the bounceable form: if the contract rejects the op,
        // the attached coins bounce back to the sender instead of getting stuck
        address: Address.parse(poolAddress).toString({
          bounceable: true,
          testOnly: network === 'testnet',
        }),
        amount: amountNano.toString(),
        payload: body.toBoc().toString('base64'),
      },
    ],
  };
}

/** The stake is the full attached value (gas is funded by the pool fee). */
export function betTx(
  network: Network,
  poolAddress: string,
  outcome: bigint,
  stakeNano: bigint,
): SendTransactionRequest {
  return request(
    network,
    poolAddress,
    stakeNano,
    PredictionPool.createCellOfBet({ outcome }),
  );
}

export function claimTx(
  network: Network,
  poolAddress: string,
): SendTransactionRequest {
  return request(
    network,
    poolAddress,
    CLAIM_GAS,
    PredictionPool.createCellOfClaim({}),
  );
}

export function resolveTx(
  network: Network,
  poolAddress: string,
  outcome: bigint,
): SendTransactionRequest {
  return request(
    network,
    poolAddress,
    OP_GAS,
    PredictionPool.createCellOfResolve({ outcome }),
  );
}

export function cancelTx(
  network: Network,
  poolAddress: string,
): SendTransactionRequest {
  return request(
    network,
    poolAddress,
    OP_GAS,
    PredictionPool.createCellOfCancel({}),
  );
}

export function withdrawFeeTx(
  network: Network,
  poolAddress: string,
): SendTransactionRequest {
  return request(
    network,
    poolAddress,
    OP_GAS,
    PredictionPool.createCellOfWithdrawFee({}),
  );
}
