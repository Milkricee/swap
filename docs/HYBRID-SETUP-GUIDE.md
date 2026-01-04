# Option A: Hybrid Setup - Complete Guide

## Was ist schon fertig? ✅

### Vercel-Teil (JETZT deploybar)
- ✅ UI komplett funktionsfähig
- ✅ ChangeNOW Swap-Integration (produktiv)
- ✅ VPS-API-Client (`lib/vps/client.ts`)
- ✅ Payment-Route vorbereitet (`app/api/pay/route.ts`)
- ✅ Fallback: Funktioniert auch OHNE VPS (nur Swaps)

### VPS-Teil (vorbereitet, muss deployed werden)
- ✅ Express-Server (`vps-server/src/server.ts`)
- ✅ monero-wallet-rpc Integration
- ✅ Auto-Consolidation Logic
- ✅ API-Endpoints für Payments

---

## Was muss noch gemacht werden? ⏳

### Schritt 1: VPS mieten (5 Min)
**Empfehlung: Hetzner Cloud**
- Gehe zu: https://www.hetzner.com/cloud
- Server-Type: CX21 (4GB RAM, 80GB SSD) = ~5€/Monat
- Location: Deutschland (Falkenstein/Nuremberg)
- OS: Ubuntu 22.04

**SSH-Key hinzufügen:**
```bash
# Lokal (Windows PowerShell):
ssh-keygen -t ed25519 -C "your@email.com"
cat ~/.ssh/id_ed25519.pub  # Kopiere Output
```
Füge Public Key bei Hetzner ein → Server erstellen

---

### Schritt 2: VPS-Setup (30 Min)
```bash
# SSH einloggen
ssh root@<deine-vps-ip>

# System aktualisieren
apt update && apt upgrade -y

# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Monero installieren
wget https://downloads.getmonero.org/cli/linux64 -O monero.tar.bz2
tar -xvf monero.tar.bz2
mv monero-*/* /usr/local/bin/
rm -rf monero-* monero.tar.bz2

# Verify
monerod --version
monero-wallet-rpc --version
```

---

### Schritt 3: Monero Daemon starten (1-2 Tage Sync!)
```bash
# Daemon im Hintergrund starten
monerod --rpc-bind-ip=127.0.0.1 --confirm-external-bind --detach

# Sync-Status prüfen (dauert 1-2 Tage!)
tail -f ~/.bitmonero/bitmonero.log

# Alternativ: Verwende Remote-Node (sofort nutzbar, aber weniger privat)
# Überspringe Daemon-Sync und nutze in wallet-rpc:
# --daemon-address node.community.rino.io:18081
```

**Wichtig:** Während Sync läuft kannst du schon Schritt 4-6 machen!

---

### Schritt 4: Wallets importieren (10 Min)
```bash
# Wallet-Verzeichnis erstellen
mkdir -p ~/monero-wallets
cd ~/monero-wallets

# Wallet #1 importieren
monero-wallet-cli \
  --restore-deterministic-wallet \
  --restore-height 0 \
  --wallet-file wallet-1

# Bei Prompt:
# - Seed eingeben (25 Wörter aus App)
# - Passwort setzen
# - Bestätigen

# Wiederholen für Wallets 2-5
# (wallet-2, wallet-3, wallet-4, wallet-5)
```

---

### Schritt 5: VPS-Server deployen (15 Min)
```bash
# Repository clonen
cd ~
git clone https://github.com/<dein-username>/swap.git
cd swap/vps-server

# Dependencies installieren
npm install

# .env konfigurieren
cp .env.example .env
nano .env
```

**.env Inhalt:**
```env
PORT=3001
MONERO_RPC_URL=http://127.0.0.1:18082
API_SECRET=<generiere-starkes-geheimnis-32-zeichen>
ALLOWED_ORIGINS=https://deine-app.vercel.app
NODE_ENV=production
```

**Starkes Secret generieren:**
```bash
openssl rand -base64 32
```

```bash
# Build & Start
npm run build

# Mit PM2 (Auto-Restart)
npm install -g pm2
pm2 start dist/server.js --name wallet-api
pm2 save
pm2 startup  # Kopiere den Output-Befehl und führe ihn aus
```

---

