# Swap Error Handling & Retry System

Vollständiges Fehlerbehandlungs- und Retry-System für XMR Swap Operations.

## 🎯 Übersicht

Das System bietet:
- **Strukturierte Fehlerklassen** (Network, API, Timeout, Validation)
- **Erweiterte Swap-Status** (pending, processing, completed, failed, timeout, cancelled)
- **Automatische Timeout-Erkennung** (30 Minuten)
- **One-Click Retry** für fehlgeschlagene Swaps
- **Fehler-Logging** (client-side, kein Tracking)

## 📋 Swap-Status

### Status-Typen

| Status | Bedeutung | Icon | Farbe | Retry möglich? |
|--------|-----------|------|-------|----------------|
| `pending` | Wartet auf Deposit | ⏳ | Gelb | Ja (bei Timeout) |
| `processing` | Deposit empfangen, wird verarbeitet | ⚙️ | Gelb | Nein |
| `completed` | Erfolgreich abgeschlossen | ✓ | Grün | Nein |
| `failed` | Fehlgeschlagen (Provider-Error) | ✗ | Rot | Ja |
| `timeout` | Kein Deposit innerhalb 30min | ⏰ | Orange | Ja |
| `cancelled` | Vom Nutzer abgebrochen | ⊘ | Grau | Ja |
| `expired` | Deposit-Fenster geschlossen | ✗ | Rot | Ja |

### Status-Übergänge

```
pending → processing → completed ✅
       ↓
       timeout (30min) → retry → pending
       ↓
       failed (provider error) → retry → pending
```

## 🔧 Fehlerklassen

### 1. NetworkError (Retryable)

**Wann:** Netzwerk nicht erreichbar, DNS-Fehler, Verbindungsabbruch

```typescript
throw new NetworkError('Network request failed. Check your connection.');
```

**UI:** 
- 🌐 "Netzwerkfehler. Bitte Verbindung prüfen."
- Retry-Button verfügbar

### 2. APIError (Teilweise Retryable)

**Wann:** HTTP 4xx/5xx Fehler

```typescript
throw new APIError('Rate limit exceeded', 429, details, true);
```

**Retryable wenn:**
- 5xx (Server Error) → Ja
- 429 (Rate Limit) → Ja
- 4xx (Client Error) → Nein

**UI:**
- ⚠️ "API-Fehler: [Message]"
- Retry-Button nur bei retryable Fehlern

### 3. ProviderError (Individuell)

**Wann:** Provider-spezifische Fehler (ChangeNOW, BTCSwapXMR, GhostSwap)

```typescript
throw new ProviderError(
  'ChangeNOW: Invalid pair',
  'ChangeNOW',
  false // nicht retryable
);
```

**UI:**
- 🔄 "ChangeNOW-Fehler: [Message]"
- Support-Link zum Provider

### 4. TimeoutError (Nicht Retryable)

**Wann:** 30 Minuten ohne Deposit-TX

```typescript
throw new TimeoutError('Swap timed out. No deposit detected within 30 minutes.');
```

**UI:**
- ⏰ "Swap timed out"
- Hinweis: "Sie können Retry versuchen oder Support kontaktieren"

### 5. ValidationError (Nicht Retryable)

**Wann:** Ungültige Parameter (falsches Coin-Pair, ungültige Adresse)

```typescript
throw new ValidationError('Invalid Monero address');
```

**UI:**
- ❌ "Validierungsfehler: [Message]"
- Kein Retry-Button

## 🔁 Retry-Mechanismus

### Automatisches Retry-Checking

```tsx
// components/TransactionHistory.tsx
const swapMonitor = useSwapMonitor({
  enabled: true,
  interval: 120_000, // Check alle 2 Minuten
  onTimeout: (count) => {
    // UI reload bei Timeouts
    loadTransactions();
  },
});
```

### Manuelles Retry

