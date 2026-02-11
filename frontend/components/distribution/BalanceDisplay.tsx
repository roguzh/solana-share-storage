'use client';

import { PublicKey } from '@solana/web3.js';
import { useBalance } from '@/hooks/useBalance';
import { useTokenAccounts } from '@/hooks/useTokenAccounts';
import { formatSOL, formatTokenAmount, formatAddress } from '@/lib/utils/format';
import { RefreshCw, Wallet, Coins } from 'lucide-react';

interface BalanceDisplayProps {
  storagePDA: PublicKey;
}

export function BalanceDisplay({ storagePDA }: BalanceDisplayProps) {
  const { balance, isLoading: isLoadingSOL, refresh: refreshSOL } = useBalance(storagePDA);
  const {
    tokenAccounts,
    isLoading: isLoadingTokens,
    refresh: refreshTokens,
  } = useTokenAccounts(storagePDA);

  const handleRefresh = () => {
    refreshSOL();
    refreshTokens();
  };

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Balances</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoadingSOL || isLoadingTokens}
          className="text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw
            size={18}
            className={isLoadingSOL || isLoadingTokens ? 'animate-spin' : ''}
          />
        </button>
      </div>

      <div className="space-y-4">
        {/* SOL Balance */}
        <div className="bg-gray-50/80 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Wallet className="text-primary" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                SOL Balance
              </p>
              <p className="text-lg font-bold text-gray-900">
                {isLoadingSOL ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  formatSOL(balance)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Token Balances */}
        {(isLoadingTokens || tokenAccounts.length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="text-gray-400" size={16} />
              <h3 className="text-sm font-semibold text-gray-700">SPL Tokens</h3>
            </div>

            {isLoadingTokens ? (
              <div className="bg-gray-50/80 rounded-xl p-4 text-center text-sm text-gray-400">
                Loading tokens...
              </div>
            ) : tokenAccounts.length === 0 ? (
              <div className="bg-gray-50/80 rounded-xl p-4 text-center text-sm text-gray-500">
                No tokens found
              </div>
            ) : (
              <div className="space-y-2">
                {tokenAccounts.map((token, index) => (
                  <div
                    key={index}
                    className="bg-gray-50/80 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-xs text-gray-600">
                        {formatAddress(token.mint.toBase58(), 6)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Decimals: {token.decimals}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatTokenAmount(token.balance, token.decimals)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PDA Address */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Storage PDA
          </p>
          <p className="font-mono text-xs text-gray-600 break-all bg-gray-100 rounded-lg px-3 py-2">
            {storagePDA.toBase58()}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Send SOL or SPL tokens to this address to distribute them
          </p>
        </div>
      </div>
    </div>
  );
}
