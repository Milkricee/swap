# TX Status Verification - User Guide

## 📊 Übersicht

Jede Transaktion (Swap & Payment) in der History verfügt über **manuelle Status-Prüfung** und **Block Explorer Links** zur Verifikation auf der Monero-Blockchain.

---

## 🎨 UI-Komponenten

### 1. Status Badges (Color-Coded)

Jede Transaktion zeigt einen visuellen Status-Badge:

```
✅ confirmed   → Grün    (10+ Confirmations)
⏳ pending     → Gelb    (< 10 Confirmations)  
❌ failed      → Rot     (Error/Timeout)
```

**Tooltip**: Bewege Maus über Badge für "Last checked: <Zeit>"

---

### 2. TX Hash Explorer Links

Klicke auf den TX Hash um die Transaktion im Block Explorer zu öffnen:

**Standard Explorer**: XMRChain.net  
**Alternative**: LocalMonero, MoneroScan (konfigurierbar)

```tsx
// Beispiel-Link
https://xmrchain.net/tx/a3f5b2...c9d8e1
```

**Features**:
- 🔗 Direkter Link mit "Open in new tab" Icon
- 📋 Copy-Button für TX Hash
- ✨ Hover-Effekt mit Underline

---

### 3. "Check Status" Button

**Wo**: Neben jeder pending Transaktion  
**Funktion**: Manuelle Blockchain-Abfrage

#### Ablauf:
1. User klickt "🔄 Check Status"
2. API-Call zu `/api/tx-status?txHash=...`
3. Blockchain-Abfrage über Monero-Node
4. Alert mit Ergebnis:
   - ✅ "Transaction confirmed! 12 confirmations"
   - ⏳ "In mempool (unconfirmed). 3 confirmations"
   - ℹ️ "Status: pending. 0/10 confirmations"

#### UI States:
```tsx
[🔄 Check Status]        // Default (idle)
[⚙️ Checking...]         // Loading (spinner)
[🔄 Check Status]        // After check (tooltip: "Last checked: 14:30")
```

---

## 🔍 Transaction Details View

Click "▶" neben jeder Transaktion für erweiterte Details:

### Payment Details:
```
┌─────────────────────────────────────┐
│ TX Hash: a3f5...c9d8 [🔗] [📋]     │  ← Link + Copy
│ Network Fee: 0.000012 XMR           │
│ From Wallet: Wallet #3 (Hot)        │
│ Recipient: 4Adk...5h7y              │
│                                     │
│ 🔍 Manual Verification              │
│ 1. Click TX hash → XMRChain.net     │
│ 2. Check confirmations (10+ = ✅)   │
│ 3. Verify recipient address matches │
│ Status updates automatically @60s   │
└─────────────────────────────────────┘
```

### Swap Details:
```
┌─────────────────────────────────────┐
│ Order ID: btcswap-123456            │
│ Deposit Address: 8vN...k9s          │
│ Deposit Amount: 0.001 BTC           │
│ Expected: 0.5 XMR                   │
│                                     │
│ ⏰ Swap Timed Out                   │
│ No deposit detected within 30min    │
│ Retry or contact btcswapxmr        │
└─────────────────────────────────────┘
```

---

## ⚙️ Konfiguration

### Explorer wechseln (zukünftig)

Aktuell: **XMRChain.net** (hardcoded via `lib/utils/explorer.ts`)

**Verfügbare Explorer**:
- `xmrchain` - XMRChain.net (Standard)
- `localmonero` - LocalMonero Explorer
- `moneroscan` - MoneroScan.io

```typescript
// lib/utils/explorer.ts
export const DEFAULT_EXPLORER = 'xmrchain'; // ← Change here
```

---

## 🔄 Auto-Monitoring vs. Manual Check

### Auto-Monitoring (Hintergrund)
- **Interval**: Alle 60 Sekunden
- **Scope**: Alle pending Payments
- **UI Update**: Badge-Farbe ändert sich automatisch
- **Implementation**: `useTxMonitor()` Hook in TransactionHistory

### Manual Check (User-Triggered)
- **Trigger**: "🔄 Check Status" Button
- **Feedback**: Alert-Dialog mit Ergebnis
- **Use Case**: User möchte sofort prüfen statt 60s warten

**Empfehlung**: Lass Auto-Monitoring laufen, nutze Manual nur bei Bedarf.

---

## 🎯 User Workflows

### Workflow 1: Payment gesendet, Status prüfen
```
1. Payment senden → "✅ Sent! 2.45372 XMR"
2. TX erscheint in History mit [⏳ pending]
3. Warten (Auto-Monitor läuft)
   ODER: Klick "🔄 Check Status" für sofortige Prüfung
4. Nach 10 Confirmations → Badge wird [✅ confirmed]
```

### Workflow 2: Payment in Block Explorer verifizieren
```
1. Click "▶" neben Payment → Details öffnen
2. Click TX Hash Link (a3f5...c9d8)
3. XMRChain.net öffnet in neuem Tab
4. Prüfe:
   - Confirmations: 12 (> 10 = confirmed ✅)
   - Recipient Address: 4Adk... (stimmt ✅)
   - Amount: 2.45372 XMR (stimmt ✅)
5. Close Tab → Zurück zur App
```

