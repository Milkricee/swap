# Transaction Monitoring System

Robustes Monero Transaction-Monitoring für die XMR Swap & Payment App.

## 📋 Übersicht

Das TX-Monitoring-System überwacht gesendete Monero-Transaktionen automatisch und aktualisiert deren Status in Echtzeit:

- **Automatisches Polling**: Alle 60 Sekunden werden pending Payments überprüft
- **Manuelles Refresh**: Button zum sofortigen Status-Check pro Transaction
- **Blockchain-Integration**: Direkte Abfrage über Monero Remote Node (RPC)
- **Status-Updates**: `pending` → `confirmed` / `failed`
- **Rate Limiting**: Max. 10 API-Requests pro Minute

---

## 🏗️ Architektur

### 3-Schichten-Design

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (Client)                                          │
│  - TransactionHistory.tsx (Live-Updates)                    │
│  - TransactionRow.tsx (Status-Badges, Refresh-Button)       │
│  - useTxMonitor.ts Hook (Auto-Polling alle 60s)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│  API Layer (Server)                                         │
│  - /api/tx-status?txHash=... (GET: Single TX)               │
│  - /api/tx-status (POST: Bulk monitoring)                   │
│  - Rate Limiting: 10 req/min                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Business Logic                                             │
│  - lib/monitoring/tx-monitor.ts (Kern-Logik)                │
│  - lib/wallets/monero-core.ts (Blockchain RPC)              │
│  - lib/payment/history.ts (Status-Updates)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ JSON-RPC
┌──────────────────────────▼──────────────────────────────────┐
│  Monero Blockchain                                          │
│  - xmr-node.cakewallet.com:18081                            │
│  - get_transactions / get_transaction_pool                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

### ✅ Automatisches Monitoring

- Startet automatisch beim Laden der Transaction-History
- Prüft alle `pending` Payments mit TX-Hash alle 60 Sekunden
- Aktualisiert Payment-Status in localStorage
- Zeigt Live-Notification bei Status-Änderungen

### 🔄 Manuelles Refresh

- **Bulk-Refresh**: Button "Check Status" prüft ALLE pending Payments
- **Single-TX-Refresh**: Pro Payment ein 🔄-Button (nur bei `pending`)
- Erweiterte Details: Klick auf ▶ zeigt TX-Hash, Confirmations, Block Height

### 📊 Status-Logik

| Blockchain-Status | Confirmations | App-Status | Erklärung |
|-------------------|---------------|------------|-----------|
| In TX Pool        | 0             | `pending`  | Unconfirmed, im Mempool |
| In Block          | 1-9           | `pending`  | Weniger als 10 Confirmations |
| In Block          | ≥10           | `confirmed` | Finalisiert (Monero Standard) |
| Not Found         | -             | `failed`   | TX nicht auf Blockchain (nach 30 Tagen) |

**MIN_CONFIRMATIONS = 10** (Monero-Standard für sichere Bestätigung)

---

## 📁 Dateien

### Kern-Module

| Datei | Beschreibung |
|-------|-------------|
| `lib/monitoring/tx-monitor.ts` | Monitoring-Logik, Status-Mapping, Batch-Verarbeitung |
| `lib/wallets/monero-core.ts` | `getMoneroTxStatus()` - Blockchain RPC Queries |
| `lib/hooks/useTxMonitor.ts` | React Hook für Auto-Polling + Manual Refresh |
| `app/api/tx-status/route.ts` | REST API mit Rate Limiting (GET/POST) |

### UI-Komponenten

| Datei | Änderung |
|-------|----------|
| `components/TransactionHistory.tsx` | + Auto-Monitor Integration, + Bulk-Refresh-Button, + Status-Info-Banner |
| `components/TransactionRow.tsx` | + Status-Badges, + Expandable Details, + Per-TX Refresh-Button |

### Storage

| Datei | Änderung |
|-------|----------|
| `lib/payment/history.ts` | + `bulkUpdatePaymentStatus()`, Status-Transition-Validierung |

---

## 🛠️ Nutzung

### 1. Payment senden

```typescript
// Payments werden automatisch als "pending" gespeichert
const result = await executePayment(shopAddress, 2.5, password);
// TX-Hash wird in PaymentRecord gespeichert mit status: 'pending'
```

### 2. Automatisches Monitoring (Standard)

```tsx
// In TransactionHistory.tsx bereits integriert
const monitor = useTxMonitor({
  enabled: true,           // Auto-Polling aktiviert
  interval: 60_000,        // Alle 60 Sekunden
  onUpdate: () => {
    loadTransactions();    // UI neu laden bei Updates
  },
});
```

