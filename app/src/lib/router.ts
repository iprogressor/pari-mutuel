import { useCallback, useEffect, useState } from 'react';

export type Network = 'mainnet' | 'testnet';

interface Route {
  isTestnet: boolean;
  pool: string | null;
}

function parseRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  return {
    isTestnet: params.get('testnet') === 'true',
    pool: params.get('pool'),
  };
}

function buildUrl(testnet: boolean, pool: string | null) {
  const params = new URLSearchParams();
  if (testnet) params.set('testnet', 'true');
  if (pool) params.set('pool', pool);
  const search = params.toString();
  // Relative to the current path so it works both at "/" (dev) and
  // under "/pari-mutuel/" (GitHub Pages).
  const base = window.location.pathname;
  return search ? `${base}?${search}` : base;
}

function push(url: string) {
  if (window.location.pathname + window.location.search !== url) {
    history.pushState(null, '', url);
    window.dispatchEvent(new Event('routechange'));
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('popstate', update);
    window.addEventListener('routechange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('routechange', update);
    };
  }, []);

  const setTestnet = useCallback(
    (testnet: boolean) => {
      push(buildUrl(testnet, route.pool));
    },
    [route.pool],
  );

  const setPool = useCallback(
    (pool: string | null) => {
      push(buildUrl(route.isTestnet, pool));
    },
    [route.isTestnet],
  );

  return {
    network: (route.isTestnet ? 'testnet' : 'mainnet') as Network,
    pool: route.pool,
    setTestnet,
    setPool,
  };
}
