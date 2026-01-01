# Swap Provider Integration Guide

## Implementierte Provider

### 1. BTCSwapXMR (PRODUKTION READY)
**API:** `https://api.btcswapxmr.com`  
**Pairs:** BTC ↔ XMR  
**Fee:** 0.15% (niedrigste im Markt)  
**Tor Support:** Ja (`http://btcswapxmr.onion`)

#### Features
- ✅ Keine KYC
- ✅ Tor-native
- ✅ Non-custodial
- ✅ Atomic Swaps (in Entwicklung)

#### API Endpunkte
```bash
# Quote abfragen
POST https://api.btcswapxmr.com/v1/quote
{
  "from": "BTC",
  "to": "XMR",
  "amount": 0.1
}

# Swap erstellen
POST https://api.btcswapxmr.com/v1/swaps
{
  "from": "BTC",
  "to": "XMR",
  "amount": 0.1,
  "xmr_address": "4..."
}

# Status prüfen
GET https://api.btcswapxmr.com/v1/swaps/{swap_id}
```

#### Environment Variable
```env
NEXT_PUBLIC_BTCSWAPXMR_API=https://api.btcswapxmr.com
```

---

### 2. ChangeNOW (PRODUKTION READY)
**API:** `https://api.changenow.io/v2`  
**Pairs:** ETH, USDC, LTC, BTC → XMR  
**Fee:** 0.25%  
**Docs:** https://documenter.getpostman.com/view/8180765/SVfTPnME

#### Features
- ✅ Schnelle Swaps (10-20 min)
- ✅ Große Liquidität
- ✅ Keine KYC (<2 XMR)
- ✅ API-Key erforderlich

#### API Endpunkte
```bash
# Min/Max Amount
GET https://api.changenow.io/v2/exchange/range?fromCurrency=eth&toCurrency=xmr&api_key=YOUR_KEY

# Estimate
GET https://api.changenow.io/v2/exchange/estimated-amount?fromCurrency=eth&toCurrency=xmr&fromAmount=1&api_key=YOUR_KEY

# Create Exchange
POST https://api.changenow.io/v2/exchange
Headers: x-changenow-api-key: YOUR_KEY
{
  "fromCurrency": "eth",
  "toCurrency": "xmr",
  "fromAmount": "1",
  "address": "4...",
  "flow": "standard"
}

# Status
GET https://api.changenow.io/v2/exchange/by-id?id=EXCHANGE_ID&api_key=YOUR_KEY
```

#### API Key Setup
1. Registrierung: https://changenow.io/api
2. Dashboard → API → Generate Key
3. Environment Variable:
```env
NEXT_PUBLIC_CHANGENOW_API_KEY=your_api_key_here
```

---

### 3. GhostSwap (OFFLINE - ALTERNATIVE)
**Status:** ❌ Service offline seit 2025  
**Alternative:** Trocador.app, SideShift.ai

#### Empfohlene Alternativen

**Trocador.app** (Aggregator)
- API: https://trocador.app/en/apisupport/
- Vorteile: Vergleicht mehrere Provider
- Fee: ~0.5%

**SideShift.ai**
- API: https://sideshift.ai/api
- Vorteile: Schnell, keine KYC
- Pairs: 100+ coins → XMR
- Fee: ~0.5%

**Exolix**
- API: https://exolix.com/api-doc
- Vorteile: Niedrige Fees
- Fee: ~0.3%

---

## Integration Flow

### 1. Quote abrufen
```typescript
import { getBestRoute } from '@/lib/swap-providers';

const route = await getBestRoute('BTC', 'XMR', 0.1);
// Returns best provider + estimated XMR amount
```

### 2. Swap ausführen
```typescript
import { executeSwap } from '@/lib/swap-providers/execute';

const order = await executeSwap(
  'BTCSwapXMR', // oder 'ChangeNOW'
  'BTC',
  'XMR',
  0.1,
  '4ABC...' // XMR Address
);

// Returns: depositAddress, orderId, expectedAmount
```

