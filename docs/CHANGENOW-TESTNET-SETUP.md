# ChangeNOW API Setup & Testnet Guide

**Datum:** 2026-01-02  
**Zweck:** ChangeNOW API-Key holen + Swap-Testing auf Testnet

---

## 1. ChangeNOW API-Key holen

### Schritt 1: Account erstellen
1. Öffne: https://changenow.io/signup
2. Registriere dich mit E-Mail + Passwort
3. Bestätige E-Mail-Adresse

### Schritt 2: API-Key generieren
1. Login: https://changenow.io/login
2. Navigiere zu API Settings: https://changenow.io/api/api-settings
3. Klicke "Generate New API Key"
4. **WICHTIG:** Key kopieren (wird nur EINMAL angezeigt!)

### Schritt 3: API-Key konfigurieren
```bash
# 1. .env.example nach .env.local kopieren
cp .env.example .env.local

# 2. .env.local editieren
# Ersetze: CHANGENOW_API_KEY=your_changenow_api_key_here
# Mit: CHANGENOW_API_KEY=dein_echter_api_key
```

**Beispiel .env.local:**
```bash
CHANGENOW_API_KEY=cn-api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MONERO_NETWORK=testnet
NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081
```

---

## 2. Testnet Konfiguration

### Mainnet vs Testnet Unterschiede

| Feature | Mainnet | Testnet |
|---------|---------|---------|
| **Echtes Geld** | ✅ JA | ❌ NEIN |
| **XMR Wert** | ~$150/XMR | $0 (Fake) |
| **Faucets** | Keine | ✅ Gratis XMR |
| **Blockchain** | Produktiv | Test-Chain |
| **Empfohlen für** | Production | Development |

### Testnet aktivieren

**1. .env.local editieren:**
```bash
# Testnet aktivieren
NEXT_PUBLIC_MONERO_NETWORK=testnet
NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081
```

**2. App neu starten:**
```bash
npm run dev
```

**3. Testnet Wallets erstellen:**
- Öffne: http://localhost:3000
- Erstelle Wallets wie gewohnt
- **WICHTIG:** Seeds sind NUR für Testnet gültig!

---

## 3. Testnet XMR bekommen (Faucets)

### Monero Testnet Faucets

**1. Community Faucet:**
- URL: http://stagenet.xmr-tw.org:38085
- Limit: 100 XMR pro Tag
- Wartezeit: ~1-2 Minuten

**2. XMR.to Testnet Faucet:**
- URL: https://community.xmr.to/faucet/stagenet
- Limit: 50 XMR pro Anfrage
- Wartezeit: ~5-10 Minuten

**Anleitung:**
```bash
# 1. Testnet Wallet-Adresse kopieren (aus der App)
# Beispiel: 5xxxxxx... (95+ Zeichen)

# 2. Faucet-Seite öffnen
# 3. Adresse eingeben + Captcha lösen
# 4. Warte 1-10 Minuten
# 5. Balance aktualisieren in der App
```

---

## 4. Swap-Testing auf Testnet

### ⚠️ WICHTIG: Einschränkungen

**Was funktioniert:**
- ✅ Wallet-Erstellung (Testnet-Adressen)
- ✅ Balance-Queries (Testnet-Blockchain)
- ✅ Payments (Testnet → Testnet)
- ✅ Transaction History

**Was NICHT funktioniert auf Testnet:**
- ❌ **Echte Swaps** (ChangeNOW unterstützt KEIN Testnet)
- ❌ BTC → XMR Swap (nur Mainnet)
- ❌ ETH → XMR Swap (nur Mainnet)
- ❌ Real Swap Providers (alle nur Mainnet)

### Warum keine Testnet-Swaps?

**Swap-Provider = Mainnet-Only:**
- ChangeNOW: Nur echte Cryptos (BTC, ETH, SOL)
- BTCSwapXMR: Nur echte BTC ↔ XMR
- GhostSwap: Offline

**Testnet = Nur Monero-Netzwerk:**
- Testnet-Nodes kennen nur Testnet-XMR
- Keine BTC-Testnet-Integration
- Keine Atomic Swaps zwischen Testnets

