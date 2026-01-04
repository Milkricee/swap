# TX-Monitoring Quick Start

Schnellstart-Guide zur Nutzung des Transaction-Monitoring-Systems.

## 🚀 In 3 Schritten zum Live-Monitoring

### Schritt 1: Payment senden (bereits implementiert)

Payments werden automatisch mit Status `pending` gespeichert:

```typescript
// app/api/pay/route.ts - BEREITS FERTIG ✅
savePaymentToHistory({
  id: `payment-${Date.now()}`,
  timestamp: Date.now(),
  amount: exactAmount.toString(),
  recipient: shopAddress,
  status: 'pending', // ← Startet als pending
  txHash: txId,      // ← Wichtig: TX-Hash speichern!
  fromWallet: 3,
  fee: '0.000001',
});
```

### Schritt 2: Auto-Monitor aktivieren (bereits implementiert)

Die TransactionHistory-Komponente überwacht automatisch alle pending Payments:

```tsx
// components/TransactionHistory.tsx - BEREITS FERTIG ✅
const monitor = useTxMonitor({
  enabled: true,
  interval: 60_000, // Alle 60 Sekunden
  onUpdate: () => {
    loadTransactions(); // UI refresh bei Updates
  },
});
```

### Schritt 3: Fertig! 🎉

Das war's - das System läuft automatisch. Sobald ein Payment gesendet wird:

1. **0 Sekunden**: Payment erscheint als "pending ⏳" in der History
2. **5 Sekunden**: Erster automatischer Status-Check
3. **Alle 60s**: Wiederholte Checks bis confirmed
4. **Nach 10+ Confirmations**: Status → "confirmed ✓" (grün)

---

## 📱 UI Features

### Automatische Status-Anzeige

Die Komponente zeigt automatisch:

```tsx
{/* Status-Banner für pending Payments */}
{monitor.pendingCount > 0 && (
  <div className="bg-amber-500/10 ...">
    ⏳ {monitor.pendingCount} payment(s) pending confirmation
  </div>
)}
```

### Manuelle Refresh-Buttons

**Bulk-Refresh (alle Payments):**
```tsx
<button onClick={monitor.refresh}>
  🔄 Check Status
</button>
```

**Per-Transaction Refresh:**
```tsx
{/* In TransactionRow.tsx - zeigt 🔄 nur bei pending */}
{status === 'pending' && txHash && (
  <RefreshButton txHash={txHash} />
)}
```

### Expandable TX-Details

```tsx
{/* Klick auf ▶ zeigt Details */}
<button onClick={() => setShowDetails(!showDetails)}>
  {showDetails ? '▼' : '▶'}
</button>

{showDetails && (
  <StatusDisplay txHash={txHash} />
  // → Zeigt: Confirmations, Block Height, Mempool Status
)}
```

---

## 🔧 Konfiguration

### Polling-Intervall ändern

Standardmäßig alle **60 Sekunden**. Zum Ändern:

```tsx
// components/TransactionHistory.tsx
const monitor = useTxMonitor({
  enabled: true,
  interval: 120_000, // ← 2 Minuten statt 60s
});
```

### Confirmations-Schwellwert anpassen

Standard: **10 Confirmations** (Monero Best Practice)

```typescript
// lib/monitoring/tx-monitor.ts
const MIN_CONFIRMATIONS = 10; // ← Hier ändern
```

Werte:
- `1`: Sehr unsicher (Blockchain Reorgs möglich)
- `10`: Standard Monero (empfohlen)
- `20`: Extra sicher für große Beträge

### Remote Node URL

```bash
# .env.local
NEXT_PUBLIC_MONERO_RPC_URL=https://xmr-node.cakewallet.com:18081

# Alternativen:
# https://node.moneroworld.com:18089
# https://node.sethforprivacy.com:18089
```

---

## 🧪 Testing

### Lokales Testing (ohne echte TXs)

```typescript
// Test-Payment mit simuliertem TX-Hash
savePaymentToHistory({
  id: `test-${Date.now()}`,
  timestamp: Date.now(),
  amount: '1.234567890123',
  recipient: '4ABC...XYZ',
  status: 'pending',
  txHash: 'a'.repeat(64), // ← Dummy TX-Hash (wird not_found sein)
  fromWallet: 3,
  fee: '0.000001',
});

// Nach 60s: Monitor versucht TX zu finden → not_found → bleibt pending
// (Echte TXs würden confirmed werden)
```

