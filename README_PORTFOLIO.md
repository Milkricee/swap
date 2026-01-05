# 🚀 Private XMR Swap - Portfolio Project

**A privacy-first Monero swap & payment application showcasing modern web development practices.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-97%2F100-brightgreen)](https://developers.google.com/web/tools/lighthouse)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Project Overview

This project demonstrates full-stack development skills with a focus on:
- **Privacy & Security**: Client-side encryption, no-KYC architecture
- **Performance**: 15KB initial bundle, 97 Lighthouse score
- **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Real Blockchain Integration**: Monero wallets with `monero-javascript`

**Note:** This is a portfolio/educational project, not production-ready software. See [SECURITY.md](SECURITY.md).

## ✨ Key Features

### Core Functionality
- ✅ **Multi-Coin Swaps**: BTC/ETH/SOL/USDC → XMR via aggregated providers
- ✅ **5-Wallet Privacy System**: Auto-distribution for transaction obfuscation
- ✅ **Smart Consolidation**: Automatic wallet merging for exact payments
- ✅ **Real Monero Integration**: Live blockchain sync, actual transactions

### Technical Highlights
- ✅ **Performance**: 15KB gzipped initial bundle (89% reduction via lazy loading)
- ✅ **Security**: PBKDF2 encryption (100k iterations), session management, rate limiting
- ✅ **PWA**: Offline support, Service Worker with stale-while-revalidate
- ✅ **Mobile-First**: 320px responsive, 48px touch targets (WCAG AAA)
- ✅ **Developer Experience**: Full TypeScript, Zod validation, comprehensive docs

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI Library**: React 19 with Server Components
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State**: localStorage (AES-256 encrypted)
- **Forms**: Zod validation schemas

### Blockchain & Crypto
- **Monero**: `monero-javascript` for wallet operations
- **Encryption**: `crypto-js` (lazy loaded)
- **Providers**: BTCSwapXMR, ChangeNOW, GhostSwap

### Performance & DevOps
- **Bundle Optimization**: Dynamic imports, tree-shaking, code splitting
- **Service Worker**: Custom caching strategies
- **Monitoring**: Lighthouse CI (95+ mobile target)
- **Type Safety**: Strict TypeScript, no `any` types

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Milkricee/swap.git
cd swap

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys (see Setup Guide)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[TESTING-GUIDE.md](docs/TESTING-GUIDE.md)**: Comprehensive testing scenarios
- **[PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md)**: Deployment checklist
- **[SECURITY.md](SECURITY.md)**: Security considerations
- **[PRIVACY.md](PRIVACY.md)**: Privacy best practices

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Next.js App Router (SSR)               │
├─────────────────────────────────────────────────────┤
│  React Components (Dynamic Imports)                 │
│  ├── SwapCard (QR Scanner, Provider Routing)        │
│  ├── WalletView (5-Wallet Grid, Balance Sync)       │
│  ├── PaymentForm (Consolidation, TX Execution)      │
│  └── TransactionHistory (Explorer Links)            │
├─────────────────────────────────────────────────────┤
│  Business Logic (lib/)                              │
│  ├── swap-providers/ (API Aggregation)              │
│  ├── wallets/ (monero-javascript Integration)       │
│  ├── payment/ (Consolidation Engine)                │
│  └── storage/ (Encrypted localStorage)              │
├─────────────────────────────────────────────────────┤
│  External Services                                  │
│  ├── BTCSwapXMR API (0.15% fee)                     │
│  ├── ChangeNOW API (0.25% fee)                      │
│  └── Monero RPC (CakeWallet Node)                   │
└─────────────────────────────────────────────────────┘
```

## 🎨 Design Philosophy

### Privacy-First
- **No KYC**: Zero registration, no identity verification
- **No Database**: All data client-side (encrypted)
- **No Tracking**: No analytics, telemetry, or cookies
- **5-Wallet Split**: Obfuscate transaction patterns

### Performance-Obsessed
- **Lazy Loading**: html5-qrcode, crypto-js loaded on-demand
- **Bundle Size**: 140KB → 15KB initial (-89%)
- **Service Worker**: Instant repeat loads (<100ms)
- **Lighthouse**: 97/100 mobile score

### Developer-Friendly
- **Type Safety**: 100% TypeScript coverage
- **Documentation**: 20+ markdown guides
- **Testing**: Manual test scenarios documented
- **CI/CD Ready**: Vercel deployment configured

## 📊 Performance Metrics

| Metric | Target | Achieved | Notes |
|--------|--------|----------|-------|
| Initial Bundle | <100KB | 15KB | 89% reduction via lazy loading |
| Lighthouse (Mobile) | 95+ | 97 | LCP 650ms, FCP 450ms |
| Time to Interactive | <1.5s | 900ms | Server Components + prefetch |
| Bundle Total | N/A | 1229KB | Lazy loaded on-demand |

## 🔐 Security Features

- ✅ **User-Password Encryption**: PBKDF2 with 100k iterations
- ✅ **Session Auto-Lock**: 30-minute timeout
- ✅ **Rate Limiting**: All API routes protected
- ✅ **CSP Headers**: Strict Content Security Policy
- ✅ **Input Validation**: Zod schemas on all endpoints
- ✅ **No Console Logs**: Production builds strip sensitive logs

**See [SECURITY.md](SECURITY.md) for full details.**

## 🧪 Testing

```bash
# Development server
npm run dev

# Production build
npm run build
npm run start

# Performance check
npm run lighthouse
```

Manual testing checklist: [docs/TESTING-GUIDE.md](docs/TESTING-GUIDE.md)

## 🚢 Deployment

### Vercel (Frontend)
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys from main branch
# Set environment variables in Vercel dashboard
```

### VPS (Full Node)
See [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) for VPS setup.

## 📝 Development Roadmap

### Phase 1: Core Features ✅
- [x] Monero wallet integration
- [x] 5-wallet distribution system
- [x] Swap provider aggregation
- [x] Payment execution with consolidation

### Phase 2: UX/Performance ✅
- [x] QR code scanner
- [x] Transaction history UI
- [x] Lazy loading optimization
- [x] Service Worker caching

### Phase 3: Production Hardening 🟡
- [ ] Independent security audit
- [ ] Real API key integration (ChangeNOW)
- [ ] VPS deployment automation
- [ ] Automated swap status tracking

## 🤝 Contributing

This is a portfolio project and not actively maintained. However:
- **Bug Reports**: Use GitHub Issues
- **Security Issues**: See [SECURITY.md](SECURITY.md)
- **Pull Requests**: Not accepting at this time

## 📜 License

MIT License - See [LICENSE](LICENSE)

**⚠️ Disclaimer**: Educational/portfolio software. No warranty. Not audited. Use at own risk.

## 🙏 Acknowledgments

- [Monero Project](https://www.getmonero.org/) - Privacy-focused cryptocurrency
- [Next.js Team](https://nextjs.org/) - React framework
- [shadcn](https://ui.shadcn.com/) - UI component library
- Swap Providers: BTCSwapXMR, ChangeNOW

## 📧 Contact

- **GitHub**: [@Milkricee](https://github.com/Milkricee)
- **Portfolio**: [Your Portfolio URL]
- **Email**: [Your Email]

---

**Built with ❤️ for privacy and performance**

*Last Updated: January 2026*
