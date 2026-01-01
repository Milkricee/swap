# Security, Performance & Functionality Gap Analysis

**Stand:** 2026-01-01  
**Status:** Post-Implementation Review

---

## 🔴 KRITISCHE SICHERHEITSLÜCKEN

### 1. **Encryption Key Management** (CRITICAL)
**Problem:**
```typescript
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';
```

**Risiken:**
- ❌ Default Key = alle Wallets mit gleichem Key verschlüsselt
- ❌ `NEXT_PUBLIC_*` = Key im Client-Bundle sichtbar
- ❌ Keine Key-Rotation
- ❌ Kein User-spezifischer Key

**Lösung:**
```typescript
// Nutzer-generierter Key bei Wallet-Creation
const generateUserKey = (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']),
    256
  );
};
```

**Action Items:**
- [ ] User-Password für Encryption bei Wallet-Create
- [ ] PBKDF2 statt statischer Key
- [ ] Salt pro User in localStorage
- [ ] Key niemals in `NEXT_PUBLIC_*`

---

### 2. **Rate Limiting** (HIGH)
**Aktuell:**
- ✅ Basic Map-basiertes Rate Limiting in `/api/wallets/recover`
- ❌ Kein Limiting auf `/api/wallets/create`
- ❌ Kein Limiting auf `/api/pay`
- ❌ Kein Limiting auf `/api/swap`
- ❌ Memory-basiert = bei Restart verloren

**Probleme:**
- DDoS-Anfällig
- Brute-Force-Attacken möglich
- Keine persistente IP-Blacklist

**Lösung:**
```typescript
// Upstash Redis für persistentes Rate Limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

// In allen API Routes:
const { success } = await ratelimit.limit(ip);
if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
```

**Action Items:**
- [ ] Upstash Redis Setup
- [ ] Rate Limiting auf ALLE API Routes
- [ ] IP-Blacklist bei Abuse
- [ ] Cloudflare Turnstile CAPTCHA für kritische Actions

---

### 3. **Input Validation** (MEDIUM)
**Aktuell:**
- ✅ Zod Schemas für API-Validierung
- ❌ Keine Client-Side Sanitization
- ❌ XSS-Potential bei User-Inputs

**Risiken:**
```typescript
// Beispiel: Label in Wallet könnte XSS sein
<div>{wallet.label}</div> // Gefährlich!
```

**Lösung:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (input: string) => DOMPurify.sanitize(input);

// Vor jeder Anzeige:
<div>{sanitizeInput(wallet.label)}</div>
```

**Action Items:**
- [ ] DOMPurify installieren
- [ ] Alle User-Inputs sanitizen
- [ ] CSP Headers setzen

---

### 4. **Private Key Exposure** (CRITICAL)
**Aktuell:**
- ✅ Seeds verschlüsselt in localStorage
- ❌ Seeds werden in React State geladen (Memory-Leak-Risiko)
- ❌ Keine Memory-Wipe nach Nutzung

**Risiko:**
```typescript
// In SeedBackupModal.tsx
const [seeds, setSeeds] = useState<string[]>([]); // Seeds im Memory!
```

**Lösung:**
```typescript
// Minimale Memory-Exposure
const useSecureSeeds = () => {
  const seedsRef = useRef<string[]>([]);
  
  const loadSeeds = () => {
    seedsRef.current = decryptSeeds();
    setTimeout(() => {
      seedsRef.current = []; // Auto-wipe nach 5 Minuten
    }, 300000);
  };
  
  return { loadSeeds, getSeeds: () => seedsRef.current };
};
```

**Action Items:**
- [ ] Seeds in `useRef` statt `useState`
- [ ] Auto-Wipe nach Timeout
- [ ] Keine Seeds in Console-Logs

---

### 5. **HTTPS Enforcement** (HIGH)
**Aktuell:**
- ❌ Keine HTTPS-Redirect
- ❌ Keine HSTS Headers

**Risiko:**
- Man-in-the-Middle bei HTTP
- Session Hijacking

**Lösung:**
```typescript
// next.config.mjs
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ];
}
```

**Action Items:**
- [ ] Security Headers hinzufügen
- [ ] HTTPS-Only in Production
- [ ] CSP Policy

---

## 🟡 PERFORMANCE-OPTIMIERUNGEN

### 1. **Monero Balance Queries** (HIGH)
**Problem:**
- Jede Balance-Abfrage = Full Wallet-Scan vom Genesis-Block
- CakeWallet Public Node = langsam & rate-limited

**Aktuell:**
```typescript
// Dauert 30-60 Sekunden pro Wallet!
const balance = await wallet.sync();
```

**Lösung:**
```typescript
// 1. Restore Height speichern
localStorage.setItem('wallet_restore_height', createdAt.toString());