### 3. Status überwachen
```typescript
import { getSwapStatus } from '@/lib/swap-providers/execute';

const status = await getSwapStatus('BTCSwapXMR', order.orderId);
// Returns: status, confirmations, txHashes
```

---

## Tor-Proxy Setup (Optional für BTCSwapXMR)

### Option 1: Lokaler Tor Proxy
```bash
# Tor installieren
sudo apt install tor

# torrc konfigurieren
SOCKSPort 9050
ControlPort 9051

# Proxy in Next.js
fetch('http://btcswapxmr.onion/api/quote', {
  agent: new HttpsProxyAgent('socks5://127.0.0.1:9050')
})
```

### Option 2: Tor2Web Gateway (nicht empfohlen)
```env
NEXT_PUBLIC_BTCSWAPXMR_API=https://btcswapxmr.onion.to
```

---

## Rate Limiting

Alle APIs haben Rate Limits:
- BTCSwapXMR: 60 req/min
- ChangeNOW: 30 req/min (mit API Key)

Implementation in `app/api/swap/route.ts`:
```typescript
const rateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

await rateLimit.check(request, 10, 'SWAP_API');
```

---

## Testing

### Development Mode (Mock APIs)
```env
NODE_ENV=development
# Nutzt Fallback Mock-Quotes wenn API fehlschlägt
```

### Production Mode (Real APIs)
```env
NODE_ENV=production
NEXT_PUBLIC_CHANGENOW_API_KEY=your_key
NEXT_PUBLIC_BTCSWAPXMR_API=https://api.btcswapxmr.com
```

### Test Cases
```typescript
// Test Quote
const route = await getBestRoute('BTC', 'XMR', 0.01);
expect(route).toBeTruthy();
expect(route.provider).toMatch(/BTCSwapXMR|ChangeNOW/);

// Test Swap Execution
const order = await executeSwap('BTCSwapXMR', 'BTC', 'XMR', 0.01, 'MOCK_XMR_ADDRESS');
expect(order.depositAddress).toMatch(/^bc1/); // BTC address

// Test Status Check
const status = await getSwapStatus('BTCSwapXMR', order.orderId);
expect(status.status).toBeDefined();
```

---

## Fehlerbehandlung

Alle Provider-Funktionen haben Fallback-Logik:

```typescript
try {
  const quote = await getChangeNOWQuote('ETH', 'XMR', 1);
} catch (error) {
  console.error('ChangeNOW API error:', error);
  // Falls back zu Mock-Quote mit realistischen Werten
  return mockQuote;
}
```

---

## Nächste Schritte

1. **SOL → XMR Support**  
   - Jupiter Aggregator für SOL → USDC
   - ChangeNOW für USDC → XMR
   - 2-Step Swap implementieren

2. **Swap History UI**  
   - Dashboard für aktive Swaps
   - Transaction Tracking
   - Status Notifications

3. **Auto-Wallet-Distribution**  
   - Nach Swap-Completion XMR automatisch auf 5 Wallets verteilen
   - Integration in `lib/wallets/distribution.ts`

4. **Rate Limit Middleware**  
   - Globales Rate Limiting über Upstash Redis
   - Per-IP Tracking
   - Cloudflare Turnstile CAPTCHA

---

## API Keys & Environment

Vollständige `.env.local` Konfiguration:

```env
# Swap Providers
NEXT_PUBLIC_CHANGENOW_API_KEY=your_changenow_api_key
NEXT_PUBLIC_BTCSWAPXMR_API=https://api.btcswapxmr.com

# Monero Node
NEXT_PUBLIC_MONERO_RPC_URL=https://xmr-node.cakewallet.com:18081
NEXT_PUBLIC_MONERO_NETWORK=mainnet

# Encryption
NEXT_PUBLIC_ENCRYPTION_KEY=your_random_32_char_key_here

# Optional: Tor Proxy
TOR_PROXY_URL=socks5://127.0.0.1:9050
```
