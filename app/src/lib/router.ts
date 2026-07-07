import { useCallback, useEffect, useState } from 'react';

export type Network = 'mainnet' | 'testnet';

interface Route {
  isTestnet: boolean;
  pool: string | null;
  question: string | null;
}

function parseRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  return {
    isTestnet: params.get('testnet') === 'true',
    pool: params.get('pool'),
    question: params.get('q'),
  };
}

function buildUrl(
  testnet: boolean,
  pool: string | null,
  question: string | null,
) {
  const params = new URLSearchParams();
  if (testnet) params.set('testnet', 'true');
  if (pool) params.set('pool', pool);
  // the question lives only in the link (off-chain), so invites carry context
  if (pool && question) params.set('q', question);
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
      push(buildUrl(testnet, route.pool, route.question));
    },
    [route.pool, route.question],
  );

  const setPool = useCallback(
    (pool: string | null, question: string | null = null) => {
      push(buildUrl(route.isTestnet, pool, question));
    },
    [route.isTestnet],
  );

  return {
    network: (route.isTestnet ? 'testnet' : 'mainnet') as Network,
    pool: route.pool,
    question: route.question,
    setTestnet,
    setPool,
  };
}