**Output im Console:**
```
📡 Monitoring 3 pending payments...
✅ Payment payment-123 confirmed (12 confirmations)
📊 Monitoring complete: 1 updated, 0 failed, 0 errors
```

### 3. Manuelles Refresh

#### Bulk-Check (alle pending Payments)

```tsx
<button onClick={monitor.refresh}>
  🔄 Check Status
</button>
```

#### Single-TX-Check (pro Payment)

```tsx
// In TransactionRow.tsx
const { data, loading, refresh } = useSingleTxStatus(txHash);
<button onClick={refresh}>🔄</button>
```

**API-Request:**
```bash
# Single TX
GET /api/tx-status?txHash=abc123...

# Bulk
POST /api/tx-status
{"mode": "bulk"}
```

---

## 🔐 Sicherheit

### Rate Limiting

```typescript
// In-Memory Store (Server-Side)
const RATE_LIMIT_WINDOW = 60_000; // 1 Minute
const MAX_REQUESTS = 10;          // Max 10 Requests
```

**Headers:**
```http
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 60000
```

**429 Response:**
```json
{
  "error": "Rate limit exceeded. Try again later."
}
```

### Status-Transition-Validierung

```typescript
// In bulkUpdatePaymentStatus()
if (currentStatus === 'confirmed' && newStatus === 'pending') {
  // ❌ NICHT erlaubt: Confirmed → Pending
  return;
}
// ✅ Erlaubt: pending → confirmed, pending → failed
```

---

## 🧪 Testing

### Lokaler Test (Development)

```bash
# 1. Payment senden (mit TESTNET!)
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{
    "shopAddress": "4ABC...XYZ",
    "exactAmount": 0.1,
    "password": "your-password"
  }'

# Response:
{
  "status": {
    "stage": "completed",
    "txId": "abc123...def"
  }
}

# 2. TX-Status prüfen
curl "http://localhost:3000/api/tx-status?txHash=abc123...def"

# Response:
{
  "txHash": "abc123...def",
  "status": "pending",
  "confirmations": 3,
  "inTxPool": false,
  "blockHeight": 2950000
}

# 3. Bulk-Monitor testen
curl -X POST http://localhost:3000/api/tx-status \
  -H "Content-Type: application/json" \
  -d '{"mode": "bulk"}'

# Response:
{
  "updated": 1,
  "failed": 0,
  "results": [
    {
      "paymentId": "payment-123",
      "txHash": "abc...",
      "oldStatus": "pending",
      "newStatus": "confirmed",
      "confirmations": 12
    }
  ]
}
```

### UI Testing Checklist

- [ ] Payment senden → Erscheint sofort als `pending` in History
- [ ] Nach 5 Sekunden: Auto-Monitor startet ersten Check
- [ ] Status-Banner zeigt "X payments pending confirmation"
- [ ] Klick auf ▶ zeigt TX-Hash + Confirmations
- [ ] Klick auf 🔄 (Single) aktualisiert einzelnen TX
- [ ] Klick auf "Check Status" (Bulk) aktualisiert alle
- [ ] Nach 10+ Confirmations: Status wechselt zu `confirmed` (grün)
- [ ] Alte TXs (>30 Tage) werden als `failed` markiert

---

## 📊 Monitoring-Statistiken

```typescript
import { getMonitoringStats } from '@/lib/monitoring/tx-monitor';

const stats = getMonitoringStats();
console.log(stats);
```

**Output:**
```json
{
  "totalPayments": 15,
  "pendingCount": 3,
  "pendingWithTxCount": 3,
  "confirmedCount": 10,
  "failedCount": 2,
  "lastMonitorRun": "2026-01-04T14:32:00.000Z"
}
```

---

## ⚙️ Konfiguration

### Umgebungsvariablen

```bash
# .env.local
NEXT_PUBLIC_MONERO_RPC_URL=https://xmr-node.cakewallet.com:18081
NEXT_PUBLIC_MONERO_NETWORK=mainnet  # mainnet | testnet | stagenet
```

### Polling-Intervall anpassen

```tsx
// components/TransactionHistory.tsx
const monitor = useTxMonitor({
  enabled: true,
  interval: 120_000, // ← 120 Sekunden (2 Minuten)
});
```

### Min-Confirmations ändern

```typescript
// lib/monitoring/tx-monitor.ts
const MIN_CONFIRMATIONS = 10; // ← Monero-Standard
```

---

## 🐛 Troubleshooting

### Problem: "Transaction not found on blockchain"

**Ursache:** TX noch nicht im Mempool oder Node hat TX noch nicht empfangen

**Lösung:**
1. Warten 30-60 Sekunden, dann erneut prüfen
2. TX-Hash auf xmrchain.net validieren
3. Anderen Remote Node probieren (z.B. node.moneroworld.com)

### Problem: "Rate limit exceeded"