---

## 5. Was du testen kannst

### ✅ Testbar auf Testnet

**1. Wallet-Management:**
```bash
✅ Wallet-Erstellung (5 Wallets)
✅ Seed-Backup (25-Wort-Seeds)
✅ Seed-Recovery (Import von Seeds)
✅ Balance-Queries (via Testnet-RPC)
✅ Password-Encryption (PBKDF2)
```

**2. Payment-System:**
```bash
# Schritt 1: Testnet XMR vom Faucet holen
# Schritt 2: In der App:
- Gehe zu "Payment" Section
- Ziel-Adresse: Andere Testnet-Adresse
- Betrag: z.B. 5 XMR (gratis vom Faucet)
- Klick "Send Payment"

✅ Smart Consolidation (5 Wallets → 1)
✅ Exakte XMR-Beträge
✅ TX Broadcasting
✅ Payment History
```

**3. Performance & Security:**
```bash
✅ Balance Caching (5min TTL)
✅ Web Workers (non-blocking)
✅ Rate Limiting (10 req/hour)
✅ Session Management (30min auto-lock)
✅ Transaction History UI
```

### ❌ NICHT testbar auf Testnet

**Swap-Funktionalität:**
- ❌ BTC → XMR Swaps
- ❌ ETH → XMR Swaps
- ❌ ChangeNOW Integration (API funktioniert, aber kein Testnet-Mode)
- ❌ Swap-Provider-Quotes (nur Mock-Daten)

---

## 6. Testnet → Mainnet Wechsel

### Wenn Testing erfolgreich war:

**1. .env.local auf Mainnet umstellen:**
```bash
# VORHER (Testnet):
NEXT_PUBLIC_MONERO_NETWORK=testnet
NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081

# NACHHER (Mainnet):
NEXT_PUBLIC_MONERO_NETWORK=mainnet
NEXT_PUBLIC_MONERO_RPC_URL=https://xmr-node.cakewallet.com:18081
# ODER dein eigener Node:
# NEXT_PUBLIC_MONERO_RPC_URL=http://localhost:18081
```

**2. Wallets neu erstellen:**
```bash
⚠️ Testnet-Wallets funktionieren NICHT auf Mainnet!

1. In der App: Alle Testnet-Wallets löschen
2. Neue Mainnet-Wallets erstellen
3. Seeds sicher aufbewahren (echtes Geld!)
```

**3. App neu starten:**
```bash
npm run dev
```

**4. ChangeNOW API-Key aktivieren:**
```bash
# In .env.local sollte jetzt stehen:
CHANGENOW_API_KEY=cn-api-xxxxxx  # Dein echter Key
NEXT_PUBLIC_MONERO_NETWORK=mainnet
```

---

## 7. Testing-Checklist

### Testnet-Testing (JETZT möglich)

```bash
☐ 1. .env.local erstellt mit:
     - NEXT_PUBLIC_MONERO_NETWORK=testnet
     - NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081

☐ 2. App gestartet: npm run dev

☐ 3. Testnet Wallets erstellt (5 Wallets)

☐ 4. Seeds gesichert (Backup Modal getestet)

☐ 5. Testnet XMR vom Faucet geholt (50-100 XMR)

☐ 6. Balance Sync getestet:
     - Refresh Button
     - Auto-Update nach 5min
     - Cache funktioniert

☐ 7. Payment getestet:
     - 5 XMR an andere Testnet-Adresse
     - Smart Consolidation beobachten
     - TX Hash in History sehen

☐ 8. Transaction History getestet:
     - Payment erscheint in Liste
     - Filter (All/Payments) funktioniert
     - CSV Export funktioniert

☐ 9. Session Management getestet:
     - Password-Lock nach 30min
     - Re-Login mit Passwort

☐ 10. Error Handling getestet:
      - Falsches Passwort eingeben
      - Ungültige XMR-Adresse eingeben
      - Zu hoher Betrag (> Balance)
```

### Mainnet-Testing (NACH Testnet)

