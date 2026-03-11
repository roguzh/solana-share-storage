'use client';

import { ReactNode, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useBalance } from '@/hooks/useBalance';
import { formatSOL } from '@/lib/utils/format';
import { RefreshCw, Wallet, Copy, Check, ArrowDownToLine } from 'lucide-react';

interface BalanceDisplayProps {
  storagePDA: PublicKey;
  children?: ReactNode;
}

export function BalanceDisplay({ storagePDA, children }: BalanceDisplayProps) {
  const { balance, distributableBalance, isLoading, refresh } = useBalance(storagePDA);
  const [copied, setCopied] = useState(false);

  const pdaStr = storagePDA.toBase58();
  const hasDistributable = distributableBalance > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(pdaStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-elevated p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="text-primary" size={18} />
          SOL Balance
        </h2>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Distributable amount — highlighted when ready */}
      <div
        className={`rounded-xl p-4 border transition-all duration-300 ${
          hasDistributable
            ? 'bg-linear-to-br from-primary-50 to-orange-50/40 border-primary/30 shadow-sm shadow-primary/10'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500">
            Available to Distribute
          </p>
          {hasDistributable && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Ready
            </span>
          )}
        </div>
        <p className={`text-3xl font-bold tabular-nums ${hasDistributable ? 'text-primary' : 'text-gray-400'}`}>
          {isLoading
            ? <span className="text-gray-300 text-2xl">—</span>
            : formatSOL(distributableBalance)}
        </p>
        {!isLoading && balance > 0 && (
          <p className="text-xs text-gray-400 mt-1.5">
            Total on-chain: {formatSOL(balance)}
          </p>
        )}
      </div>

      {/* Deposit address */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <ArrowDownToLine className="text-gray-400" size={13} />
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Deposit Address</p>
        </div>
        <button
          onClick={handleCopy}
          className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 group transition-colors"
        >
          <p className="font-mono text-[11px] text-gray-600 truncate">{pdaStr}</p>
          {copied
            ? <Check size={13} className="text-green-500 shrink-0" />
            : <Copy size={13} className="text-gray-400 group-hover:text-primary shrink-0 transition-colors" />}
        </button>
        <p className="text-xs text-gray-400 mt-1.5">Send SOL to this address to fund distribution</p>
      </div>

      {/* Action slot */}
      {children && (
        <div className="border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
