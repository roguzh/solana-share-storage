import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import { ExternalLink, ArrowRight, Check } from 'lucide-react';
import { DEFAULT_NETWORK, getExplorerUrl } from '@/config/networks';
import { PROGRAM_ID } from '@/config/networks';

const useCases = [
  {
    emoji: '🎨',
    title: 'NFT Projects',
    desc: 'Split royalty payments from secondary sales among artists, developers, marketing teams, and community treasuries.',
  },
  {
    emoji: '🏛️',
    title: 'DAOs & Communities',
    desc: 'Distribute treasury funds or protocol revenue to contributors, validators, or token holders based on governance decisions.',
  },
  {
    emoji: '💼',
    title: 'Team Compensation',
    desc: 'Automate profit-sharing or bonus distributions among team members with predefined equity percentages.',
  },
  {
    emoji: '🎮',
    title: 'Gaming Guilds',
    desc: 'Split in-game earnings or tournament prizes among guild members proportionally.',
  },
];

const features = [
  { label: 'Multi-recipient', desc: 'Support for up to 16 holders per storage' },
  { label: 'Dual asset support', desc: 'Distribute both SOL and SPL tokens' },
  { label: 'Precise allocations', desc: 'Basis points system (0.01% precision)' },
  { label: 'On-chain tracking', desc: 'All stats recorded on Solana blockchain' },
  { label: 'Admin controls', desc: 'Enable/disable distributions and update holders' },
  { label: 'Open distribution', desc: 'Anyone can trigger distribution (pull-based)' },
];

const techInfo = [
  { label: 'Network', value: DEFAULT_NETWORK, capitalize: true },
  { label: 'Framework', value: 'Anchor v0.31.1' },
  { label: 'Frontend', value: 'Next.js 15 + TypeScript' },
];

export default function About() {
  const programExplorerUrl = getExplorerUrl(PROGRAM_ID, 'address', DEFAULT_NETWORK);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative bg-grid-orange">
        <div className="bloom-orb bloom-orb-orange w-[500px] h-[500px] -top-40 -right-60 animate-pulse-glow" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            About Enhanced Royalties
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Programmable fund distribution on Solana
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview */}
        <div className="card-elevated p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What is Enhanced Royalties?</h2>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              Enhanced Royalties is a Solana program that enables proportional distribution of SOL and
              SPL tokens to multiple recipients. It solves the common problem of revenue sharing in Web3
              projects, where funds need to be split among multiple stakeholders according to predefined
              percentages.
            </p>
            <p>
              Unlike manual distributions or centralized payment platforms, Enhanced Royalties operates
              entirely on-chain, providing transparency, immutability, and trustless execution. Once
              configured, distributions can be triggered by anyone, but only the admin can modify
              recipient lists and percentages.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Common Use Cases</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {useCases.map((item, i) => (
              <div key={i} className="card-solid p-6">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="card-elevated p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Key Features</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-xl">
                <div className="w-5 h-5 bg-primary-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="text-primary" size={12} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Info */}
        <div className="card-solid p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Technical Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Program ID</p>
              <p className="font-mono text-xs text-gray-600 break-all bg-gray-100 rounded-lg px-3 py-2">
                {PROGRAM_ID}
              </p>
              <a
                href={programExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-600 text-sm inline-flex items-center gap-1 mt-2 font-medium transition-colors"
              >
                View on Explorer <ExternalLink size={14} />
              </a>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {techInfo.map((item, i) => (
                <div key={i} className="bg-gray-50/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
                  <p className={`text-sm font-semibold text-gray-900 ${item.capitalize ? 'capitalize' : ''}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card-elevated p-6 sm:p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security</h2>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              <span className="font-semibold text-gray-900">Admin-only operations:</span> Only the storage creator can modify
              holder configurations or enable/disable the storage. Enforced at the program level.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Validation checks:</span> The program validates that total basis points equal
              exactly 10,000, no duplicate holders exist, and holder accounts are valid before distribution.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Rent-exempt protection:</span> For SOL distributions, the program ensures the
              storage account maintains rent-exempt balance to prevent account closure.
            </p>
            <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
              Note: This is a beta release. While the program has been tested, use at your own risk.
              Always verify transactions before signing.
            </p>
          </div>
        </div>

        {/* Resources */}
        <div className="card-solid p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Resources</h2>
          <div className="space-y-3">
            <Link
              href="/how-it-works"
              className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl hover:bg-primary-50/50 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                How It Works
              </span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl hover:bg-primary-50/50 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                Launch Dashboard
              </span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
            </Link>
            <a
              href={programExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl hover:bg-primary-50/50 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                View Program on Explorer
              </span>
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
