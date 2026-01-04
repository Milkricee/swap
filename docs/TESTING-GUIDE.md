# XMR Swap App - Testing Guide
**Test Session für Phase A + B Features**

## 🚀 Vorbereitung

### Server starten
```bash
npm run dev
```
✅ Erwartete Ausgabe:
```
▲ Next.js 16.1.1 (Turbopack)
- Local: http://localhost:3000
✓ Ready in 3.1s
```

### Browser öffnen
1. Navigiere zu: **http://localhost:3000**
2. DevTools öffnen: **F12** oder **Strg+Shift+I**
3. Wechsel zu **Console** Tab

---

## 📋 Test-Szenarien

### Test 1: Wallet Creation mit Toast Notifications ✨

**Feature:** Phase A - Toast Notifications statt alert()

#### Schritte:
1. **Finde "Create Wallets" Button**
   - Position: Im Wallet-View-Bereich (oben)
   - Farbe: Grüner Button mit "Create 5 Wallets" Text

2. **Klicke auf "Create Wallets"**
   - Modal öffnet sich: "Wallet Setup"

3. **Passwort eingeben**
   - Eingabe: `TestPassword123!`
   - Wiederholung: `TestPassword123!`

4. **"Generate Wallets" klicken**

#### ✅ Erwartetes Ergebnis:
- **Toast Notification erscheint:**
  - Position: Oben rechts
  - Farbe: Grün mit Checkmark
  - Text: "Wallets Created Successfully!"
  - Auto-Dismiss nach 5 Sekunden
  
- **KEIN** `alert()` oder Browser-Popup
- **Seed Backup Modal** öffnet sich automatisch

#### 📸 Was du sehen solltest:
```
┌─────────────────────────────────────┐
│ ✅ Wallets Created Successfully!    │  <- Toast (grün, animiert)
│    5 wallets generated              │
└─────────────────────────────────────┘

[Modal]
Backup Your Seed Phrase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
word1 word2 word3 word4 ...
[Download Backup] [I've Saved It]
```

---

### Test 2: Swap Quote mit Lazy Loading 🔄

**Feature:** Phase B - Code-Splitting & Dynamic Imports

#### Schritte:
1. **Network Tab öffnen (F12 → Network)**
   - Filter auf "JS" setzen

2. **Scrolle zu "Swap to XMR" Section**

3. **Beobachte Network Tab**

#### ✅ Erwartetes Ergebnis:
- **SwapCard Component lädt dynamisch:**
  - Neue JS-Chunks erscheinen im Network Tab
  - z.B. `SwapCard.chunk.js`, `html5-qrcode.chunk.js`
  
