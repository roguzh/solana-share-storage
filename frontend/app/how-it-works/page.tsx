import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import { ArrowRight, Wallet, Database, Users, Send, BarChart3 } from 'lucide-react';

const steps = [
  {
    icon: <Wallet size={22} />,
    title: 'Connect Your Wallet',
    description:
      'Connect your Solana wallet (Phantom, Solflare, etc.) and authenticate by signing a message. This proves ownership without exposing your private keys.',
  },
  {
    icon: <Database size={22} />,
    title: 'Create a Share Storage',
    description:
      'Create a new storage account with a unique name. This on-chain account will hold your distribution configuration and track all stats.',
  },
  {
    icon: <Users size={22} />,
    title: 'Configure Holders',
    description:
      'Add up to 16 recipient wallet addresses and assign each a percentage using basis points (10,000 basis points = 100%). The total must equal exactly 10,000.',
    example: {
      title: 'Example Allocation',
      items: [
        { label: 'Artist', value: '7,000 bps (70%)' },
        { label: 'Developer', value: '2,000 bps (20%)' },
        { label: 'Marketing', value: '1,000 bps (10%)' },
      ],
    },
  },
  {
    icon: <Send size={22} />,
    title: 'Send Funds to Storage',
    description:
      'Transfer SOL or SPL tokens to your storage\'s Program Derived Address (PDA). The PDA is automatically generated and displayed in the UI. Funds remain secure until distributed.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Trigger Distribution',
    description:
      'Click "Distribute" to split funds proportionally to all holders in a single transaction. The smart contract handles all calculations and transfers automatically.',
    note: 'All distributions are recorded on-chain with timestamps and amounts for full auditability.',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative bg-grid">
        <div className="bloom-orb bloom-orb-peach w-[400px] h-[400px] -top-20 -left-40 animate-pulse-glow" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            A simple 5-step process to distribute funds transparently on Solana
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary-200 via-primary-300 to-primary-100 hidden sm:block" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="relative flex gap-5 sm:gap-8">
                {/* Step number */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-sm shadow-primary/20">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="card-solid p-6 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Step {i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>

                  {step.example && (
                    <div className="mt-4 bg-primary-50/50 border border-primary-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                        {step.example.title}
                      </p>
                      <div className="space-y-1.5">
                        {step.example.items.map((item, j) => (
                          <div key={j} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="font-mono font-medium text-gray-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.note && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Transparent:</span> {step.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="card-elevated p-6 sm:p-8 mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Technical Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                label: 'Program',
                value: 'Built with Anchor framework on Solana for security and efficiency.',
              },
              {
                label: 'Basis Points',
                value: 'Uses 1/100th of a percent for precise allocations. Avoids floating-point rounding.',
              },
              {
                label: 'PDA',
                value: 'Storage addresses are deterministically derived from your wallet and storage name.',
              },
              {
                label: 'Tracking',
                value: 'SOL stats in ShareStorage. SPL token stats tracked per-mint in separate records.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50/80 rounded-xl p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-600 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Get Started <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    </div>
  );
}