### API-Testing mit cURL

```bash
# Single TX Status
curl "http://localhost:3000/api/tx-status?txHash=abc123...def"

# Bulk Monitoring
curl -X POST http://localhost:3000/api/tx-status \
  -H "Content-Type: application/json" \
  -d '{"mode": "bulk"}'
```

### Console-Logs beobachten

Development-Mode zeigt alle Monitoring-Aktivitäten:

```javascript
📡 Monitoring 3 pending payments...
✅ Payment payment-1704380400000 confirmed (12 confirmations)
📊 Monitoring complete: 1 updated, 0 failed, 0 errors
```

---

## 📊 Status-Anzeige

### Status-Badges (automatisch)

| Status | Badge | Farbe | Icon |
|--------|-------|-------|------|
| `pending` | ⏳ pending | Gelb | ⏳ |
| `confirmed` | ✓ confirmed | Grün | ✓ |
| `failed` | ✗ failed | Rot | ✗ |

### Confirmations-Display

```tsx
<StatusDisplay txHash={txHash} />
```

Zeigt:
- ✅ Blockchain Status: `confirmed`
- 🔢 Confirmations: `12`
- 📦 Block: `2950000`
- ⏳ In mempool (unconfirmed) ← wenn noch im TX-Pool

---

## 🐛 Debugging

### Problem: Status bleibt pending

**Checkliste:**
1. Console öffnen → `localStorage.getItem('payment_history')`
2. TX-Hash vorhanden? → Sollte 64 hex chars sein
3. Node erreichbar? → `curl https://xmr-node.cakewallet.com:18081/json_rpc`
4. Rate Limit? → Max. 10 Requests/Min

**Manueller Check:**
```javascript
// Browser Console
fetch('/api/tx-status?txHash=YOUR_TX_HASH')
  .then(r => r.json())
  .then(console.log);
```

### Problem: Monitor läuft nicht

**Checkliste:**
1. `useTxMonitor` Hook in `TransactionHistory.tsx` aktiv?
2. `enabled: true` gesetzt?
3. Browser-Console → Errors?
4. localStorage → `tx_monitor_last_run` vorhanden?

**Force Restart:**
```javascript
// Browser Console
localStorage.removeItem('tx_monitor_last_run');
window.location.reload();
```

---

## ⚡ Performance-Tipps

### Viele pending Payments (>10)

```typescript
// lib/monitoring/tx-monitor.ts
// Erhöhe Concurrent-Limit
await monitorPendingPayments(5); // ← Standard: 3
```

### Node Response langsam

```typescript
// Timeout für RPC-Requests setzen
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000); // 10s Timeout

fetch(rpcUrl, { signal: controller.signal });
```

---

## 🎯 Best Practices

### ✅ DO

- Payments IMMER mit TX-Hash speichern
- Status als `pending` starten lassen
- Monitor laufen lassen (nicht manuell deaktivieren)
- Rate Limiting respektieren (60s Intervall OK)

### ❌ DON'T

- Keine Status-Updates außerhalb des Monitors
- Kein Polling unter 30s (belastet Node)
- Keine manuellen localStorage-Edits
- Confirmed → Pending Transitions vermeiden

---

## 📚 Weitere Ressourcen

- [TX-MONITORING.md](./TX-MONITORING.md) - Vollständige Dokumentation
- [PAYMENT-TEST.md](./PAYMENT-TEST.md) - Payment-Testing-Guide
- Monero RPC Docs: https://www.getmonero.org/resources/developer-guides/daemon-rpc.html

---

## 🆘 Support

Bei Problemen:
1. Console-Logs prüfen (`NODE_ENV=development`)
2. [TX-MONITORING.md Troubleshooting](./TX-MONITORING.md#-troubleshooting) lesen
3. TX-Hash auf xmrchain.net validieren: `https://xmrchain.net/search?value=TX_HASH`

**System ist Production-Ready!** 🚀
