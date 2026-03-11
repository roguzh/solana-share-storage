import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { ArrowRight, Users, Coins, Shield, Zap, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-grid">
        {/* Bloom orbs */}
        <div className="bloom-orb bloom-orb-orange w-[600px] h-[600px] -top-40 -right-40 animate-pulse-glow" />
        <div className="bloom-orb bloom-orb-peach w-[500px] h-[500px] top-20 -left-60 animate-pulse-glow" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-sm font-medium text-primary-700 mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Built on Solana
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              Distribute Funds
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                Effortlessly
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Programmable SOL and SPL token distribution on Solana.
              Split payments proportionally among up to 16 holders with basis points precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-600 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Launch App <ArrowRight size={20} />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-800 rounded-xl font-semibold border border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200"
              >
                Learn More <ChevronRight size={18} />
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-3 max-w-lg mx-auto">
            <div className="text-center border-r border-gray-200">
              <p className="text-3xl font-bold text-gray-900">16</p>
              <p className="text-sm text-gray-500 mt-1">Max Holders</p>
            </div>
            <div className="text-center border-r border-gray-200">
              <p className="text-3xl font-bold text-gray-900">0.01%</p>
              <p className="text-sm text-gray-500 mt-1">Precision</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">2</p>
              <p className="text-sm text-gray-500 mt-1">Asset Types</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Built for Web3 Teams
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Everything you need to manage and distribute funds transparently on-chain.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Users className="text-primary" size={24} />,
              title: 'Up to 16 Holders',
              desc: 'Distribute funds among multiple recipients with precise percentage allocations.',
            },
            {
              icon: <Coins className="text-primary" size={24} />,
              title: 'SOL + SPL Tokens',
              desc: 'Support for both native SOL and custom SPL token distributions.',
            },
            {
              icon: <Shield className="text-primary" size={24} />,
              title: 'On-Chain Security',
              desc: 'Fully auditable Solana program with admin-only controls and validation.',
            },
            {
              icon: <Zap className="text-primary" size={24} />,
              title: 'Instant Splits',
              desc: 'Trigger distributions anytime. Proportional splits calculated automatically.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="card-elevated p-6 group"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-grid-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Use Cases</h2>
            <p className="text-lg text-gray-600">Perfect for Web3 revenue sharing</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '🎨', title: 'NFT Royalties', desc: 'Split royalty payments among artists, developers, and stakeholders.' },
              { emoji: '🏛️', title: 'DAO Treasury', desc: 'Distribute treasury funds to contributors based on governance decisions.' },
              { emoji: '💼', title: 'Team Compensation', desc: 'Automate profit-sharing among team members with predefined percentages.' },
            ].map((item, i) => (
              <div key={i} className="card-solid p-8 text-center">
                <div className="text-5xl mb-5">{item.emoji}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-500 rounded-3xl p-12 sm:p-16 text-center text-white glow-orange">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg sm:text-xl mb-8 opacity-90 max-w-md mx-auto">
              Connect your wallet and create your first distribution storage.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Launch App <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ER</span>
              </div>
              <span className="text-sm text-gray-600">Enhanced Royalties</span>
            </div>
            <p className="text-sm text-gray-500 font-mono">
              Program: 9B6F...2ft9
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
