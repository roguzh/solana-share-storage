import { PublicKey } from '@solana/web3.js';
import type { ShareHolder } from '@/types/program';

/**
 * Validate holders array
 */
export function validateHolders(holders: ShareHolder[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check max holders
  if (holders.length > 16) {
    errors.push('Maximum 16 holders allowed');
  }

  // Check total basis points
  const total = holders.reduce((sum, h) => sum + h.shareBasisPoints, 0);
  if (total !== 10000) {
    errors.push(`Total basis points must equal 10,000 (currently ${total})`);
  }

  // Check for duplicates
  const pubkeys = new Set();
  holders.forEach((h, i) => {
    const key = h.pubkey.toBase58();
    if (pubkeys.has(key)) {
      errors.push(`Duplicate holder at position ${i + 1}`);
    }
    pubkeys.add(key);
  });

  // Check individual shares
  holders.forEach((h, i) => {
    if (h.shareBasisPoints <= 0) {
      errors.push(`Holder ${i + 1} must have positive basis points`);
    }
    if (h.shareBasisPoints > 10000) {
      errors.push(`Holder ${i + 1} cannot have more than 10,000 basis points`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate PublicKey string
 */
export function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate storage name
 */
export function validateStorageName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || name.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (name.length > 32) {
    return { isValid: false, error: 'Name must be 32 characters or less' };
  }

  return { isValid: true };
}

/**
 * Parse and validate basis points input
 */
export function parseBasisPoints(value: string): number | null {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > 10000) {
    return null;
  }
  return num;
}
