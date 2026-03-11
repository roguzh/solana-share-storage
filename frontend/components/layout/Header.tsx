'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { NETWORKS, type Network } from '@/config/networks';
import { useNetwork } from '@/context/NetworkContext';

const NETWORK_STYLES: Record<Network, string> = {
  mainnet: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  devnet:  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
};

const NETWORK_DOT: Record<Network, string> = {
  mainnet: 'bg-green-500',
  devnet:  'bg-amber-500',
};

export function Header() {
  const pathname = usePathname();
  const { network, setNetwork } = useNetwork();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="glass sticky top-0 z-40 border-b border-gray-100/50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-200">
              <span className="text-white font-bold text-lg">ER</span>
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">
              Enhanced Royalties
            </span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${pathname === link.href || pathname?.startsWith(link.href + '/')
                    ? 'text-primary bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Network Switcher & Wallet */}
          <div className="flex items-center gap-3">
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className={`
                  flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full
                  uppercase tracking-wide border transition-colors cursor-pointer
                  ${NETWORK_STYLES[network]}
                `}
              >
                {network}
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {open && (
                <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  {(Object.keys(NETWORKS) as Network[]).map((n) => (
                    <button
                      key={n}
                      onClick={() => { setNetwork(n); setOpen(false); }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold
                        uppercase tracking-wide transition-colors
                        ${n === network
                          ? 'bg-gray-50 text-gray-900'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }
                      `}
                    >
                      {NETWORKS[n].label}
                      {n === network && (
                        <span className={`w-1.5 h-1.5 rounded-full ${NETWORK_DOT[n]}`} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