### Schritt 6: monero-wallet-rpc starten (10 Min)
```bash
# Terminal-Session mit tmux (bleibt nach Logout aktiv)
tmux new -s wallet-rpc

# Wallet-RPC starten
monero-wallet-rpc \
  --rpc-bind-port 18082 \
  --wallet-dir ~/monero-wallets \
  --daemon-host 127.0.0.1:18081 \
  --disable-rpc-login \
  --trusted-daemon \
  --wallet-file wallet-1 \
  --password <dein-wallet-passwort>

# tmux verlassen (Server läuft weiter):
# Ctrl+B, dann D

# Später wieder anhängen:
# tmux attach -t wallet-rpc
```

**Test:**
```bash
curl http://127.0.0.1:18082/json_rpc \
  -d '{"jsonrpc":"2.0","id":"0","method":"get_balance"}' \
  -H 'Content-Type: application/json'
```

---

### Schritt 7: HTTPS Setup (10 Min)
```bash
# Caddy installieren (automatisches HTTPS)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Caddyfile konfigurieren
nano /etc/caddy/Caddyfile
```

**Caddyfile Inhalt:**
```
deine-domain.com {
  reverse_proxy localhost:3001
}
```

```bash
# Caddy neu starten
systemctl restart caddy
```

**Domain-Setup:**
- Kaufe Domain (Namecheap, ~1€/Jahr) ODER
- Nutze kostenlos: DuckDNS, FreeDNS
- A-Record: `deine-domain.com → <vps-ip>`

---

### Schritt 8: Vercel konfigurieren (5 Min)
1. Gehe zu: https://vercel.com/dashboard
2. Projekt auswählen → Settings → Environment Variables
3. Füge hinzu:
   ```
   WALLET_VPS_URL=https://deine-domain.com
   WALLET_VPS_SECRET=<gleiches-secret-wie-auf-vps>
   ```
4. Redeploy: Deployments → Latest → ... → Redeploy

---

## Testing

### Test 1: VPS Health
```bash
curl https://deine-domain.com/health \
  -H "X-API-Secret: <dein-secret>"

# Erwartete Antwort:
# {"status":"ok","timestamp":1704461234567}
```

### Test 2: Balance Check
```bash
curl https://deine-domain.com/api/wallet/balance?walletIndex=0 \
  -H "X-API-Secret: <dein-secret>"

# Erwartete Antwort:
# {"success":true,"balance":"1.234567890123","unlockedBalance":"1.234567890123"}
```

### Test 3: Payment (in App)
1. Öffne: https://deine-app.vercel.app
2. Klicke "Send" Tab
3. Gib Adresse & Betrag ein (z.B. 0.001 XMR)
4. Klicke "Pay"
5. Prüfe in VPS-Logs: `pm2 logs wallet-api`

---

## Zeitplan

| Schritt | Dauer | Warten? |
|---------|-------|---------|
| 1. VPS mieten | 5 Min | Nein |
| 2. VPS-Setup | 30 Min | Nein |
| 3. Daemon-Sync | 1-2 Tage | **JA** (parallel zu 4-8) |
| 4. Wallets import | 10 Min | Nein |
| 5. Server deploy | 15 Min | Nein |
| 6. wallet-rpc | 10 Min | Nein |
| 7. HTTPS | 10 Min | Nein |
| 8. Vercel config | 5 Min | Nein |

**Total aktive Zeit:** ~1.5 Stunden  
**Total Wartezeit:** 1-2 Tage (Daemon-Sync)

**Trick:** Nutze Remote-Node für sofortigen Start:
```bash
# In wallet-rpc statt lokalem Daemon:
--daemon-address node.community.rino.io:18081
```
→ Sofort nutzbar, keine Sync-Zeit!

---

## Kosten

- **VPS:** 5€/Monat (Hetzner CX21)
- **Domain:** 1€/Monat (optional, kannst auch IP nutzen)
- **Total:** 5-6€/Monat

**Free Alternative (kein HTTPS):**
- Nutze VPS-IP direkt: `http://<ip>:3001`
- Vercel ENV: `WALLET_VPS_URL=http://<ip>:3001`
- ⚠️ Nur für Testing! Produktiv MUSS HTTPS sein

---

## Zusammenfassung

**Was JETZT schon läuft:**
- ✅ Swaps (ChangeNOW)
- ✅ UI komplett
- ✅ Code fertig (Vercel + VPS)

**Was noch fehlt:**
- ⏳ VPS mieten & aufsetzen (~1.5h)
- ⏳ Daemon syncen (1-2 Tage, optional mit Remote-Node überspringbar)

**Nach Setup:**
- ✅ Echte XMR-Payments möglich
- ✅ Auto-Consolidation funktioniert
- ✅ 5-Wallet-System aktiv

**Bereit zum Loslegen?** → Schritt 1: VPS mieten!
