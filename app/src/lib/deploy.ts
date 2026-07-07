import {
  Address,
  beginCell,
  Dictionary,
  storeStateInit,
  toNano,
} from '@ton/core';
import type { SendTransactionRequest } from '@tonconnect/ui-react';
import { PredictionPool, type BetInfo } from '@wrappers/PredictionPool.gen';

import { networkChain } from './ton';
import type { Network } from './router';

/**
 * Deploying on TON = sending a message that carries a stateInit
 * (code + initial data). The address is the hash of that pair, so we
 * know it before the contract even exists. Anyone can deploy from
 * their wallet — the connected user becomes the pool's owner/oracle.
 */

// Attached to the deploy message; must exceed the contract's MIN_SEED (0.1 TON).
// Covers rent + gas; the leftover returns to the owner via withdrawFee.
export const DEPLOY_SEED = toNano('0.2');

// v1 keeps the fee fixed, mirroring the reference deploy script.
export const DEFAULT_FEE_BPS = 500n;

export interface NewPoolParams {
  owner: string; // connected wallet — becomes ownerAddress
  bettingMinutes: number; // how long bets are accepted, from now
  resolveMinutes: number; // extra window for the owner to resolve
  minBetTon: string; // e.g. "0.5"
}

export interface PreparedDeploy {
  address: string; // future pool address (known before deploy)
  tx: SendTransactionRequest;
}

export function buildDeploy(
  network: Network,
  p: NewPoolParams,
): PreparedDeploy {
  const now = Math.floor(Date.now() / 1000);

  const pool = PredictionPool.fromStorage({
    ownerAddress: Address.parse(p.owner),
    bettingDeadline: BigInt(now + p.bettingMinutes * 60),
    resolutionDeadline: BigInt(
      now + (p.bettingMinutes + p.resolveMinutes) * 60,
    ),
    minBet: toNano(p.minBetTon),
    feeBps: DEFAULT_FEE_BPS,
    status: 0n,
    winningOutcome: 0n,
    totalPot: 0n,
    totalYes: 0n,
    totalNo: 0n,
    yesCount: 0n,
    noCount: 0n,
    claimedCount: 0n,
    bets: Dictionary.empty<bigint, BetInfo>(),
  });

  // The wallet expects stateInit as a base64 BoC of the standard StateInit cell.
  const stateInit = beginCell()
    .store(storeStateInit(pool.init!))
    .endCell()
    .toBoc()
    .toString('base64');

  const address = pool.address.toString({
    bounceable: true,
    testOnly: network === 'testnet',
  });

  return {
    address,
    tx: {
      validUntil: Math.floor(Date.now() / 1000) + 5 * 60,
      network: networkChain(network),
      messages: [
        {
          address,
          amount: DEPLOY_SEED.toString(),
          stateInit,
          // no payload: an empty body hits the contract's deploy branch,
          // which validates deadlines/feeBps/minBet and the attached seed
        },
      ],
    },
  };
}
