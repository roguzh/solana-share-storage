import { Connection } from '@solana/web3.js';
import { DEFAULT_NETWORK, NETWORKS } from '@/config/networks';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(NETWORKS[DEFAULT_NETWORK].rpcEndpoint, 'confirmed');
  }
  return connection;
}
