# 🔒 Private XMR Swap

Privacy-first Monero swap & payment application with 5-wallet distribution system.

## ✨ Features

- **Multi-Coin Swaps**: BTC/ETH/SOL/USDC → XMR via best-rate providers
- **5-Wallet System**: Auto-distribution (20%-20%-30%-20%-10%) for enhanced privacy
- **Smart Consolidation**: Automatic 5→1 wallet merge for exact payments
- **1-Click Payments**: QR-scan ready, exact XMR amounts to shops
- **Mobile-First**: Optimized for mobile devices (320px+)
- **PWA Ready**: Offline support, installable
- **Dark Mode Only**: Privacy-focused minimal UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/Milkricee/swap.git
cd swap

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build & Deploy

### Production Build

```bash
npm run build
npm run start
```

### Lighthouse Performance Check

```bash
npm run lighthouse
```

**Target**: Mobile Score 95+

### Deploy to VPS

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "xmr-swap" -- start

# Or Docker
docker build -t xmr-swap .
docker run -p 3000:3000 xmr-swap
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: TailwindCSS 4, Shadcn/UI, Lucide Icons
- **State**: localStorage (AES encrypted via crypto-js)
- **Validation**: Zod schemas
- **Wallets**: ✅ Real Monero wallets with `monero-javascript` (PRODUCTION-READY)
- **Blockchain**: CakeWallet Public Node (or custom RPC)

### Project Structure

```
swap/
├── app/
│   ├── api/
│   │   ├── swap/route.ts          # Swap route finder
│   │   ├── pay/route.ts           # Payment execution
│   │   └── wallets/route.ts       # Wallet management
│   ├── layout.tsx                 # Root layout + PWA
│   ├── page.tsx                   # Main dashboard
│   └── globals.css                # Global styles
├── components/
│   ├── SwapCard.tsx               # Swap UI
│   ├── WalletGrid.tsx             # 5-wallet display
│   ├── PaymentForm.tsx            # Payment UI
│   └── ui/                        # Shadcn components
├── lib/
│   ├── swap-providers/            # Provider aggregation
│   ├── wallets/                   # Wallet logic
│   ├── payment/                   # Payment + consolidation
│   └── storage/encrypted.ts       # Encrypted localStorage
├── types/
│   └── wallet.ts                  # TypeScript interfaces
└── public/
    ├── manifest.json              # PWA manifest
    └── sw.js                      # Service Worker
```

## 🔐 Security

### Critical Rules

- ❌ **NEVER** store private keys in localStorage/state
- ✅ **ALWAYS** encrypt wallet data with crypto-js
- ✅ **ALWAYS** use Server Actions for external APIs
- ✅ **ALWAYS** validate inputs with Zod
- ✅ Rate limiting on all API routes (3-10 req/min)

### Wallet Distribution

After swap completion:

```typescript
Wallet 1: 20% (Cold)
Wallet 2: 20% (Cold)
Wallet 3: 30% (Hot)    ← Used for payments
Wallet 4: 20% (Cold)
Wallet 5: 10% (Reserve)
```

### Payment Flow

1. User enters shop address + exact amount
2. Check Hot Wallet balance
3. If insufficient → Consolidate wallets 1,2,4,5 → Wallet 3
4. Send **EXACT** amount from Wallet 3 → Shop
5. Display TX ID

## 🎨 UI/UX

### Design System

- **Background**: #0a0a0a
- **Accent**: #00d4aa (Monero green)
- **Typography**: Inter (variable font)
- **Effects**: Glassmorphism (`backdrop-blur-md bg-white/5`)

### Touch Targets

Minimum 48x48px for all interactive elements (WCAG AAA).

### Keyboard Shortcuts

- `Cmd/Ctrl + S` → Focus Swap
- `Cmd/Ctrl + P` → Focus Payment
- `Cmd/Ctrl + W` → Focus Wallets
- `Esc` → Clear inputs

## 📱 PWA Installation

### iOS

1. Open in Safari
2. Tap Share → Add to Home Screen
3. Launch from Home Screen

### Android

1. Open in Chrome
2. Tap Menu → Install App
3. Launch from App Drawer

### Desktop

1. Chrome: Address bar → Install icon
2. Edge: Similar process

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create 5 wallets
- [ ] Find best swap route (BTC→XMR)
- [ ] Execute swap (mock)
- [ ] Check wallet balances (20%-20%-30%-20%-10%)
- [ ] Consolidate to Hot Wallet
- [ ] Send exact payment
- [ ] Verify offline mode (Service Worker)
- [ ] Test keyboard shortcuts

### Rate Limiting

- Swap: 10 req/min
- Create Wallets: 3 req/min
- Payment: 5 req/min
- Consolidate: 5 req/min

## 🛠️ Production Checklist

- [ ] Replace mock wallet generation with monero-javascript
- [ ] Implement real provider APIs (btcswapxmr.com, ChangeNOW, Jupiter)
- [ ] Add user authentication
- [ ] Set unique `NEXT_PUBLIC_ENCRYPTION_KEY` in .env
- [ ] Configure CSP headers
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Add transaction confirmation polling
- [ ] Implement QR camera scanner (getUserMedia API)

## 🐛 Troubleshooting

### "Cannot find module '@radix-ui/react-slot'"

```bash
npm install @radix-ui/react-slot class-variance-authority
```

Then restart TS server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Wallets not persisting

Check browser localStorage encryption. Ensure `NEXT_PUBLIC_ENCRYPTION_KEY` is set.

### Service Worker not registering

HTTPS required in production. Use `localhost` for development.

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

**⚠️ Security Notice**: This is a portfolio/development project. See [SECURITY.md](SECURITY.md) for security considerations before production use.

## 🙏 Acknowledgments

- [Monero Project](https://www.getmonero.org/)
- [btcswapxmr.com](https://btcswapxmr.com/) (0.15% fee)
- [ChangeNOW](https://changenow.io/) (0.25% fee)
- [Jupiter](https://jup.ag/) (0.30% fee)

## 🔗 Links

- **Repository**: https://github.com/Milkricee/swap
- **Documentation**: [Copilot Instructions](.github/copilot-instructions.md)
- **Monero Address Format**: https://www.getmonero.org/resources/moneropedia/address.html

---

**⚠️ Disclaimer**: This is a development prototype. Use at your own risk. Not audited for production use.
- 💸 **Exact Payments**: Smart consolidation for precise amounts
- 🔒 **Privacy-First**: No KYC, encrypted localStorage
- 📱 **Mobile-First**: PWA, Lighthouse 95+

## Tech Stack

- Next.js 15 + React 19
- TypeScript + Tailwind CSS v4
- shadcn/ui components
- monero-javascript, ethers, viem
- crypto-js (encryption)

## Performance

- Bundle: <100kb gzipped
- Lighthouse Mobile: 95+ target
- LCP: <1.5s
- Touch targets: 48x48px

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lighthouse # Performance check
```

## Structure

```
app/              # Next.js App Router
components/       # React components
  ui/             # shadcn/ui components
lib/              # Business logic
  swap-providers/ # BTC/ETH/SOL → XMR
  wallets/        # 5-wallet management
public/           # Static assets
```

## License

Private use only
