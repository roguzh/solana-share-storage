'use client';

import { use, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/Header';
import { useStorageDetail } from '@/hooks/useStorageDetail';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, Clock, Copy, Check, Shield, Edit } from 'lucide-react';
import { formatAddress, formatSOL, formatDate, formatBasisPoints } from '@/lib/utils/format';
import type { ShareHolder } from '@/types/program';
import { EditHoldersModal } from '@/components/storage/EditHoldersModal';
import { DistributeSOLButton } from '@/components/distribution/DistributeSOLButton';
import { DistributeTokenButton } from '@/components/distribution/DistributeTokenButton';
import { BalanceDisplay } from '@/components/distribution/BalanceDisplay';
import { EnableToggle } from '@/components/storage/EnableToggle';

export default function StorageDetailPage({
  params,
}: {
  params: Promise<{ storageName: string }>;
}) {
  const { storageName } = use(params);
  const { publicKey } = useWallet();
  const { storage, isLoading, refresh } = useStorageDetail(
    storageName ? decodeURIComponent(storageName) : null,
    publicKey
  );
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showEditHoldersModal, setShowEditHoldersModal] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const isAdmin = publicKey && storage && storage.admin.equals(publicKey);

  const handleOpenEditHoldersModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditHoldersModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading storage...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card-elevated text-center py-16 px-8">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="text-red-400" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Storage Not Found</h2>
            <p className="text-gray-500 mb-8">
              The storage &ldquo;{decodeURIComponent(storageName)}&rdquo; could not be found.
            </p>
            <Link href="/dashboard">
              <Button variant="secondary">
                <ArrowLeft size={18} />
                Back to Dashboard
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
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Storage Header Card */}
        <div className="card-elevated p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{storage.name}</h1>
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
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="font-mono">{formatAddress(storage.admin.toBase58(), 8)}</span>
                <button
                  onClick={() => copyToClipboard(storage.admin.toBase58())}
                  className="hover:text-primary transition-colors"
                >
                  {copiedAddress === storage.admin.toBase58() ? (
                    <Check size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
            {isAdmin && (
              <EnableToggle
                storageName={storage.name}
                enabled={storage.enabled}
                isAdmin={!!isAdmin}
                onSuccess={refresh}
              />
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card-solid p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Users className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Holders
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {storage.holders.length}{' '}
                      <span className="text-sm text-gray-400 font-normal">/ 16</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-solid p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Total Distributed
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {formatSOL(storage.totalDistributed)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-solid p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Clock className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Last Distribution
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(storage.lastDistributedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Holders Section */}
            <div className="card-elevated p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Holders</h2>
                {storage.holders.length > 0 && (
                  <span className="text-xs text-gray-400 font-mono">
                    {storage.holders
                      .reduce((sum: number, h: ShareHolder) => sum + h.shareBasisPoints, 0)
                      .toLocaleString()}{' '}
                    / 10,000 bps
                  </span>
                )}
              </div>

              {storage.holders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 font-medium">No holders configured yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add holders to start distributing funds.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {storage.holders.map((holder: ShareHolder, index: number) => {
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-primary-50/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm font-medium text-gray-900">
                                {formatAddress(holder.pubkey.toBase58(), 8)}
                              </p>
                              <button
                                onClick={() => copyToClipboard(holder.pubkey.toBase58())}
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                              >
                                {copiedAddress === holder.pubkey.toBase58() ? (
                                  <Check size={12} className="text-green-500" />
                                ) : (
                                  <Copy size={12} className="text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">
                            {formatBasisPoints(holder.shareBasisPoints)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {holder.shareBasisPoints.toLocaleString()} bps
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isAdmin && (
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    onClick={handleOpenEditHoldersModal}
                    fullWidth
                  >
                    <Edit size={18} />
                    Edit Holders
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Balance & Actions */}
          <div className="space-y-6">
            {/* Balance Display */}
            <BalanceDisplay storagePDA={storage.pda} />

            {/* Distribution Actions */}
            <div className="card-elevated p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <DistributeSOLButton
                  storageName={storage.name}
                  storagePDA={storage.pda}
                  holders={storage.holders}
                  enabled={storage.enabled}
                  onSuccess={refresh}
                />
                <DistributeTokenButton
                  storageName={storage.name}
                  storagePDA={storage.pda}
                  holders={storage.holders}
                  enabled={storage.enabled}
                  onSuccess={refresh}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Holders Modal */}
      {isAdmin && (
        <EditHoldersModal
          isOpen={showEditHoldersModal}
          onClose={() => setShowEditHoldersModal(false)}
          storageName={storage.name}
          currentHolders={storage.holders}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