**Ursache:** Mehr als 10 API-Requests in 60 Sekunden

**Lösung:**
1. Warten bis Rate-Limit zurückgesetzt wird
2. Polling-Intervall erhöhen (z.B. 120s)
3. Bulk-Monitoring nutzen statt viele Single-Requests

### Problem: Status bleibt ewig auf "pending"

**Ursache:** Monero-Node offline oder TX wirklich failed

**Lösung:**
1. Console-Logs prüfen: `Failed to get TX status for ...`
2. Node-URL testen: `curl https://xmr-node.cakewallet.com:18081/json_rpc`
3. Nach 30 Tagen automatisch als `failed` markiert

---

## 🔄 Workflow-Diagramm

```
┌────────────────────────────────────────────────────────────┐
│ 1. User sendet Payment                                     │
│    → POST /api/pay                                         │
│    → savePaymentToHistory(status: 'pending', txHash)       │
└────────────────┬───────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────┐
│ 2. TX wird auf Blockchain gebroadcastet                    │
│    → sendMonero() → TX-Hash zurück                         │
└────────────────┬───────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────┐
│ 3. Auto-Monitor startet (nach 5s)                          │
│    → useTxMonitor Hook                                     │
│    → Alle 60s: POST /api/tx-status (bulk)                  │
└────────────────┬───────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────┐
│ 4. API checkt Blockchain                                   │
│    → getMoneroTxStatus(txHash)                             │
│    → JSON-RPC: get_transactions                            │
│    → Confirmations abfragen                                │
└────────────────┬───────────────────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │ Confirmations?     │
       └─────────┬─────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼────┐
│ 0-9   │   │ ≥10   │   │ Error  │
│pending│   │confirm│   │pending │
└───┬───┘   └───┬───┘   └───┬────┘
    │           │           │
    └───────────┴───────────┘
                │
┌───────────────▼────────────────────────────────────────────┐
│ 5. Status-Update                                           │
│    → updatePaymentStatus(id, newStatus)                    │
│    → localStorage aktualisiert                             │
│    → onUpdate() → UI reload                                │
└────────────────────────────────────────────────────────────┘
```

---

## 📚 API-Referenz

### GET /api/tx-status

**Query Params:**
- `txHash` (string, 64 hex chars) - Transaction Hash

**Response:**
```typescript
{
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  confirmations: number;
  blockHeight?: number;
  inTxPool?: boolean;
  error?: string;
}
```

### POST /api/tx-status

**Body:**
```json
{"mode": "bulk"}
```

**Response:**
```typescript
{
  success: true;
  updated: number;
  failed: number;
  results: Array<{
    paymentId: string;
    txHash: string;
    oldStatus: string;
    newStatus: string;
    confirmations: number;
  }>;
  errors: Array<{
    paymentId: string;
    txHash: string;
    error: string;
  }>;
}
```

---

## 🎯 Performance

### Batch-Verarbeitung

```typescript
// Max 3 concurrent RPC requests
await monitorPendingPayments(3);

// Bei 10 pending TXs:
// → 3 parallel, dann 3, dann 3, dann 1
// → Total: ~4-5 Sekunden (statt 10s sequenziell)
```

### Caching & Throttling

```typescript
// Verhindert zu häufige Checks
function shouldRunMonitoring(): boolean {
  const lastRun = localStorage.getItem('tx_monitor_last_run');
  return (Date.now() - lastRun) > 60_000; // Min. 60s Pause
}
```

---

## 🚨 Edge Cases

| Szenario | Verhalten |
|----------|-----------|
| Node offline | Status bleibt `pending`, Error in Console, kein `failed` |
| TX Double-Spend | Node rejected → `not_found` → `failed` |
| TX älter als 30 Tage | Auto-Markierung als `failed` |
| Blockchain Reorg | Confirmations können sinken → bleibt `pending` |
| User löscht History | TX-Monitor findet keine pending → nichts passiert |

---

## ✅ Zusammenfassung

Das Transaction-Monitoring-System bietet:

✅ **Automatisch**: Polling alle 60s ohne User-Interaktion  
✅ **On-Demand**: Manueller Refresh per Button  
✅ **Robust**: Fehlerbehandlung, Rate Limiting, Timeout-Schutz  
✅ **Transparent**: Live-Status in UI, Expandable Details  
✅ **Skalierbar**: Batch-Processing für viele TXs  
✅ **Sicher**: Keine Private Keys, nur Public TX-Hashes  

**Nächste Schritte:**
- Push-Notifications bei Status-Change (Web Push API)
- Webhook-Support für externe Shop-Systeme
- Multi-Node-Fallback (wenn Node down)
- TX-Fee-Tracking (genaue Fee aus Blockchain lesen)
