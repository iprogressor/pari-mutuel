import { Address, Cell, fromNano } from '@ton/core';
import {
  PoolStorage,
  PredictionPool,
  type BetInfo,
} from '@wrappers/PredictionPool.gen';

import { getTonClient } from './ton';
import type { Network } from './router';

// Mirrors the enums in contracts/src/pool_types.tolk.
export const STATUS_OPEN = 0n;
export const STATUS_RESOLVED = 1n;
export const STATUS_CANCELLED = 2n;

export const OUTCOME_YES = 1n;
export const OUTCOME_NO = 2n;

/**
 * Full pool state decoded straight from the contract's raw storage cell.
 * One RPC call gives us everything, including fields the getters don't
 * expose (ownerAddress, minBet, the bets dictionary).
 */
export interface PoolState {
  address: Address;
  ownerAddress: Address;
  status: bigint;
  winningOutcome: bigint;
  bettingDeadline: number; // unix seconds
  resolutionDeadline: number; // unix seconds
  minBet: bigint; // nanoton
  totalPot: bigint; // nanoton
  totalYes: bigint; // nanoton
  totalNo: bigint; // nanoton
  feeBps: number;
  storage: PoolStorage; // parsed raw storage (bets dict lives here)
}

export async function fetchPoolState(
  network: Network,
  addressStr: string,
): Promise<PoolState> {
  const address = Address.parse(addressStr);
  const client = getTonClient(network);
  const state = await client.getContractState(address);
  if (state.state !== 'active' || !state.data) {
    throw new Error('No contract is deployed at this address.');
  }
  const storage = PoolStorage.fromSlice(
    Cell.fromBoc(state.data)[0].beginParse(),
  );
  return {
    address,
    ownerAddress: storage.ownerAddress,
    status: storage.status,
    winningOutcome: storage.winningOutcome,
    bettingDeadline: Number(storage.bettingDeadline),
    resolutionDeadline: Number(storage.resolutionDeadline),
    minBet: storage.minBet,
    totalPot: storage.totalPot,
    totalYes: storage.totalYes,
    totalNo: storage.totalNo,
    feeBps: Number(storage.feeBps),
    storage,
  };
}

/** The bets dict is keyed by the 256-bit hash of the bettor's address. */
export function myBetFromState(
  pool: PoolState,
  wallet: string,
): BetInfo | null {
  const hash = Address.parse(wallet).hash; // 32-byte Buffer
  const key = BigInt('0x' + hash.toString('hex'));
  return pool.storage.bets.get(key) ?? null;
}

/**
 * Claimable amount, via the contract's own getter — the pro-rata math
 * stays in one place (the contract) instead of being duplicated here.
 */
export async function fetchPayout(
  network: Network,
  poolAddress: Address,
  wallet: string,
): Promise<bigint> {
  const pool = getTonClient(network).open(
    PredictionPool.fromAddress(poolAddress),
  );
  return pool.getPayout(Address.parse(wallet));
}

/** 1234500000n (nanoton) -> "1.2345" (TON, trailing zeros trimmed). */
export function formatTon(nano: bigint): string {
  const s = fromNano(nano);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
