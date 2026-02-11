import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

/**
 * Format lamports to SOL with decimals
 */
export function formatSOL(lamports: number | bigint | anchor.BN): string {
  const amount = typeof lamports === 'number'
    ? lamports
    : typeof lamports === 'bigint'
    ? Number(lamports)
    : lamports.toNumber();

  const sol = amount / LAMPORTS_PER_SOL;
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

/**
 * Format basis points to percentage
 */
export function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(2)}%`;
}

/**
 * Truncate wallet address for display
 */
export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format Unix timestamp to readable date
 */
export function formatDate(timestamp: number | anchor.BN): string {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.toNumber();

  if (ts === 0) return 'Never';

  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(
  amount: number | bigint | anchor.BN,
  decimals: number = 9
): string {
  const amt = typeof amount === 'number'
    ? amount
    : typeof amount === 'bigint'
    ? Number(amount)
    : amount.toNumber();

  const value = amt / Math.pow(10, decimals);
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toString();
}
