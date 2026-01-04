# Swap Error Handling - Quick Reference

## 🚀 3-Schritte Setup

### 1. Swap ausführen (automatische Fehlerbehandlung)

```typescript
// API oder Client-Code
import { executeSwap } from '@/lib/swap-providers/execute';

try {
  const swap = await executeSwap('ChangeNOW', 'BTC', 'XMR', 0.01, xmrAddress);
  // Swap hat automatisch: status, timeoutAt, canRetry, retryCount
} catch (error) {
  // Strukturierter Error: NetworkError, APIError, ProviderError, etc.
  console.error(error.message); // User-friendly
  console.error(error.code);    // Error-Code
  console.error(error.retryable); // true/false
}
```

### 2. UI integrieren (bereits fertig ✅)

```tsx
// components/TransactionHistory.tsx
const swapMonitor = useSwapMonitor({
  enabled: true,
  interval: 120_000, // 2min auto-check
});

// → Automatische Timeout-Erkennung
// → UI zeigt Retry-Button für failed/timeout Swaps
```

### 3. Fertig! 🎉

- Timeouts werden automatisch nach 30min erkannt
- Failed/Timeout Swaps zeigen "🔄 Retry" Button
- Error-Messages werden expandable angezeigt

---

## 📊 Status-Übersicht

| Status | Bedeutung | Retry? | Auto-Update? |
|--------|-----------|--------|--------------|
| `pending` | Wartet auf Deposit | Ja (bei Timeout) | Nach 30min → `timeout` |
| `processing` | Wird verarbeitet | Nein | - |
| `completed` | ✅ Erfolgreich | Nein | - |
| `failed` | ❌ Fehler | Ja | - |
| `timeout` | ⏰ Zu lange gewartet | Ja | - |
| `cancelled` | ⊘ Abgebrochen | Ja | - |

---

## 🔁 Retry-Logik

### Wann ist Retry möglich?

```typescript
const canRetry = 
  swap.canRetry && 
  ['failed', 'timeout', 'cancelled'].includes(swap.status);
```

### Retry ausführen

```typescript
import { retrySwap } from '@/lib/swap-providers/execute';

const newSwap = await retrySwap(originalSwapId);
// → Neue Order mit selben Parametern
// → retryCount wird erhöht
```

---

## 🐛 Fehlertypen & UI

### NetworkError

```
🌐 Netzwerkfehler
"Network request failed. Check your connection."
[Retry-Button]
```

### APIError (HTTP 4xx/5xx)

```
⚠️ API-Fehler
"ChangeNOW: Rate limit exceeded (429)"
[Retry-Button] (nur bei 5xx)
```

### ProviderError

```
🔄 Provider-Fehler
"BTCSwapXMR: Invalid pair BTC-XMR"
[Support-Link]
```

### TimeoutError

```
⏰ Swap Timeout
"No deposit detected within 30 minutes"
[Retry-Button] + [Support-Info]
```

### ValidationError

```
❌ Validierungsfehler
"Invalid Monero address"
[Kein Retry-Button]
```

---

## 🧪 Testing

### Timeout simulieren

```javascript
// Browser Console
const { checkSwapTimeouts } = await import('@/lib/swap-providers/execute');
const count = checkSwapTimeouts();
console.log(`${count} swaps timed out`);
```

### Failed Swap erstellen

```javascript
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');
const failedSwap = {
  ...history[0],
  id: `test-${Date.now()}`,
  status: 'failed',
  errorMessage: 'Test error',
  canRetry: true,
};
history.unshift(failedSwap);
localStorage.setItem('swap_history', JSON.stringify(history));
window.location.reload();
```

### Error-Logs anzeigen

```javascript
const { getErrorLogs } = await import('@/lib/swap-providers/errors');
console.table(getErrorLogs());
```

---

## ⚙️ Konfiguration

### Timeout-Dauer

```typescript
// lib/swap-providers/execute.ts
const SWAP_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten
```

### Monitor-Intervall

```tsx
// components/TransactionHistory.tsx
useSwapMonitor({ interval: 120_000 }); // 2 Minuten
```

---

## 📱 UI-Features

### Expandable Details

```
[Swap Row]
  ▶ BTC → XMR • ChangeNOW • ⏰ timeout
  
  [Details expandieren ▼]
    Order ID: abc123
    Deposit: 1ABC...
    ⏰ Swap Timeout
    "No deposit detected within 30 minutes"
    [🔄 Retry] [Contact Support]
```

### Status-Banner

```tsx
⏰ 2 swaps timed out • Last checked 14:32:15
```

### Retry-Counter

```tsx
Swap BTC → XMR • ChangeNOW • Retry #2
```

---

## 🔍 Debugging-Commands

```javascript
// 1. Check Timeouts
import { checkSwapTimeouts } from '@/lib/swap-providers/execute';
checkSwapTimeouts();

// 2. View Error Logs
import { getErrorLogs } from '@/lib/swap-providers/errors';
console.table(getErrorLogs());

// 3. Clear Logs
import { clearErrorLogs } from '@/lib/swap-providers/errors';
clearErrorLogs();

// 4. Inspect Swap
const history = JSON.parse(localStorage.getItem('swap_history'));
console.table(history);

// 5. Force Timeout
const swap = history[0];
swap.timeoutAt = Date.now() - 1000;
localStorage.setItem('swap_history', JSON.stringify(history));
checkSwapTimeouts();
```

---

## 🆘 Häufige Probleme

### Problem: Swap bleibt pending

**Lösung:**
1. Warten (max. 30min)
2. Swap-Monitor prüft automatisch
3. Bei Timeout: Retry-Button erscheint

### Problem: Retry-Button fehlt

**Checkliste:**
- Status = `failed`/`timeout`/`cancelled`? ✓
- `canRetry = true`? ✓
- Details expandiert? (▶ klicken)

### Problem: Fehler unklar

**Lösung:**
1. Details expandieren (▶)
2. Error-Message lesen
3. Error-Code notieren
4. Provider-Support kontaktieren (Order-ID angeben)

---

## 📚 Weitere Docs

- [SWAP-ERROR-HANDLING.md](./SWAP-ERROR-HANDLING.md) - Vollständige Dokumentation
- [SWAP-PROVIDER-INTEGRATION.md](./SWAP-PROVIDER-INTEGRATION.md) - Provider-Integration
- [TX-MONITORING.md](./TX-MONITORING.md) - Payment-Monitoring

---

**System ist Production-Ready!** 🚀