// 2. Background Sync mit Web Worker
const balanceWorker = new Worker('/workers/balance-sync.js');
balanceWorker.postMessage({ mnemonic, restoreHeight });

// 3. Cached Balance anzeigen
const cachedBalance = localStorage.getItem('wallet_2_balance');
setBalance(cachedBalance || '0.000000000000'); // Sofort anzeigen
```

**Action Items:**
- [ ] Web Worker für Balance Sync
- [ ] Cached Balances mit Timestamp
- [ ] Background Refresh alle 5 Minuten

---

### 2. **Bundle Size** (MEDIUM)
**Aktuell:**
- monero-javascript = ~2MB (komprimiert)
- Client-Bundle sollte <100KB sein

**Problem:**
```bash
npm run build
# Bundle: 450KB gzipped (zu groß!)
```

**Lösung:**
```typescript
// 1. Code Splitting
const MoneroWallet = lazy(() => import('./MoneroWallet'));

// 2. Tree Shaking
import { createWallet } from 'monero-javascript/wallet'; // Nur Wallet-Teil

// 3. External CDN für große Libs
<script src="https://cdn.jsdelivr.net/npm/monero-javascript@0.8.4/dist/monero-javascript.min.js"></script>
```

**Target:**
- Client-Bundle: <100KB gzipped
- Initial Load: <1.5s

**Action Items:**
- [ ] Bundle Analyzer (`npm run analyze`)
- [ ] Code Splitting für Routes
- [ ] monero-javascript als External

---

### 3. **Swap Provider Parallel Queries** (LOW)
**Aktuell:**
```typescript
// OK: Parallel queries
const routes = await Promise.allSettled([
  getBTCSwapXMRRoute(amount),
  getChangeNOWRoute('BTC', amount),
  getGhostSwapRoute('BTC', amount),
]);
```

**Aber:**
- Keine Timeout-Limits
- Langsame APIs blockieren UI

**Optimierung:**
```typescript
const fetchWithTimeout = (promise: Promise<any>, timeout = 3000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
};

