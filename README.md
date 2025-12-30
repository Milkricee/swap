# Private XMR Swap

Privacy-first Monero swap & payment application with 5-wallet distribution system.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- 🔄 **Swap**: BTC/ETH/SOL/USDC → XMR (best rates)
- 💼 **5-Wallet System**: Automatic distribution (20% each, Wallet #3 hot)
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
