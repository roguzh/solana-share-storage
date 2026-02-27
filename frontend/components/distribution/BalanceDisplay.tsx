'use client';

import { ReactNode, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useBalance } from '@/hooks/useBalance';
import { formatSOL } from '@/lib/utils/format';
import { RefreshCw, Wallet, Copy, Check, ArrowDownToLine } from 'lucide-react';

interface BalanceDisplayProps {
  storagePDA: PublicKey;
  /** Optional action rendered below the deposit address (e.g. DistributeSOLButton) */
  children?: ReactNode;
}

export function BalanceDisplay({ storagePDA, children }: BalanceDisplayProps) {
  const { balance, isLoading, refresh } = useBalance(storagePDA);
  const [copied, setCopied] = useState(false);

  const pdaStr = storagePDA.toBase58();

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

      {/* Balance */}
      <div className="bg-linear-to-br from-primary-50 to-orange-50/30 border border-primary-100/60 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Available</p>
        <p className="text-3xl font-bold text-gray-900 tabular-nums">
          {isLoading ? <span className="text-gray-300 text-2xl">—</span> : formatSOL(balance)}
        </p>
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