### Workflow 3: Swap timed out, manuell prüfen
```
1. Swap zeigt [⏰ timeout] nach 30min
2. Click "🔄 Retry" ODER check Explorer
3. If Explorer zeigt Deposit → Contact Provider Support
   If no Deposit → Safe to Retry
```

---

## 🛡️ Sicherheits-Hinweise

### TX Hash Verification
```
✅ DO:
- Vergleiche TX Hash im Explorer mit App
- Prüfe Recipient Address genau
- Warte auf 10+ Confirmations für Finality

❌ DON'T:
- Trust Status-Badge allein (kann delayed sein)
- Send to unverified addresses
- Panic bei < 10 Confirmations (normal!)
```

### Blockchain Delays
```
Normal: 2-10 Minutes für 1. Confirmation
Slow Network: Bis 30 Minutes möglich
Stuck TX: > 1 Stunde → Contact Support
```

---

## 🔧 Technical Details

### API Endpoint
```typescript
GET /api/tx-status?txHash=a3f5b2...c9d8e1

Response:
{
  "status": "confirmed" | "pending" | "failed",
  "confirmations": 12,
  "blockHeight": 3234567,
  "inTxPool": false
}
```

### Status Logic
```typescript
if (confirmations >= 10) {
  status = 'confirmed'; // ✅ Green Badge
} else if (inTxPool || confirmations > 0) {
  status = 'pending';   // ⏳ Yellow Badge
} else {
  status = 'unknown';   // ⚠️ Gray Badge
}
```

### Rate Limiting
```
Max 10 manual checks per minute (per IP)
Auto-monitoring: No limit (server-side batching)
```

---

## 📊 Status Badge Color Reference

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| **confirmed** | 🟢 Green | ✅ | 10+ confirmations, finalized |
| **pending** | 🟡 Yellow | ⏳ | In mempool or < 10 confirmations |
| **processing** | 🔵 Blue | ⚙️ | Swap in progress (deposit detected) |
| **failed** | 🔴 Red | ❌ | TX failed or swap cancelled |
| **timeout** | 🟠 Orange | ⏰ | Swap timeout (30min no deposit) |
| **cancelled** | ⚪ Gray | ⊘ | User cancelled swap |

---

## 🐛 Troubleshooting

### Problem: "Check Status" zeigt immer "pending"
```
Lösung:
1. Check Explorer manuell (TX Hash Link)
2. If Explorer zeigt > 10 confirms:
   → Wait 60s for auto-update
   → Reload page (F5)
3. If still pending: Clear localStorage (Nuclear Option)
```

### Problem: TX Hash Link öffnet 404
```
Ursache: TX noch nicht im Mempool propagiert
Lösung: Warte 1-2 Minuten, retry Link
```

### Problem: Alert zeigt "Failed to check status"
```
Ursachen:
- Rate Limit (10/min exceeded)
- Monero Node offline
- Network error

Lösung:
1. Warte 1 Minute
2. Retry "Check Status"
3. Falls weiterhin Error: Nutze Explorer direkt
```

---

## 🔮 Geplante Features (Future)

### V2 Enhancements
- [ ] **Explorer-Auswahl**: User kann Explorer per Dropdown wechseln
- [ ] **Push Notifications**: Browser-Notification bei Confirmation
- [ ] **QR-Code**: TX Hash als QR für Mobile-Explorer
- [ ] **History Export**: CSV mit allen TX Hashes & Explorer-Links
- [ ] **Advanced Mode**: Zeige Block Height, TX Size, Ring Size

### V3 Features
- [ ] **Mempool Monitor**: Visualize TX position in mempool
- [ ] **Fee Tracker**: Estimated time to confirmation based on fee
- [ ] **Multi-Explorer**: Check TX in 3 explorers parallel
- [ ] **Privacy Score**: Analyze TX privacy (ring signatures, etc.)

---

## 📝 Developer Notes

### File Structure
```
components/
  TransactionRow.tsx       # Status badges, explorer links, manual check
  TransactionHistory.tsx   # Auto-monitoring integration

lib/
  utils/
    explorer.ts            # Explorer URL generation
  monitoring/
    tx-monitor.ts          # Background TX status checks
  hooks/
    useTxMonitor.ts        # React hook for auto-updates

app/api/
  tx-status/route.ts       # API endpoint for manual checks
```

### Adding New Explorer
```typescript
// lib/utils/explorer.ts
export const MONERO_EXPLORERS = {
  // ... existing
  myexplorer: {
    name: 'My Explorer',
    baseUrl: 'https://myexplorer.io',
    txPath: '/transaction/',
  },
};

export const DEFAULT_EXPLORER = 'myexplorer'; // Use new explorer
```

### Custom Status Icons
```typescript
// components/TransactionRow.tsx
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'custom_status':
      return '🎯'; // Your custom icon
    // ...
  }
};
```

---

**Last Updated**: 2024 (Manual TX Verification Enhancement)  
**Related Docs**: TX-MONITORING.md, PAYMENT-TEST.md  
**Support**: Check GitHub Issues for known problems