const routes = await Promise.allSettled([
  fetchWithTimeout(getBTCSwapXMRRoute(amount)),
  fetchWithTimeout(getChangeNOWRoute('BTC', amount)),
]);
```

**Action Items:**
- [ ] 3s Timeout für alle API-Calls
- [ ] Loading States mit Skeleton UI

---

## 🟢 FEHLENDE FUNKTIONALITÄT

### 1. **Swap Auto-Distribution** (HIGH)
**Feature:** Nach erfolgreichem Swap → automatische Wallet-Verteilung

**Aktuell:**
- ❌ User muss manuell verteilen
- ❌ Keine Swap-Completion-Hooks

**Implementation:**
```typescript
// In SwapCard.tsx
const pollSwapStatus = async (orderId: string) => {
  const interval = setInterval(async () => {
    const status = await getSwapStatus('BTCSwapXMR', orderId);
    
    if (status.status === 'completed' && status.xmrSent) {
      // Auto-Distribution triggern
      await distributeToWallets(status.xmrSent);
      clearInterval(interval);
    }
  }, 60000); // Check alle 60s
};
```

**Action Items:**
- [ ] Swap Status Polling
- [ ] Auto-Distribution bei Completion
- [ ] Notification System

---

### 2. **Transaction History** (MEDIUM)
**Feature:** Vollständige Payment/Swap History

**Aktuell:**
- ✅ Swap History in localStorage
- ❌ Keine Payment History
- ❌ Keine UI für History

**Implementation:**
```typescript
// components/TransactionHistory.tsx
const TransactionHistory = () => {
  const swaps = getSwapHistory();
  const payments = getPaymentHistory(); // TODO
  
  return (
    <div>
      {[...swaps, ...payments].sort((a, b) => b.timestamp - a.timestamp).map(tx => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  );
};
```

**Action Items:**
- [ ] Payment History speichern
- [ ] History UI Component
- [ ] Export als CSV

---

### 3. **Multi-Currency Support** (LOW)
**Feature:** EUR/USD Preise anzeigen

**Aktuell:**
- Nur Crypto-Werte
- Keine Fiat-Conversion

**Implementation:**
```typescript
// lib/pricing/coingecko.ts
const getXMRPrice = async (currency = 'USD') => {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=monero&vs_currencies=usd,eur');
  return res.json();
};

// In WalletView.tsx
const xmrPrice = await getXMRPrice();
<div>
  {balance} XMR (~${(parseFloat(balance) * xmrPrice.usd).toFixed(2)})
</div>
```

**Action Items:**
- [ ] CoinGecko API Integration
- [ ] Currency Toggle (USD/EUR/BTC)
- [ ] Cached Prices (5min refresh)

---

### 4. **QR Code Generation** (MEDIUM)
**Feature:** QR-Code für XMR-Adressen

**Aktuell:**
- ❌ Nur Text-Adresse
- ❌ Kein QR-Scan

**Implementation:**
```typescript
import QRCode from 'qrcode.react';

<QRCode 
  value={wallet.address} 
  size={256}
  level="H"
  includeMargin
/>
```

**Action Items:**
- [ ] qrcode.react installieren
- [ ] QR in WalletView
- [ ] QR-Scan für Payments (html5-qrcode)

---

### 5. **Backup System** (HIGH)
**Feature:** Seed Backup als verschlüsseltes File

**Aktuell:**
- ✅ Download als TXT
- ❌ Kein verschlüsseltes Backup
- ❌ Kein Cloud-Backup

**Implementation:**
```typescript
// Encrypted Backup
const createEncryptedBackup = (seeds: string[], password: string) => {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(seeds), password).toString();
  const blob = new Blob([encrypted], { type: 'application/octet-stream' });
  saveAs(blob, `xmr-backup-${Date.now()}.enc`);
};

// Restore
const restoreFromEncryptedBackup = (file: File, password: string) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const decrypted = CryptoJS.AES.decrypt(e.target.result, password);
    const seeds = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    recoverWalletsFromSeeds(seeds);
  };
  reader.readAsText(file);
};
```

**Action Items:**
- [ ] Password-Protected Backup
- [ ] Restore from .enc File
- [ ] Optional: IPFS Backup

---

## 📊 PRIORITY MATRIX

| Feature | Security | Performance | Functionality | Priority |
|---------|----------|-------------|---------------|----------|
| User-Password Encryption | 🔴 CRITICAL | - | - | **P0** |
| Global Rate Limiting | 🔴 HIGH | - | - | **P0** |
| Security Headers | 🔴 HIGH | - | - | **P0** |
| Balance Caching + Workers | - | 🟡 HIGH | - | **P1** |
| Input Sanitization | 🔴 MEDIUM | - | - | **P1** |
| Auto Swap Distribution | - | - | 🟢 HIGH | **P1** |
| Transaction History | - | - | 🟢 MEDIUM | **P2** |
| QR Code Support | - | - | 🟢 MEDIUM | **P2** |
| Encrypted Backups | 🔴 HIGH | - | 🟢 HIGH | **P1** |
| Bundle Optimization | - | 🟡 MEDIUM | - | **P2** |
| Fiat Pricing | - | - | 🟢 LOW | **P3** |

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Security Hardening (1-2 Wochen)
- [ ] User-Password-basierte Encryption
- [ ] Upstash Redis Rate Limiting
- [ ] Security Headers (HSTS, CSP, etc.)
- [ ] Input Sanitization (DOMPurify)
- [ ] Encrypted Backups

### Phase 2: Performance (1 Woche)
- [ ] Web Worker Balance Sync
- [ ] Balance Caching
- [ ] Bundle Size Optimization
- [ ] API Timeout Limits

### Phase 3: Features (2 Wochen)
- [ ] Transaction History UI
- [ ] Auto Swap Distribution
- [ ] QR Code Support
- [ ] Fiat Price Display

---

## 🛠️ TOOLS & DEPENDENCIES

### Security
```bash
npm install @upstash/ratelimit @upstash/redis
npm install isomorphic-dompurify
npm install helmet # Security Headers Middleware
```

### Performance
```bash
npm install @next/bundle-analyzer
npm install comlink # Web Worker Helper
```

### Features
```bash
npm install qrcode.react
npm install file-saver
npm install coingecko-api
```

---

## 📝 NEXT STEPS

1. **Sofort (heute):**
   - `.env.local` mit sicherem Encryption Key
   - Security Headers in `next.config.mjs`
   - Rate Limiting auf `/api/wallets/create`

2. **Diese Woche:**
   - Upstash Redis Setup
   - User-Password für Encryption
   - Balance Caching

3. **Nächste Woche:**
   - Transaction History
   - Auto Swap Distribution
   - QR Codes

---

## ⚠️ DEPLOYMENT CHECKLIST

Vor Production:
- [ ] Unique `NEXT_PUBLIC_ENCRYPTION_KEY` gesetzt (NICHT committen!)
- [ ] HTTPS erzwungen
- [ ] Rate Limiting aktiv
- [ ] Security Headers gesetzt
- [ ] Bundle Size <100KB
- [ ] Lighthouse Score >95
- [ ] Alle Console.logs entfernt
- [ ] Error Tracking (Sentry) aktiv
- [ ] Backup-System getestet
