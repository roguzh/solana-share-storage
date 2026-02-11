'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/Header';
import { useStorages } from '@/hooks/useStorages';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatAddress, formatSOL, formatDate } from '@/lib/utils/format';
import { CreateStorageModal } from '@/components/storage/CreateStorageModal';

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
            <h1 className="text-3xl font-bold text-gray-900">My Storages</h1>
            <p className="text-gray-500 mt-1">Manage your distribution storages</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Create Storage
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-solid p-6 animate-pulse">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="h-6 bg-gray-200 rounded-lg w-32 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full w-16" />
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && storages.length === 0 && (
          <div className="card-elevated text-center py-16 px-8">
            <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Plus className="text-primary" size={32} />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storages.map((storage) => (
              <Link
                key={storage.pda.toBase58()}
                href={`/dashboard/${storage.name}`}
              >
                <div className="card-elevated p-6 h-full group">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {storage.name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {formatAddress(storage.pda.toBase58())}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        storage.enabled
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {storage.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Holders</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {storage.holders.length} / 16
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Distributed</span>
                      <span className="text-sm font-semibold text-primary">
                        {formatSOL(storage.totalDistributed)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Last Distribution</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(storage.lastDistributedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Storage Modal */}
      <CreateStorageModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Storages will auto-refresh via SWR
        }}
      />
    </div>
  );
}