```typescript
// Retry-Button in TransactionRow.tsx
const handleRetry = async () => {
  const { retrySwap } = await import('@/lib/swap-providers/execute');
  const newSwap = await retrySwap(originalSwapId);
  // → Neuer Swap mit selben Parametern
};
```

**Retry-Bedingungen:**
- Status muss `failed`, `timeout`, oder `cancelled` sein
- `canRetry` Flag muss `true` sein
- Keine Limits (unbegrenzte Retries möglich)

## 🧪 Testing

### Simulated Timeout

```javascript
// Browser Console
const mockSwap = {
  id: `test-${Date.now()}`,
  orderId: 'test-order-123',
  provider: 'ChangeNOW',
  depositAddress: '1ABC...',
  withdrawalAddress: '4XYZ...',
  depositCurrency: 'BTC',
  receiveCurrency: 'XMR',
  depositAmount: '0.01',
  receiveAmount: '1.5',
  fromCoin: 'BTC',
  toCoin: 'XMR',
  fromAmount: 0.01,
  expectedToAmount: 1.5,
  status: 'pending',
  expiresAt: Date.now() + 3600000,
  createdAt: Date.now(),
  timestamp: Date.now(),
  timeoutAt: Date.now() - 1000, // ← Already timed out!
  canRetry: true,
  retryCount: 0,
};

const history = JSON.parse(localStorage.getItem('swap_history') || '[]');
history.unshift(mockSwap);
localStorage.setItem('swap_history', JSON.stringify(history));
window.location.reload();

// Nach 2 Minuten: Swap-Monitor erkennt Timeout → Status: 'timeout'
```

### Simulated Error

```javascript
// Swap mit Error-Message
const failedSwap = {
  ...mockSwap,
  id: `failed-${Date.now()}`,
  status: 'failed',
  errorMessage: 'Provider returned: Invalid pair BTC-XMR',
  errorCode: 'INVALID_PAIR',
  canRetry: false, // Validation Error → nicht retryable
};

const history = JSON.parse(localStorage.getItem('swap_history') || '[]');
history.unshift(failedSwap);
localStorage.setItem('swap_history', JSON.stringify(history));
window.location.reload();
```

### Error Logs prüfen

```javascript
// Browser Console
import { getErrorLogs } from '@/lib/swap-providers/errors';
console.table(getErrorLogs());

// Logs löschen
import { clearErrorLogs } from '@/lib/swap-providers/errors';
clearErrorLogs();
```

## 📱 UI-Elemente

### Swap-Row (Expandable)

```tsx
<TransactionRow tx={swapTransaction} />

// Zeigt:
// - Status-Badge (⏰ timeout, ✗ failed, etc.)
// - Retry-Button (nur bei canRetry=true)
// - Expandable Details (▶ → ▼)
//   - Error-Message (roter Hintergrund)
//   - Timeout-Warning (orange Hintergrund)
//   - Timestamps (Created, Timeout, LastChecked)
```

### Status-Banner

```tsx
{/* In TransactionHistory.tsx */}
{swapMonitor.timeoutsDetected > 0 && (
  <div className="bg-red-500/10 ...">
    ⏰ {swapMonitor.timeoutsDetected} swap(s) timed out
  </div>
)}
```

### Retry-Counter

```tsx
{/* Zeigt Retry-Anzahl */}
{tx.retryCount > 0 && (
  <span className="text-amber-400">
    • Retry #{tx.retryCount}
  </span>
)}
```

## 🔍 Debugging

### Problem: Swap bleibt pending

**Checkliste:**
1. Timeout gesetzt? → `tx.timeoutAt` prüfen
2. Swap-Monitor aktiv? → Console: `useSwapMonitor` logs
3. Status-Check-Logs? → `tx.lastChecked` Timestamp

**Manueller Timeout-Check:**
```javascript
// Browser Console
import { checkSwapTimeouts } from '@/lib/swap-providers/execute';
const count = checkSwapTimeouts();
console.log(`${count} swaps timed out`);
```

