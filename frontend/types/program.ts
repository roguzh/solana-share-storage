import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

/**
 * ShareHolder type - represents a single holder with their share allocation
 */
export interface ShareHolder {
  pubkey: PublicKey;
  shareBasisPoints: number; // 0-10000 (basis points, 10000 = 100%)
}

/**
 * ShareStorage account type - main storage account
 */
export interface ShareStorage {
  admin: PublicKey;
  name: string;
  enabled: boolean;
  lastDistributedAt: anchor.BN;
  totalDistributed: anchor.BN; // Tracks SOL only
  holders: ShareHolder[];
}

/**
 * TokenDistributionRecord - tracks per-token distribution stats
 */
export interface TokenDistributionRecord {
  shareStorage: PublicKey;
  mint: PublicKey;
  totalDistributed: anchor.BN;
  lastDistributedAt: anchor.BN;
}

/**
 * Program error codes
 */
export enum ProgramErrorCode {
  TooManyHolders = 6000,
  HolderAlreadyExists = 6001,
  HolderNotFound = 6002,
  ShareStorageDisabled = 6003,
  Unauthorized = 6004,
  InvalidShareDistribution = 6005,
  InsufficientFunds = 6006,
  InvalidName = 6007,
  NoHolders = 6008,
  InvalidHolderAccounts = 6009,
  InvalidHolderAccount = 6010,
  ArithmeticOverflow = 6011,
}

/**
 * Error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<number, string> = {
  6000: 'Too many holders. Maximum is 16.',
  6001: 'Holder already exists.',
  6002: 'Holder not found.',
  6003: 'ShareStorage is disabled.',
  6004: 'Unauthorized. Only admin can perform this action.',
  6005: 'Invalid share distribution. Total basis points must equal exactly 10,000.',
  6006: 'Insufficient funds for distribution.',
  6007: 'Invalid name. Name must be between 1 and 32 characters.',
  6008: 'No holders available for distribution.',
  6009: 'Invalid number of holder accounts provided.',
  6010: 'Holder account does not match expected pubkey.',
  6011: 'Arithmetic overflow occurred.',
};

/**
 * UI-specific types
 */
export interface StorageWithPDA extends ShareStorage {
  pda: PublicKey;
}

export interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  signature?: string;
  error?: string;
}
