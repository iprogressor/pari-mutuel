import { useEffect, useState } from 'react';
import { Address } from '@ton/core';
import { TonConnectButton, THEME, useTonConnectUI } from '@tonconnect/ui-react';
import { Sun, Moon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NetworkDropdown } from './components/NetworkDropdown';
import { PoolCard } from './components/PoolCard';
import { useRouter } from './lib/router';
import { IconTonDiamond } from './components/TonDiamond';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('ton-dapp:theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ton-dapp:theme', theme);
    tonConnectUI.uiOptions = {
      uiPreferences: { theme: theme === 'light' ? THEME.LIGHT : THEME.DARK },
    };
  }, [theme, tonConnectUI]);

  return { theme, setTheme };
}

/** Landing state: paste a pool address to open its page. */
function OpenPoolForm({ onOpen }: { onOpen: (address: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const address = value.trim();
    try {
      Address.parse(address); // validate before touching the URL
      setError('');
      onOpen(address);
    } catch {
      setError('That does not look like a TON address.');
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#0098EA] flex items-center justify-center">
        <IconTonDiamond size={32} />
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight">Pari-mutuel</h1>
      <p className="text-muted-foreground text-[15px] max-w-md">
        Binary prediction pool on TON. Paste a pool address to see the pot and
        place your bet.
      </p>
      <div className="flex w-full max-w-md gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="EQ… / kQ… pool address"
          className="flex-1 h-10 rounded-lg border bg-background px-3 text-[14px] font-mono outline-none focus:ring-2 focus:ring-[#0098EA]/50"
        />
        <Button onClick={submit}>Open</Button>
      </div>
      {error && <p className="text-destructive text-[13px]">{error}</p>}
    </div>
  );
}

export default function App() {
  const { network, pool, setTestnet, setPool } = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Topbar ─── */}
      <header className="flex items-center justify-between px-7 h-[60px] border-b sticky top-0 z-50 bg-background max-sm:px-4 max-sm:h-auto max-sm:flex-wrap max-sm:gap-2.5 max-sm:py-3">
        <button
          className="flex items-center gap-2.5 text-[17px] font-bold max-sm:text-[15px]"
          onClick={() => setPool(null)}
          title="Home"
        >
          <div className="w-8 h-8 rounded-[9px] bg-[#0098EA] flex items-center justify-center max-sm:w-7 max-sm:h-7 max-sm:rounded-[7px]">
            <IconTonDiamond size={16} />
          </div>
          Pari-mutuel
        </button>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full size-10 bg-secondary max-sm:size-9"
            title="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
          </Button>
          <NetworkDropdown network={network} setTestnet={setTestnet} />
          <TonConnectButton />
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1 py-8 px-6 max-w-[1200px] mx-auto w-full">
        {pool ? (
          <PoolCard network={network} address={pool} />
        ) : (
          <OpenPoolForm onOpen={setPool} />
        )}
      </main>
    </div>
  );
}
