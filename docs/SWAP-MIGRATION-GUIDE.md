# Migration Guide: Swap Error Handling Update

## 🔄 Änderungen für bestehende Swaps

### Neue Swap-Properties

Bestehende Swaps in `localStorage` werden automatisch kompatibel behandelt, aber neue Swaps haben zusätzliche Felder:

```typescript
interface SwapOrder {
  // ✅ Bestehende Felder (unverändert)
  id: string;
  orderId: string;
  provider: string;
  depositAddress: string;
  // ... etc

  // ⭐ NEU: Erweiterte Fehlerbehandlung
  timeoutAt?: number;        // Unix timestamp (30min nach createdAt)
  lastChecked?: number;      // Letzter Status-Check
  errorMessage?: string;     // User-friendly Error
  errorCode?: string;        // Error-Code (z.B. 'TIMEOUT', 'API_ERROR')
  retryCount?: number;       // Anzahl Retry-Versuche
  canRetry?: boolean;        // Retry erlaubt?
}
```

### Status-Update

**Vorher:**
```typescript
status: string; // 'waiting', 'processing', 'complete', etc. (provider-specific)
```

**Nachher:**
```typescript
type SwapOrderStatus = 
  | 'pending'     // Wartet auf Deposit
  | 'processing'  // Wird verarbeitet
  | 'completed'   // Erfolgreich
  | 'failed'      // Fehlgeschlagen
  | 'timeout'     // Timeout (>30min)
  | 'cancelled'   // Abgebrochen
  | 'expired';    // Abgelaufen

status: SwapOrderStatus;
```

**Automatische Mapping:** Provider-Status → Standardisierter Status

```typescript
// btcswapxmr: "waiting" → "pending"
// changenow: "exchanging" → "processing"
// ghostswap: "finished" → "completed"
```

---

## 🔧 Manuelle Migration (Optional)

Falls du bestehende Swaps aktualisieren möchtest:

### Option 1: Automatische Migration beim Laden

```typescript
// lib/swap-providers/execute.ts (bereits implementiert)
function migrateSwapOrder(swap: any): SwapOrder {
  return {
    ...swap,
    timeoutAt: swap.timeoutAt || swap.createdAt + 30 * 60 * 1000,
    canRetry: swap.canRetry ?? true,
    retryCount: swap.retryCount ?? 0,
    status: mapProviderStatus(swap.status), // Normalisierung
  };
}
```

### Option 2: Manuelle Migration via Browser Console

```javascript
// Browser Console
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');

const migrated = history.map(swap => ({
  ...swap,
  timeoutAt: swap.timeoutAt || swap.createdAt + (30 * 60 * 1000),
  canRetry: swap.canRetry ?? true,
  retryCount: swap.retryCount ?? 0,
  // Status normalisieren
  status: swap.status.toLowerCase().includes('complete') ? 'completed' :
          swap.status.toLowerCase().includes('fail') ? 'failed' :
          swap.status.toLowerCase().includes('process') ? 'processing' :
          'pending',
}));

localStorage.setItem('swap_history', JSON.stringify(migrated));
console.log(`✅ ${migrated.length} swaps migrated`);
window.location.reload();
```

---

## ⚠️ Breaking Changes

### 1. Status-Typen

**Vorher:**
```typescript
if (swap.status === 'complete') { ... } // ❌ Kann brechen
```

**Nachher:**
```typescript
if (swap.status === 'completed') { ... } // ✅ Korrekt
```

**Lösung:** Status-Mapping-Funktion nutzen:

```typescript
import { mapProviderStatus } from '@/lib/swap-providers/execute';

const normalizedStatus = mapProviderStatus(swap.status);
```

### 2. Error-Handling

**Vorher:**
```typescript
try {
  await executeSwap(...);
} catch (error) {
  console.error(error); // Generic Error
}
```

**Nachher:**
```typescript
import { SwapError, parseSwapError } from '@/lib/swap-providers/errors';

try {
  await executeSwap(...);
} catch (error) {
  const swapError = parseSwapError(error);
  console.error(swapError.message); // User-friendly
  
  if (swapError.retryable) {
    // Show retry button
  }
}
```

### 3. Retry-Funktionalität

**Neu:** `retrySwap()` Funktion

```typescript
import { retrySwap } from '@/lib/swap-providers/execute';

// Vorher: Manuell neuen Swap erstellen
await executeSwap(swap.provider, swap.fromCoin, ...);

// Nachher: Retry-Funktion nutzt
await retrySwap(swap.id); // → Neuer Swap, retryCount +1
```

---

## 🧪 Kompatibilitäts-Test

### Test 1: Alte Swaps laden

