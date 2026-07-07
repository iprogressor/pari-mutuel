import { useState } from 'react';
import { Address, toNano } from '@ton/core';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import type { BetInfo } from '@wrappers/PredictionPool.gen';
import type { SendTransactionRequest } from '@tonconnect/ui-react';

import { Button } from '@/components/ui/button';
import type { Network } from '@/lib/router';
import { queryClient } from '@/lib/ton';
import {
  formatTon,
  OUTCOME_NO,
  OUTCOME_YES,
  STATUS_CANCELLED,
  STATUS_OPEN,
  STATUS_RESOLVED,
  type PoolState,
} from '@/lib/pool';
import { betTx, cancelTx, claimTx, resolveTx, withdrawFeeTx } from '@/lib/tx';

export function PoolActions({
  network,
  address,
  pool,
  my,
  payout,
}: {
  network: Network;
  address: string;
  pool: PoolState;
  my: BetInfo | null;
  payout: bigint | undefined;
}) {
  const wallet = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [stake, setStake] = useState(() => formatTon(pool.minBet));
  const [note, setNote] = useState('');

  const nowSec = Math.floor(Date.now() / 1000);
  const bettingOpen =
    pool.status === STATUS_OPEN && nowSec < pool.bettingDeadline;
  const resolveWindow =
    pool.status === STATUS_OPEN &&
    nowSec >= pool.bettingDeadline &&
    nowSec < pool.resolutionDeadline;
  const overdue =
    pool.status === STATUS_OPEN && nowSec >= pool.resolutionDeadline;
  const terminal =
    pool.status === STATUS_RESOLVED || pool.status === STATUS_CANCELLED;

  const isOwner = Boolean(
    wallet && Address.parse(wallet).equals(pool.ownerAddress),
  );
  const canClaim =
    terminal && my !== null && !my.claimed && (payout ?? 0n) > 0n;
  // A repeat bet must stay on the same side — mirror the contract's rule in the UI.
  const lockedOutcome = my ? my.outcome : null;

  async function send(tx: SendTransactionRequest, sentNote: string) {
    try {
      setNote('');
      await tonConnectUI.sendTransaction(tx);
      setNote(sentNote);
      // The tx lands on chain in ~5-15s; refresh our queries shortly after.
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['pool'] });
        void queryClient.invalidateQueries({ queryKey: ['payout'] });
      }, 12_000);
    } catch {
      // user closed / rejected in the wallet — nothing to do
    }
  }

  function placeBet(outcome: bigint) {
    let nano: bigint;
    try {
      nano = toNano(stake.trim());
    } catch {
      setNote('Enter the stake as a number, e.g. 0.5');
      return;
    }
    if (nano < pool.minBet) {
      setNote(`Minimum bet is ${formatTon(pool.minBet)} TON.`);
      return;
    }
    void send(
      betTx(network, address, outcome, nano),
      'Bet sent — the card refreshes automatically.',
    );
  }

  if (!wallet) {
    return (
      <p className="text-center text-muted-foreground text-[14px]">
        Connect your wallet to participate.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* betting */}
      {bettingOpen && (
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Place a bet
          </p>
          <div className="flex gap-2">
            <input
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              inputMode="decimal"
              className="w-28 h-10 rounded-lg border bg-background px-3 text-[14px] font-mono outline-none focus:ring-2 focus:ring-[#0098EA]/50"
            />
            <span className="self-center text-[13px] text-muted-foreground">
              TON
            </span>
            <Button
              className="flex-1 bg-success/90 hover:bg-success text-white"
              disabled={lockedOutcome !== null && lockedOutcome !== OUTCOME_YES}
              onClick={() => placeBet(OUTCOME_YES)}
            >
              Bet YES
            </Button>
            <Button
              className="flex-1 bg-destructive/90 hover:bg-destructive text-white"
              disabled={lockedOutcome !== null && lockedOutcome !== OUTCOME_NO}
              onClick={() => placeBet(OUTCOME_NO)}
            >
              Bet NO
            </Button>
          </div>
          {lockedOutcome !== null && (
            <p className="text-[13px] text-muted-foreground">
              You already bet on {lockedOutcome === OUTCOME_YES ? 'YES' : 'NO'}{' '}
              — you can only add to the same side.
            </p>
          )}
        </div>
      )}

      {/* claim */}
      {canClaim && (
        <Button
          className="w-full"
          onClick={() =>
            void send(
              claimTx(network, address),
              'Claim sent — funds arrive in a few seconds.',
            )
          }
        >
          Claim {formatTon(payout ?? 0n)} TON
        </Button>
      )}

      {/* emergency cancel — anyone, when the owner missed the resolve window */}
      {overdue && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            void send(
              cancelTx(network, address),
              'Cancel sent — refunds open shortly.',
            )
          }
        >
          Cancel pool (resolve deadline missed)
        </Button>
      )}

      {/* owner controls */}
      {isOwner && (resolveWindow || terminal) && (
        <div className="rounded-xl border border-[#0098EA]/40 p-4 space-y-3">
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
            Owner controls
          </p>
          {resolveWindow && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() =>
                  void send(
                    resolveTx(network, address, OUTCOME_YES),
                    'Resolve YES sent.',
                  )
                }
              >
                Resolve YES
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  void send(
                    resolveTx(network, address, OUTCOME_NO),
                    'Resolve NO sent.',
                  )
                }
              >
                Resolve NO
              </Button>
            </div>
          )}
          {terminal && (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  void send(withdrawFeeTx(network, address), 'Withdraw sent.')
                }
              >
                Withdraw fee & leftover seed
              </Button>
              <p className="text-[12px] text-muted-foreground">
                Allowed once everyone entitled has claimed, or after the grace
                period; the contract rejects it otherwise.
              </p>
            </>
          )}
        </div>
      )}

      {note && <p className="text-center text-[13px] text-[#0098EA]">{note}</p>}
    </div>
  );
}
