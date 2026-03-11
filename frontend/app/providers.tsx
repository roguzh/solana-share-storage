"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import { SWRConfig } from "swr";
import { swrConfig } from "@/config/swr";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";

import "@solana/wallet-adapter-react-ui/styles.css";

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { rpcEndpoint } = useNetwork();

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SWRConfig value={swrConfig}>{children}</SWRConfig>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NetworkProvider>
      <InnerProviders>{children}</InnerProviders>
    </NetworkProvider>
  );
}
