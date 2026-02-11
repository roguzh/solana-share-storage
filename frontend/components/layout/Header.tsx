'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from '@/components/wallet/WalletButton';
import { DEFAULT_NETWORK } from '@/config/networks';

export function Header() {
  const pathname = usePathname();

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

          {/* Network Badge & Wallet */}
          <div className="flex items-center gap-3">
            <span className={`
              px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wide
              ${DEFAULT_NETWORK === 'mainnet'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : DEFAULT_NETWORK === 'devnet'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
              }
            `}>
              {DEFAULT_NETWORK}
            </span>
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