### Problem: Retry-Button fehlt

**Checkliste:**
1. `tx.canRetry === true`? → Prüfen
2. Status erlaubt Retry? → Muss `failed`/`timeout`/`cancelled` sein
3. Button disabled? → `retrying` State prüfen

### Problem: Error-Logs zu voll

```javascript
// Max. 20 Logs gespeichert
// Bei Bedarf löschen:
localStorage.removeItem('swap_error_logs');
```

## ⚙️ Konfiguration

### Timeout-Dauer ändern

```typescript
// lib/swap-providers/execute.ts
const SWAP_TIMEOUT_MS = 30 * 60 * 1000; // ← 30 Minuten

// Auf 20 Minuten ändern:
const SWAP_TIMEOUT_MS = 20 * 60 * 1000;
```

### Swap-Monitor-Intervall

```tsx
// components/TransactionHistory.tsx
const swapMonitor = useSwapMonitor({
  interval: 120_000, // ← 2 Minuten
  
  // Auf 5 Minuten ändern:
  interval: 300_000,
});
```

### Max Error Logs

```typescript
// lib/swap-providers/errors.ts (logSwapError)
logs.splice(20); // ← Max. 20 Logs

// Auf 50 erhöhen:
logs.splice(50);
```

## 📚 API-Referenz

### executeSwap()

```typescript
import { executeSwap } from '@/lib/swap-providers/execute';

const swap = await executeSwap(
  'ChangeNOW',
  'BTC',
  'XMR',
  0.01,
  '4ABC...'
);

// Wirft: SwapError, NetworkError, APIError, ProviderError, ValidationError
```

### retrySwap()

```typescript
import { retrySwap } from '@/lib/swap-providers/execute';

const newSwap = await retrySwap('swap-1704380400000');
// → Neuer Swap, retryCount +1

// Wirft ValidationError wenn:
// - Original-Swap nicht gefunden
// - canRetry === false
// - Status nicht failed/timeout/cancelled
```

### checkSwapTimeouts()

```typescript
import { checkSwapTimeouts } from '@/lib/swap-providers/execute';

const count = checkSwapTimeouts();
// → Anzahl der als 'timeout' markierten Swaps
```

### parseSwapError()

```typescript
import { parseSwapError } from '@/lib/swap-providers/errors';

try {
  await executeSwap(...);
} catch (error) {
  const swapError = parseSwapError(error);
  console.log(swapError.message); // User-friendly message
  console.log(swapError.code);    // Error code
  console.log(swapError.retryable); // true/false
}
```

## 🎨 Status-Colors (Tailwind)

```tsx
// lib/swap-providers/execute.ts → mapProviderStatus()
'completed' → text-green-400
'pending' → text-yellow-400
'processing' → text-yellow-400
'failed' → text-red-400
'timeout' → text-orange-400
'cancelled' → text-gray-400
'expired' → text-red-400
```

## 🛡️ Sicherheit

### Was wird NICHT geloggt:
- Private Keys / Seeds
- User Passwords
- XMR-Adressen (nur formatiert: `4ABC...XYZ`)
- Sensitive API-Keys

### Was wird geloggt:
- Error-Messages (generic)
- Error-Codes
- Provider-Namen
- Timestamps
- User-Agent (nur für Context)

**Error-Logs werden NUR client-side gespeichert (localStorage).**

## 📊 Metriken (Development-Mode)

```javascript
// Console-Logs im Dev-Mode
🔄 Executing swap: 0.01 BTC → XMR via ChangeNOW
⏰ Swap swap-123 timed out
✅ Swap swap-123 updated: { status: 'timeout' }
🔄 Retrying swap (attempt 1): swap-456
```

---

## 🆘 Support

Bei Problemen:
1. Error-Logs prüfen: `getErrorLogs()`
2. Swap-Details expandieren (▶ Button)
3. Provider-Support kontaktieren (Order-ID angeben)

**System ist Production-Ready!** 🚀