- **Kurze Loader-Animation:**
  - Spinning Loader mit grünem Akzent (#00d4aa)
  - Dauer: ~500ms

#### 📸 Was du sehen solltest:
```
[Network Tab]
Name                          Size    Time
─────────────────────────────────────────
SwapCard.chunk.js            45 KB   120ms  <- Lazy loaded!
html5-qrcode.chunk.js        32 KB    95ms  <- Lazy loaded!
```

#### Swap Quote Test:
4. **Eingaben:**
   - From: `BTC`
   - To: `XMR`
   - Amount: `0.001`

5. **"Find Best Route" klicken**

#### ✅ Erwartetes Ergebnis:
- **Loading State:**
  - Button zeigt: "Finding Best Route..."
  - Spinner-Animation

- **Quote Card erscheint:**
  ```
  ┌─────────────────────────────────────┐
  │ Best Provider: ChangeNOW            │
  │ Fee: 0.25%                          │
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
  │ ⏱ Estimated Time: 15-30 min        │
  │                                     │
  │ You Send:    0.001 BTC              │
  │ Fee:        -0.0000025 BTC          │
  │ You Receive: 0.0543 XMR             │
  │                                     │
  │ [⚡ Execute Swap]                   │
  └─────────────────────────────────────┘
  ```

---

### Test 3: XMR Address Modal mit QR-Scanner 📱

**Feature:** Phase B - QR-Scanner statt prompt()

#### Schritte:
1. **Nach Swap Quote:** Klicke "Execute Swap"

#### ✅ Erwartetes Ergebnis:
- **Modal öffnet sich (KEIN prompt!)**
  ```
  ┌────────────────────────────────────────┐
  │ Enter XMR Address              [X]     │
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
  │ You Send:    0.001 BTC                 │
  │ You Receive: ~0.0543 XMR               │
  │                                        │
  │ XMR Receiving Address *                │
  │ ┌────────────────────────────────────┐ │
  │ │ 4ABC...xyz (95+ characters)        │ │
  │ └────────────────────────────────────┘ │
  │                                        │
  │ [📷 Scan QR Code]                      │
  │                                        │
  │ ⚠️ Make sure address is correct       │
  │                                        │
  │ [Cancel] [Confirm & Execute]           │
  └────────────────────────────────────────┘
  ```

#### QR-Scanner Test:
2. **Klicke "Scan QR Code"**

#### ✅ Erwartetes Ergebnis:
- **Camera Permission Request:**
  - Browser fragt nach Kamera-Zugriff
  
- **Bei Allow:**
  - QR-Reader erscheint im Modal
  - Live Camera Feed
  - Grüner Rahmen (#00d4aa)

- **Bei Deny:**
  - Toast Error: "Camera access denied"
  - Fallback: Manuelle Eingabe bleibt aktiv

#### Manuelle Eingabe Test:
3. **Test-XMR-Adresse einfügen:**
```
4ABC1234567890abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234
```

4. **"Confirm & Execute" klicken**

---

### Test 4: Swap Execution mit Encryption 🔐

**Feature:** Phase A - Encrypted localStorage für Swap Orders

#### ✅ Erwartetes Ergebnis:
- **Toast Success:**
  ```
  ┌─────────────────────────────────────────────┐
  │ ✅ Swap Order Created!                      │
  │    Send 0.001 BTC to address (copied to     │
  │    clipboard)                               │
  └─────────────────────────────────────────────┘
  ```

- **Clipboard Check:**
  - Strg+V irgendwo → Deposit-Adresse ist kopiert

#### localStorage Encryption Check:
1. **DevTools → Application → Local Storage → localhost:3000**

2. **Prüfe `swapOrders` Key:**

#### ✅ Erwartetes Ergebnis:
```
Key: swapOrders
Value: U2FsdGVkX1+8aF3... (AES-verschlüsselt!)
```
**NICHT lesbar** als JSON!

#### Console Decryption Test:
3. **In Browser Console:**
```javascript
// Encrypted Storage Helper laden
import { getSwapOrders } from '@/lib/storage/encrypted';

// Entschlüsselte Orders anzeigen
const orders = getSwapOrders();
console.log('Decrypted Orders:', orders);
```

#### ✅ Erwartetes Ergebnis:
```javascript
[
  {
    orderId: "abc123xyz",
    provider: "ChangeNOW",
    depositAddress: "bc1q...",
    depositAmount: "0.001",
    depositCurrency: "BTC",
    expectedReceiveAmount: "0.0543",
    receiveCurrency: "XMR",
    recipientAddress: "4ABC...",
    expiresAt: "2026-01-05T15:30:00Z",
    createdAt: "2026-01-05T14:30:00Z",
    status: "pending"
  }
]
```

---

### Test 5: Transaction History mit Explorer-Links 🔗

**Feature:** Phase A - Multi-Chain Explorer-Links

#### Voraussetzung:
- Mindestens 1 Swap Order erstellt (Test 4)

#### Schritte:
1. **Scrolle zu "Transaction History" (unten auf der Seite)**

2. **Klicke auf eine Swap-Transaction**
   - Expandiert Details

#### ✅ Erwartetes Ergebnis:
```
┌─────────────────────────────────────────┐
│ ↔️ Swap BTC → XMR          ⏳ pending   │
│ 5m ago • ChangeNOW              [▶]     │
│ +0.0543 XMR                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ Order ID: abc123xyz                     │
│ Deposit Address: bc1q...abc [📋]        │
│ Deposit Amount: 0.001 BTC               │
│ Expected: 0.0543 XMR                    │
│                                         │
│ Created: 05.01.2026, 14:30             │
│ Expires: 05.01.2026, 15:30             │
└─────────────────────────────────────────┘
```

#### Explorer-Link Test (wenn TX Hash vorhanden):
3. **Bei completed Swaps:** Klicke auf TX Hash-Link

#### ✅ Erwartetes Ergebnis:
- **Öffnet neues Tab:**
  - BTC TX: → mempool.space/tx/{hash}
  - XMR TX: → xmrchain.net/tx/{hash}
  - External Link Icon (↗) sichtbar

---

### Test 6: Error Handling mit Toasts ❌

**Feature:** Phase A - Toast Error Messages

#### Schritte:
1. **Provoziere Fehler:** Swap mit ungültigen Parametern
   - From: `BTC`
   - To: `BTC` (gleiche Coin!)
   - Amount: `0.001`

2. **"Find Best Route" klicken**

#### ✅ Erwartetes Ergebnis:
- **Error Toast:**
  ```
  ┌─────────────────────────────────────┐
  │ ❌ Cannot swap same coin            │  <- Roter Rand
  │    Please select different coins    │
  └─────────────────────────────────────┘
  ```

#### Weitere Error-Tests:
3. **Ungültiger Betrag:**
   - Amount: `-1` oder `0`
   - Erwartung: "Invalid amount" Toast

4. **Zu kleine Menge:**
   - Amount: `0.00000001` (unter Minimum)
   - Erwartung: "Amount below minimum" Toast (von ChangeNOW)

---

## 🎯 Performance Tests

### Bundle-Size Check

#### Network Tab Analysis:
1. **Hard Reload:** Strg+Shift+R
2. **Network Tab:** Sortiere nach Size
3. **Prüfe JS Bundles:**

#### ✅ Erwartetes Ergebnis:
```
Initial Load:
- main.js:          ~85 KB (gzipped)
- framework.js:     ~45 KB (gzipped)

Lazy Loaded (on demand):
- SwapCard.chunk:   ~45 KB
- PaymentForm.chunk: ~35 KB
- WalletView.chunk: ~52 KB
```

**Total First Load:** < 200 KB ✅

### Loading Speed Test

#### Lighthouse Test:
1. **DevTools → Lighthouse**
2. **Mode:** Mobile
3. **Run Audit**

#### ✅ Erwartete Scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

---

## 🐛 Bekannte Issues (Expected Behavior)

### 1. Payment Functionality
❌ **"Send Payment" disabled**
- Grund: VPS Server nicht deployed
- Fix: Siehe `docs/HYBRID-SETUP-GUIDE.md`

### 2. Swap Completion
⚠️ **Keine Auto-Distribution nach Swap**
- Grund: ChangeNOW sendet XMR an User-Adresse (nicht automatisch in 5-Wallet-System)
- Workaround: Manuelle Konsolidierung später

### 3. Live Balance Updates
⚠️ **Balances nur gecacht**
- Grund: monero-wallet-rpc benötigt VPS
- Aktuell: 30s Cache-Intervall mit Mock-Daten

---

## ✅ Checkliste - Alle Tests bestanden

Nach Abschluss aller Tests sollten folgende Features funktionieren:

### Phase A Features:
- [x] Toast Notifications (grün/rot, animiert)
- [x] Swap Order Encryption (AES in localStorage)
- [x] Explorer-Links (Multi-Chain: BTC, XMR, ETH, SOL)
- [x] Error Handling mit Toasts

### Phase B Features:
- [x] QR-Scanner für XMR-Adresse (Modal statt prompt)
- [x] Lazy Loading (Dynamic Imports)
- [x] Bundle Optimization (<200kb initial)
- [x] Code-Splitting (separate Chunks)

### Core Functionality:
- [x] Wallet Creation
- [x] Swap Quote API (ChangeNOW Production)
- [x] Swap Execution (echte Orders)
- [x] Transaction History
- [x] Deposit Address Copy-to-Clipboard

---

## 📸 Screenshot-Bereiche für Dokumentation

Wenn du Screenshots machen möchtest, fokussiere auf:

1. **Toast Notifications:**
   - Success Toast (grün)
   - Error Toast (rot)
   - Position: Top-Right

2. **XMR Address Modal:**
   - Gesamtansicht mit QR-Scanner Button
   - QR-Scanner aktiv (wenn Camera verfügbar)

3. **Swap Quote Card:**
   - Provider Info
   - Amounts Breakdown
   - Execute Button

4. **Transaction History:**
   - Expandierte Details
   - Explorer-Links

5. **Network Tab:**
   - Lazy-loaded Chunks
   - Bundle Sizes

---

## 🚀 Nächste Schritte

Nach erfolgreichem Testing:

1. **Git Commit:**
```bash
git add .
git commit -m "feat: Phase A+B - Toast notifications, QR scanner, lazy loading"
git push origin main
```

2. **Vercel Deployment:**
```bash
vercel --prod
```

3. **VPS Setup (optional):**
- Folge `docs/HYBRID-SETUP-GUIDE.md`
- Aktiviert: Payments, Distribution, Consolidation

---

**Happy Testing! 🎉**

Bei Problemen: Check Browser Console (F12) für detaillierte Error-Messages.
