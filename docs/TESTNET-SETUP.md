# Testnet Setup Guide - Phase 1

## ✅ Was wurde automatisch konfiguriert

Die folgenden Komponenten sind bereits auf Testnet umgestellt:

### 1. Environment Variables (`.env.local`)
- ✅ `NEXT_PUBLIC_TESTNET=true` - Aktiviert Testnet-Modus
- ✅ Monero Stagenet Node: `http://stagenet.community.rino.io:38081`
- ✅ ChangeNOW Sandbox-Modus aktiviert
- ✅ btcswapxmr Testnet-Endpoint konfiguriert

### 2. Monero Wallet (`lib/wallets/monero-core.ts`)
- ✅ Automatische Erkennung von Stagenet aus ENV
- ✅ Wallet-Generierung auf Stagenet
- ✅ Balance-Abfrage über Stagenet-Node

### 3. Swap-Provider
- ✅ **ChangeNOW**: Sandbox API (`https://api.sandbox.changenow.io/v2`)
- ✅ **btcswapxmr**: Testnet-Endpoint aktiviert

---

## 🔧 Manuelle Schritte (ERFORDERLICH)

### Schritt 1: ChangeNOW Sandbox API-Key holen

1. Gehe zu: https://changenow.io/developers
2. Registriere dich für einen **kostenlosen Account**
3. Erstelle einen **Sandbox API-Key** (nicht Production!)
4. Kopiere den Key in `.env.local`:
   ```bash
   CHANGENOW_API_KEY=dein_sandbox_key_hier
   ```

> **Hinweis**: Der aktuelle Key in `.env.local` ist ein Platzhalter. Für echte Tests brauchst du deinen eigenen Key.

---

### Schritt 2: Monero Stagenet Wallet erstellen

1. **In der App**:
   - Öffne `http://localhost:3000`
   - Klicke auf "Create 5 Wallets"
   - **WICHTIG**: Notiere die Seed-Phrase (25 Wörter) sicher!
   
2. **Wallet-Adresse kopieren**:
   - Nach Wallet-Erstellung wird die erste Adresse angezeigt
   - Format: `5...` (Stagenet-Adressen beginnen mit 5)

3. **Test-XMR vom Faucet holen**:
   - Gehe zu: https://community.rino.io/faucet/stagenet/
   - Füge deine Stagenet-Adresse ein
   - Klicke "Request Stagenet XMR"
   - Warte 2-5 Minuten auf Confirmations

4. **Balance-Check**:
   - Refresh die App - Balance sollte sich aktualisieren
   - Wenn nicht: Warte weitere 5 Min. (Stagenet-Blocks sind langsamer)

---

### Schritt 3: BTC/ETH Testnet-Wallets (für Swaps)

#### Bitcoin Testnet
1. **Wallet erstellen**:
   - Nutze eine Wallet wie Electrum (Testnet-Modus)
   - Oder Browser-Extension: https://testnet.bitcoinwallet.com/

2. **Test-BTC holen**:
   - Faucet 1: https://testnet-faucet.com/btc-testnet/
   - Faucet 2: https://coinfaucet.eu/en/btc-testnet/
   - Erhalte 0.001 - 0.01 tBTC

#### Ethereum Sepolia Testnet
1. **MetaMask konfigurieren**:
   - Netzwerk hinzufügen: "Sepolia Testnet"
   - Chain ID: 11155111
   - RPC: https://sepolia.infura.io/v3/

2. **Test-ETH holen**:
   - Faucet 1: https://sepoliafaucet.com/
   - Faucet 2: https://faucet.sepolia.dev/
   - Benötigt Twitter/GitHub-Verifizierung (Spam-Schutz)

#### Solana Devnet (optional)
```bash
# Solana CLI installieren (optional)
solana config set --url https://api.devnet.solana.com

# Airdrop direkt via Faucet:
# https://faucet.solana.com/
```

---

## 🧪 Testnet-Bereitschafts-Check

### Checklist vor erstem Swap

