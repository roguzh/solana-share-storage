import { clusterApiUrl } from '@solana/web3.js';

export type Network = 'devnet' | 'mainnet' | 'testnet';

export interface NetworkConfig {
  name: Network;
  label: string;
  rpcEndpoint: string;
  explorerUrl: string;
}

export const NETWORKS: Record<Network, NetworkConfig> = {
  devnet: {
    name: 'devnet',
    label: 'Devnet',
    rpcEndpoint: process.env.NEXT_PUBLIC_DEVNET_RPC || clusterApiUrl('devnet'),
    explorerUrl: 'https://explorer.solana.com',
  },
  mainnet: {
    name: 'mainnet',
    label: 'Mainnet Beta',
    rpcEndpoint: process.env.NEXT_PUBLIC_MAINNET_RPC || clusterApiUrl('mainnet-beta'),
    explorerUrl: 'https://explorer.solana.com',
  },
  testnet: {
    name: 'testnet',
    label: 'Testnet',
    rpcEndpoint: clusterApiUrl('testnet'),
    explorerUrl: 'https://explorer.solana.com',
  },
};

export const DEFAULT_NETWORK: Network =
  (process.env.NEXT_PUBLIC_NETWORK as Network) || 'devnet';

export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID!;

export function getExplorerUrl(
  address: string,
  type: 'address' | 'tx' = 'address',
  network: Network = DEFAULT_NETWORK
): string {
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `${NETWORKS[network].explorerUrl}/${type}/${address}${cluster}`;
}
