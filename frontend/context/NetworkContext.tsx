'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_NETWORK, NETWORKS, type Network } from '@/config/networks';

const STORAGE_KEY = 'solana-network';

interface NetworkContextValue {
  network: Network;
  setNetwork: (n: Network) => void;
  rpcEndpoint: string;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: DEFAULT_NETWORK,
  setNetwork: () => {},
  rpcEndpoint: NETWORKS[DEFAULT_NETWORK].rpcEndpoint,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<Network>(DEFAULT_NETWORK);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Network | null;
    if (stored && stored in NETWORKS) setNetworkState(stored);
  }, []);

  const setNetwork = useCallback((n: Network) => {
    localStorage.setItem(STORAGE_KEY, n);
    setNetworkState(n);
  }, []);

  return (
    <NetworkContext.Provider
      value={{ network, setNetwork, rpcEndpoint: NETWORKS[network].rpcEndpoint }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