- [ ] `.env.local` enthält `NEXT_PUBLIC_TESTNET=true`
- [ ] ChangeNOW Sandbox API-Key eingetragen
- [ ] Monero Stagenet-Wallets erstellt (5 Stück)
- [ ] Seed-Phrase sicher gespeichert (Papier + verschlüsseltes Backup)
- [ ] Stagenet-Balance > 0 XMR (vom Faucet)
- [ ] BTC Testnet-Wallet mit > 0.001 tBTC
- [ ] ETH Sepolia-Wallet mit > 0.1 ETH

### Test-Szenario 1: Swap testen (MOCK)
```bash
# Dev Server starten
npm run dev

# Browser: http://localhost:3000
# 1. Wähle "BTC → XMR"
# 2. Betrag: 0.001 BTC
# 3. Klicke "Get Quote"
# 4. Prüfe ob Sandbox-URL verwendet wird (Console-Log)
```

> **Hinweis**: Aktuell sind Swaps noch MOCKS (Phase 2 - echte API-Integration folgt)

---

## 🔍 Debugging

### Problem: "No balance showing after faucet"
**Lösung**:
1. Prüfe Stagenet-Node erreichbar:
   ```bash
   curl http://stagenet.community.rino.io:38081/json_rpc \
     -d '{"jsonrpc":"2.0","id":"0","method":"get_info"}' \
     -H 'Content-Type: application/json'
   ```
2. Wallet-Sync dauert 5-10 Min beim ersten Mal
3. Alternative Node probieren: `http://stagenet.xmr-tw.org:38081`

### Problem: "ChangeNOW API returns 403"
**Lösung**:
- API-Key falsch → Prüfe `.env.local`
- Sandbox-Mode nicht aktiviert → Setze `CHANGENOW_SANDBOX=true`
- IP-Limit erreicht → Warte 1 Stunde oder nutze VPN

### Problem: "Wallets can't connect to Stagenet"
**Lösung**:
```typescript
// In Browser-Console (F12):
console.log(process.env.NEXT_PUBLIC_MONERO_NETWORK); 
// Sollte "stagenet" zeigen

// Server-Logs prüfen:
npm run dev
// Sollte zeigen: "[Monero] Network: STAGENET"
```

---

## 📋 Nächste Schritte (Phase 2)

Nach erfolgreichem Testnet-Setup:

1. **ChangeNOW echte API-Integration** (`lib/swap-providers/changenow.ts`)
2. **Webhook-Endpoint** für Status-Updates (`app/api/webhooks/changenow/route.ts`)
3. **BTC/ETH Sending-Logic** (ethers.js, bitcoin-core)
4. **5-Wallet Auto-Distribution** nach XMR-Empfang
5. **End-to-End Test**: 0.001 BTC → XMR Swap komplett durchführen

---

## ⚠️ Wichtige Hinweise

1. **NIEMALS Mainnet-Keys in Testnet verwenden**
   - Stagenet-Seeds sind inkompatibel mit Mainnet
   - Beim Wechsel zu Production: Neue Wallets erstellen!

2. **Testnet-Coins haben keinen Wert**
   - tBTC ≠ BTC
   - Stagenet XMR ≠ Mainnet XMR
   - Nur für Testing!

3. **API-Limits (Sandbox)**
   - ChangeNOW Sandbox: 100 Requests/Tag
   - Bei Überschreitung: 24h warten oder Production-Key nutzen

4. **Sicherheit**
   - `.env.local` NICHT zu Git committen (bereits in `.gitignore`)
   - Seed-Phrase niemals online speichern
   - Nach Testing: Testnet-Wallets löschen oder separieren

---

## 🎯 Status: Phase 1 ABGESCHLOSSEN ✅

**Konfiguriert**:
- ✅ Testnet Environment Variables
- ✅ Monero Stagenet Integration
- ✅ Swap-Provider Sandbox-Modus
- ✅ Dokumentation & Faucet-Links

**Bereit für Phase 2**: Echte Swap-Execution implementieren
