import { ERROR_MESSAGES } from '@/types/program';

/**
 * Parse program errors from Anchor
 */
export function parseProgramError(error: any): string {
  // Check for Anchor error code
  if (error.code) {
    return ERROR_MESSAGES[error.code] || error.message || 'Unknown error occurred';
  }

  // Check error message for error codes
  const errorStr = error.toString();

  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorStr.includes(code) || errorStr.includes(message)) {
      return message;
    }
  }

  // Parse RPC errors
  if (errorStr.includes('insufficient funds')) {
    return 'Insufficient SOL for transaction fees.';
  }

  if (errorStr.includes('User rejected')) {
    return 'Transaction was rejected.';
  }

  if (errorStr.includes('Blockhash not found')) {
    return 'Transaction expired. Please try again.';
  }

  // Return original message if no match
  return error.message || errorStr || 'An unknown error occurred.';
}

/**
 * Check if error is a user rejection
 */
export function isUserRejection(error: any): boolean {
  const errorStr = error.toString().toLowerCase();
  return (
    errorStr.includes('user rejected') ||
    errorStr.includes('user denied') ||
    errorStr.includes('rejected')
  );
}

/**
 * Get user-friendly error title
 */
export function getErrorTitle(error: any): string {
  if (isUserRejection(error)) {
    return 'Transaction Cancelled';
  }

  if (error.code && ERROR_MESSAGES[error.code]) {
    return 'Program Error';
  }

  return 'Error';
}
