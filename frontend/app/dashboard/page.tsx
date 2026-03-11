'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { useStorages } from '@/hooks/useStorages';
import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  ArrowRight,
  Wallet,
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { formatAddress, formatSOL, formatDate } from '@/lib/utils/format';
import { CreateStorageModal } from '@/components/storage/CreateStorageModal';

function StorageCardBalance({ pda }: { pda: PublicKey }) {
  const { distributableBalance, isLoading } = useBalance(pda);
  const hasDistributable = distributableBalance > 0;

  if (isLoading) {
    return <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold tabular-nums ${
      hasDistributable
        ? 'bg-primary-50 text-primary'
        : 'bg-gray-100 text-gray-400'
    }`}>
      {hasDistributable && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
        </span>
      )}
      {formatSOL(distributableBalance)}
    </div>
  );
}

export default function Dashboard() {
  const { connected } = useWallet();
  const { isAuthenticated, isChecking } = useAuth();
  const { storages, isLoading } = useStorages();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!connected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="card-elevated max-w-md text-center p-10">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wallet className="text-primary" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Authentication Required</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Connect your wallet and sign the authentication message to access the dashboard.
            </p>
            <Link href="/">
              <Button size="lg">
                Go Home <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <Layers className="text-primary" size={22} />
              My Storages
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isLoading
                ? 'Loading...'
                : `${storages.length} storage${storages.length !== 1 ? 's' : ''} configured`}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Storage
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-solid p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-1.5" />
                    <div className="h-3 bg-gray-100 rounded w-20" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && storages.length === 0 && (
          <div className="card-elevated text-center py-16 px-8">
            <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Layers className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Storages Yet</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Create your first share storage to start distributing funds to your team.
            </p>
            <Button onClick={() => setShowCreateModal(true)} size="lg">
              <Plus size={18} />
              Create Your First Storage
            </Button>
          </div>
        )}

        {/* Storage Grid */}
        {!isLoading && storages.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {storages.map((storage) => {
              const holdersRatio = Math.min(100, (storage.holders.length / 16) * 100);
              return (
                <Link key={storage.pda.toBase58()} href={`/dashboard/${storage.name}`}>
                  <div className="card-elevated p-5 h-full group cursor-pointer hover:border-primary/25 border border-transparent transition-all duration-200">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                          <Layers className="text-primary" size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate leading-tight">
                            {storage.name}
                          </h3>
                          <p className="font-mono text-[11px] text-gray-400 mt-0.5 truncate">
                            {formatAddress(storage.pda.toBase58())}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          storage.enabled
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {storage.enabled ? 'Active' : 'Off'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      {/* Holders with progress bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Users size={12} />
                            <span className="text-xs">Holders</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-900">
                            {storage.holders.length}
                            <span className="text-gray-400 font-normal"> / 16</span>
                          </span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-1 bg-primary rounded-full transition-all"
                            style={{ width: `${holdersRatio}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <TrendingUp size={12} />
                          <span className="text-xs">Total Distributed</span>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          {formatSOL(storage.totalDistributed)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock size={12} />
                          <span className="text-xs">Last Distribution</span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(storage.lastDistributedAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Wallet size={12} />
                          <span className="text-xs">Available</span>
                        </div>
                        <StorageCardBalance pda={storage.pda} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Activity size={11} />
                        <span>{storage.holders.length > 0 ? 'Ready to distribute' : 'No holders yet'}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Open <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <CreateStorageModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