```bash
☐ 1. ChangeNOW API-Key geholt

☐ 2. .env.local auf Mainnet umgestellt

☐ 3. Neue Mainnet-Wallets erstellt

☐ 4. ⚠️ KLEINE Beträge zum Testen (z.B. 0.1 XMR)

☐ 5. Swap-Provider-Quotes testen:
     - BTC → XMR Quote holen
     - ETH → XMR Quote holen
     - Fees vergleichen

☐ 6. ⚠️ OPTIONAL: Echter Swap (kleine Beträge!)
     - 0.001 BTC → XMR
     - Swap-Status verfolgen
     - XMR-Empfang bestätigen
```

---

## 8. Troubleshooting

### Problem: "Balance sync failed"
```bash
Ursache: Testnet-Node offline oder falsch konfiguriert

Lösung:
1. Prüfe .env.local:
   NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081

2. Alternativer Testnet-Node:
   NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.community.xmr.to:38081

3. App neu starten: npm run dev
```

### Problem: "API Key invalid" (ChangeNOW)
```bash
Ursache: API-Key falsch oder nicht aktiviert

Lösung:
1. Prüfe .env.local:
   CHANGENOW_API_KEY=cn-api-...

2. Neue API-Key generieren:
   https://changenow.io/api/api-settings

3. App neu starten
```

### Problem: "Wallets erstellt, aber keine Balance"
```bash
Ursache: Testnet-Wallets sind leer

Lösung:
1. Faucet nutzen:
   http://stagenet.xmr-tw.org:38085

2. Adresse aus der App kopieren

3. 5-10 Minuten warten

4. Refresh Button klicken
```

### Problem: "Swap funktioniert nicht"
```bash
Ursache: Swap-Provider unterstützen kein Testnet

Erwartetes Verhalten:
- Testnet: Nur Mock-Daten, keine echten Swaps
- Mainnet: Echte Swaps mit ChangeNOW API-Key

Lösung für echte Swaps:
1. Wechsel zu Mainnet (.env.local)
2. ChangeNOW API-Key aktivieren
3. Neue Mainnet-Wallets erstellen
```

---

## 9. Nächste Schritte

### Nach erfolgreichem Testing:

**1. Production Deployment vorbereiten:**
```bash
- Eigenen Monero Node aufsetzen (Privacy + Performance)
- SSL/TLS Zertifikat (Let's Encrypt)
- Monitoring (Sentry, Uptime)
- Backup-Strategie
```

**2. TX Monitoring implementieren:**
```bash
- Payment Status: pending → confirmed
- Background Worker für Blockchain-Checks
- User-Benachrichtigungen
```

**3. Error Recovery verbessern:**
```bash
- Retry-Logic für Failed TXs
- Wallet Sync Failure Handling
- Network Timeout Recovery
```

**4. Legal Compliance:**
```bash
- Terms of Service
- Privacy Policy
- GDPR Compliance (EU)
- KYC/AML Disclaimer
```

---

## 10. Support & Links

### Monero Testnet:
- Faucet 1: http://stagenet.xmr-tw.org:38085
- Faucet 2: https://community.xmr.to/faucet/stagenet
- Testnet Explorer: https://stagenet.xmrchain.net

### ChangeNOW:
- Signup: https://changenow.io/signup
- API Docs: https://documenter.getpostman.com/view/8180765/SVfTPm8E
- API Settings: https://changenow.io/api/api-settings

### Monero Entwickler:
- Docs: https://www.getmonero.org/resources/developer-guides/
- monero-javascript: https://github.com/monero-ecosystem/monero-javascript
- RPC Wallet Guide: https://www.getmonero.org/resources/developer-guides/wallet-rpc.html

---

**🎯 Zusammenfassung:**

✅ **Testnet-Testing:** Wallets, Payments, History → JETZT möglich  
⚠️ **Swap-Testing:** Nur auf Mainnet mit echten API-Keys  
🟢 **Empfehlung:** Teste zuerst Payment-Flow auf Testnet, dann Swaps auf Mainnet mit kleinen Beträgen
