# Copilot Instructions: XMR Swap & Payment App

## Projekt-Übersicht
Privacy-first Monero Swap Applikation (BTC/ETH/SOL/USDC → XMR) mit 5-Wallet-System für anonyme Payments. Next.js 15, Mobile-First, Dark Mode Only, localhost/VPS deployment.

## Architektur & Komponenten

### 3-Schichten-Aufbau
- **Frontend** (`/app`, `/components`): Next.js 15 App Router, React Server Components wo möglich
- **Business Logic** (`/lib`): Swap-Provider-Aggregation, Wallet-Management, Konsolidierungs-Engine
- **Storage**: localStorage (verschlüsselt mit crypto-js), KEINE Datenbank

### Kern-Module
- `lib/swap-providers/`: BTC↔XMR (btcswapxmr 0.15%), ETH/USDC→XMR (ChangeNOW 0.25%), SOL→XMR (Jupiter 0.30%)
- `lib/wallets/`: 5-Wallet-System mit monero-javascript, Verteilung 20% pro Wallet, Wallet #3 = Hot Wallet
- `lib/consolidation/`: Smart Merge 5→1 Wallet für exakte Payments
- `lib/payment/`: 1-Click Payment, QR-Scan-Integration, exakte XMR-Beträge

## Wichtige Konventionen

### Sicherheits-Regeln (KRITISCH)
- **NIE** Private Keys in State/Props/Logs
- Wallet-Daten NUR verschlüsselt in localStorage (`crypto-js.AES.encrypt()`)
- Swap/Payment-Logic NUR in Server Actions (`'use server'`)
- Rate Limiting auf allen API-Routes (10 req/min)
- Input Validation mit Zod schemas für alle User-Inputs

### Wallet-Verteilung nach Swap
```typescript
// Nach 10 XMR Swap automatische Verteilung:
Wallet1: 2 XMR (Cold)    // 20%
Wallet2: 2 XMR (Cold)    // 20%
Wallet3: 3 XMR (Hot)     // 30% - für schnelle Payments
Wallet4: 2 XMR (Cold)    // 20%
Wallet5: 1 XMR (Reserve) // 10%
```

### UI/UX Standards
- **Mobile First**: 320px Breakpoint, Touch Targets min 48x48px
- **Dark Mode Only**: Background #0a0a0a, Accent #00d4aa (XMR-Green)
- **Glassmorphism**: `backdrop-blur-md bg-white/5` für alle Cards
- **Performance**: Bundle <100kb gzipped, LCP <1.5s, Lighthouse Mobile 95+
- **3 Hauptbereiche**: Swap Panel | Wallets Grid | Payment Panel

### Code-Patterns

#### Server Actions für Swap-Operationen
```typescript
// IMMER Server Actions für externe API-Calls
'use server'
export async function findBestSwapRoute(from: string, to: 'XMR', amount: number) {
  // Rate Limiting Check
  // Provider-APIs parallel abfragen (btcswapxmr, ChangeNOW, etc.)
  // Beste Route nach Fees + Estimated Time
}
```

#### Wallet-Konsolidierung für exakte Payments
```typescript
// Wenn Payment > Hot Wallet Balance → Smart Consolidation
if (paymentAmount > wallet3Balance) {
  await consolidateWallets([1,2,4,5] → 3, paymentAmount)
  await sendExactPayment(wallet3, shopAddress, exactAmount)
}
```

### Dependencies
- `next@15`, `react@19`, `tailwindcss@4`
- `monero-javascript`, `ethers@6`, `viem` (Wallet-SDKs)
- `crypto-js` (localStorage encryption)
- `zod` (Input validation)
- `shadcn/ui` (minimal UI components)

## Development Workflow

### Lokaler Start
```bash
npm install
npm run dev  # localhost:3000
```

### Build & Performance Check
```bash
npm run build       # <100kb Bundle-Size Check
npm run lighthouse  # Mobile: 95+ Score Target
```

### Testing-Fokus
- Swap-Provider-Fallbacks (ChangeNOW down → btcswapxmr)
- Konsolidierungs-Logic (5 Wallets → 1, exakte Beträge)
- Wallet-Encryption/Decryption (localStorage roundtrip)

## Kritische Dateien
- `lib/swap-providers/best-route.ts`: Fee-Vergleich + Provider-Auswahl
- `lib/wallets/consolidate.ts`: Multi-Wallet → Single Payment
- `lib/storage/encrypted.ts`: localStorage Encryption-Wrapper
- `app/api/swap/route.ts`: Rate-Limited Swap-Endpoint

## Anti-Patterns (VERMEIDEN)
- ❌ Private Keys in React State (`useState(privateKey)`)
- ❌ Client-Side API-Calls zu Swap-Providern (CORS + Security)
- ❌ Unverschlüsseltes localStorage für Wallet-Daten
- ❌ Statische Wallet-Auswahl (IMMER 5-Wallet-Spread nutzen)
- ❌ Payments ohne exakte Betragsberechnung (Shops erwarten EXAKT 2.45372 XMR)

## Quick Actions Template
```typescript
// Dashboard Quick Actions
const actions = [
  { label: 'Swap', icon: '↔️', href: '/swap' },
  { label: 'Pay', icon: '💸', href: '/pay', requiresWallets: true },
  { label: 'Consolidate', icon: '🔄', action: consolidateAll },
]
```
