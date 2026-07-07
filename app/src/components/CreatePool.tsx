import { useState } from 'react';
import { toNano } from '@ton/core';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';

import { Button } from '@/components/ui/button';
import type { Network } from '@/lib/router';
import { buildDeploy } from '@/lib/deploy';

const BETTING_PRESETS = [
  { label: '1 hour', minutes: 60 },
  { label: '1 day', minutes: 24 * 60 },
  { label: '7 days', minutes: 7 * 24 * 60 },
] as const;

const RESOLVE_PRESETS = [
  { label: '+1 hour', minutes: 60 },
  { label: '+1 day', minutes: 24 * 60 },
  { label: '+7 days', minutes: 7 * 24 * 60 },
] as const;

function PresetRow<T extends { label: string; minutes: number }>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <Button
          key={o.label}
          variant={o.minutes === value ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => onChange(o.minutes)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export function CreatePool({
  network,
  onCreated,
}: {
  network: Network;
  onCreated: (address: string, question: string | null) => void;
}) {
  const wallet = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const [question, setQuestion] = useState('');
  const [bettingMinutes, setBettingMinutes] = useState(24 * 60);
  const [resolveMinutes, setResolveMinutes] = useState(24 * 60);
  const [minBet, setMinBet] = useState('0.5');
  const [error, setError] = useState('');

  async function create() {
    setError('');
    let minBetNano: bigint;
    try {
      minBetNano = toNano(minBet.trim()); // validate before building
    } catch {
      setError('Min bet must be a number, e.g. 0.5');
      return;
    }
    // the contract rejects minBet == 0 with BadConfig — catch it before
    // the deploy leaves the browser, so no seed can get stranded
    if (minBetNano <= 0n) {
      setError('Min bet must be greater than 0.');
      return;
    }
    const { address, tx } = buildDeploy(network, {
      owner: wallet,
      bettingMinutes,
      resolveMinutes,
      minBetTon: minBet.trim(),
    });
    try {
      await tonConnectUI.sendTransaction(tx);
    } catch {
      return; // rejected in the wallet
    }
    // The pool address is known upfront (hash of code+data) — navigate
    // right away; the pool page polls until the deploy lands on chain.
    onCreated(address, question.trim() || null);
  }

  if (!wallet) {
    return (
      <p className="text-muted-foreground text-[14px]">
        Connect your wallet to create a pool — you will be its owner and
        referee.
      </p>
    );
  }

  return (
    <div className="w-full space-y-4 text-left">
      <div className="space-y-1.5">
        <label className="text-[13px] text-muted-foreground">
          Question (stays in the invite link, not on-chain)
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will it rain on Saturday?"
          className="w-full h-10 rounded-lg border bg-background px-3 text-[14px] outline-none focus:ring-2 focus:ring-[#0098EA]/50"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] text-muted-foreground">
          Bets are accepted for…
        </label>
        <PresetRow
          options={BETTING_PRESETS}
          value={bettingMinutes}
          onChange={setBettingMinutes}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] text-muted-foreground">
          …then you have this long to declare the outcome
        </label>
        <PresetRow
          options={RESOLVE_PRESETS}
          value={resolveMinutes}
          onChange={setResolveMinutes}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[13px] text-muted-foreground">
          Minimum bet, TON
        </label>
        <input
          value={minBet}
          onChange={(e) => setMinBet(e.target.value)}
          inputMode="decimal"
          className="w-28 h-10 rounded-lg border bg-background px-3 text-[14px] font-mono outline-none focus:ring-2 focus:ring-[#0098EA]/50"
        />
      </div>

      <Button className="w-full" onClick={() => void create()}>
        Create pool (0.2 TON seed)
      </Button>
      <p className="text-[12px] text-muted-foreground">
        The 0.2 TON covers rent and gas; whatever is left comes back to you
        after the pool settles. You become the referee: you declare the outcome,
        and if you miss your window everyone gets refunded.
      </p>
      {error && <p className="text-destructive text-[13px]">{error}</p>}
    </div>
  );
}