```javascript
// Browser Console
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');

// Prüfe alte Swaps (ohne neue Felder)
const oldSwaps = history.filter(s => !s.timeoutAt);
console.log(`${oldSwaps.length} alte Swaps gefunden`);

// Werden automatisch kompatibel behandelt:
// - timeoutAt wird beim Timeout-Check berechnet
// - canRetry defaults zu true
// - retryCount defaults zu 0
```

### Test 2: Status-Mapping

```javascript
// Browser Console
const { mapProviderStatus } = await import('@/lib/swap-providers/execute');

// Teste verschiedene Provider-Status
console.log(mapProviderStatus('waiting'));    // → 'pending'
console.log(mapProviderStatus('exchanging')); // → 'processing'
console.log(mapProviderStatus('complete'));   // → 'completed'
console.log(mapProviderStatus('failed'));     // → 'failed'
```

### Test 3: Timeout-Check

```javascript
// Browser Console
const { checkSwapTimeouts } = await import('@/lib/swap-providers/execute');

// Alte Swaps (>30 Tage) werden als 'timeout' markiert
const count = checkSwapTimeouts();
console.log(`${count} swaps timed out`);
```

---

## 📊 Daten-Migration-Statistik

Nach Update kannst du diese Stats prüfen:

```javascript
// Browser Console
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');

const stats = {
  total: history.length,
  withTimeout: history.filter(s => s.timeoutAt).length,
  withRetryCount: history.filter(s => s.retryCount > 0).length,
  withErrors: history.filter(s => s.errorMessage).length,
  byStatus: history.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {}),
};

console.table(stats);
```

**Erwartete Ausgabe:**
```
total: 10
withTimeout: 10 (nach Migration)
withRetryCount: 0-3 (je nach Retries)
withErrors: 2-3 (failed/timeout Swaps)
byStatus: {
  pending: 2,
  processing: 1,
  completed: 5,
  failed: 1,
  timeout: 1
}
```

---

## 🔍 Probleme & Lösungen

### Problem: Alte Swaps zeigen "undefined" Status

**Ursache:** Status-Normalisierung fehlt

**Lösung:**
```javascript
// Migration ausführen (siehe Option 2 oben)
// Oder: checkSwapTimeouts() triggern
const { checkSwapTimeouts } = await import('@/lib/swap-providers/execute');
checkSwapTimeouts();
```

### Problem: Retry-Button fehlt bei alten Failed-Swaps

**Ursache:** `canRetry` Flag fehlt

**Lösung:**
```javascript
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');
history.forEach(swap => {
  if (['failed', 'timeout'].includes(swap.status) && swap.canRetry === undefined) {
    swap.canRetry = true;
  }
});
localStorage.setItem('swap_history', JSON.stringify(history));
window.location.reload();
```

### Problem: Swaps haben keine Timeout-Zeit

**Ursache:** `timeoutAt` fehlt bei alten Swaps

**Lösung:** Wird automatisch beim nächsten Timeout-Check berechnet. Oder manuell:

```javascript
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');
history.forEach(swap => {
  if (!swap.timeoutAt) {
    swap.timeoutAt = swap.createdAt + (30 * 60 * 1000); // 30min
  }
});
localStorage.setItem('swap_history', JSON.stringify(history));
```

---

## ✅ Validierung nach Migration

### Checkliste:

- [ ] Alle Swaps haben `timeoutAt` Feld
- [ ] Status sind normalisiert (`pending`, `completed`, etc.)
- [ ] Failed/Timeout Swaps haben `canRetry: true`
- [ ] Retry-Button erscheint bei failed/timeout Swaps
- [ ] Error-Messages werden korrekt angezeigt
- [ ] Timeout-Check läuft automatisch (alle 2min)

### Test-Script:

```javascript
// Browser Console
const history = JSON.parse(localStorage.getItem('swap_history') || '[]');

const validation = {
  hasTimeoutAt: history.every(s => s.timeoutAt),
  hasNormalizedStatus: history.every(s => 
    ['pending', 'processing', 'completed', 'failed', 'timeout', 'cancelled', 'expired'].includes(s.status)
  ),
  failedHaveRetry: history
    .filter(s => ['failed', 'timeout'].includes(s.status))
    .every(s => s.canRetry === true),
};

console.table(validation);

// Alle sollten 'true' sein ✅
```

---

## 🆘 Support

Falls nach Migration Probleme auftreten:

1. **Backup erstellen:**
   ```javascript
   const backup = localStorage.getItem('swap_history');
   localStorage.setItem('swap_history_backup', backup);
   ```

2. **Error-Logs prüfen:**
   ```javascript
   import { getErrorLogs } from '@/lib/swap-providers/errors';
   console.table(getErrorLogs());
   ```

3. **Im Notfall: History zurücksetzen**
   ```javascript
   // WARNUNG: Löscht alle Swaps!
   localStorage.removeItem('swap_history');
   window.location.reload();
   ```

---

**Migration ist vollständig abwärtskompatibel!** Alte Swaps funktionieren weiterhin. 🚀
