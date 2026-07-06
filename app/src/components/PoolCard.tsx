import { useQuery } from '@tanstack/react-query';
import { useTonAddress } from '@tonconnect/ui-react';

import { cn } from '@/lib/utils';
import type { Network } from '@/lib/router';
import {
  fetchPayout,
  fetchPoolState,
  formatTon,
  myBetFromState,
  OUTCOME_NO,
  OUTCOME_YES,
  STATUS_CANCELLED,
  STATUS_RESOLVED,
  type PoolState,
} from '@/lib/pool';
import { PoolActions } from './PoolActions';

const REFETCH_MS = 10_000; // poll the chain every 10s so the card stays live

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

function outcomeLabel(outcome: bigint): string {
  if (outcome === OUTCOME_YES) return 'YES';
  if (outcome === OUTCOME_NO) return 'NO';
  return '—';
}

/** Human phase of the pool, derived from status + clock. */
function phase(pool: PoolState, nowSec: number) {
  if (pool.status === STATUS_RESOLVED)
    return {
      label: `Resolved: ${outcomeLabel(pool.winningOutcome)}`,
      tone: 'text-success',
    };
  if (pool.status === STATUS_CANCELLED)
    return { label: 'Cancelled — refunds open', tone: 'text-warning' };
  if (nowSec < pool.bettingDeadline)
    return { label: 'Open for bets', tone: 'text-success' };
  if (nowSec < pool.resolutionDeadline)
    return { label: 'Betting closed — awaiting resolve', tone: 'text-warning' };
  return { label: 'Resolve missed — can be cancelled', tone: 'text-warning' };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[14px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export function PoolCard({
  network,
  address,
}: {
  network: Network;
  address: string;
}) {
  const wallet = useTonAddress();

  const poolQuery = useQuery({
    queryKey: ['pool', network, address],
    queryFn: () => fetchPoolState(network, address),
    refetchInterval: REFETCH_MS,
  });

  const pool = poolQuery.data;
  // The bet is already in the fetched storage dict — a local lookup, no RPC.
  const my = pool && wallet ? myBetFromState(pool, wallet) : null;

  const payoutQuery = useQuery({
    queryKey: ['payout', network, address, wallet],
    queryFn: () => fetchPayout(network, pool!.address, wallet),
    // the getter only matters when the user has an unclaimed bet
    enabled: Boolean(pool) && my !== null && !my.claimed,
    refetchInterval: REFETCH_MS,
  });

  if (poolQuery.isPending) {
    return (
      <div className="text-muted-foreground text-[15px] py-16 text-center">
        Loading pool…
      </div>
    );
  }

  if (poolQuery.isError || !pool) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-[15px] font-medium">Failed to load the pool</p>
        <p className="text-muted-foreground text-[13px] font-mono break-all">
          {address}
        </p>
        <p className="text-muted-foreground text-[13px]">
          Check the address and the selected network (testnet pools need the
          testnet switch). {String(poolQuery.error ?? '')}
        </p>
      </div>
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const { label: phaseLabel, tone } = phase(pool, nowSec);

  // Percentage split of the pot; guard against an empty pool (division by zero).
  const yesShare =
    pool.totalPot > 0n ? Number((pool.totalYes * 100n) / pool.totalPot) : 50;

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      {/* status */}
      <div className="text-center space-y-1">
        <p className={cn('text-[17px] font-semibold', tone)}>{phaseLabel}</p>
        <p className="text-muted-foreground text-[12px] font-mono break-all">
          {address}
        </p>
      </div>

      {/* pot split bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[14px] font-semibold">
          <span className="text-success">YES · {formatTon(pool.totalYes)}</span>
          <span className="text-destructive">
            {formatTon(pool.totalNo)} · NO
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-destructive/60 overflow-hidden">
          <div
            className="h-full bg-success/80"
            style={{ width: `${yesShare}%` }}
          />
        </div>
      </div>

      {/* pool facts */}
      <div className="rounded-xl border p-4 space-y-2.5">
        <Row label="Total pot" value={`${formatTon(pool.totalPot)} TON`} />
        <Row label="Fee" value={`${pool.feeBps / 100}%`} />
        <Row label="Min bet" value={`${formatTon(pool.minBet)} TON`} />
        <Row label="Bets until" value={formatDate(pool.bettingDeadline)} />
        <Row
          label="Resolve until"
          value={formatDate(pool.resolutionDeadline)}
        />
      </div>

      {/* my position (only when connected and present) */}
      {wallet && my && (
        <div className="rounded-xl border p-4 space-y-2.5">
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Your position
          </p>
          <Row
            label="Your bet"
            value={`${formatTon(my.amount)} TON on ${outcomeLabel(my.outcome)}`}
          />
          <Row
            label="Claimable now"
            value={
              my.claimed
                ? 'already claimed'
                : `${formatTon(payoutQuery.data ?? 0n)} TON`
            }
          />
        </div>
      )}

      {/* actions: bet / claim / cancel / owner controls */}
      <PoolActions
        network={network}
        address={address}
        pool={pool}
        my={my}
        payout={payoutQuery.data}
      />
    </div>
  );
}
