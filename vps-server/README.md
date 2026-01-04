# VPS Wallet Server

Separater Server für Monero-Wallet-Operationen.
Läuft auf VPS (Hetzner/DigitalOcean), kommuniziert mit Vercel via REST API.

## Setup

### 1. VPS mieten (Empfohlen: Hetzner CX21)
- 4GB RAM
- 80GB SSD
- Ubuntu 22.04
- ~5€/Monat

### 2. Monero installieren
```bash
# Add Monero repository
sudo apt update
sudo apt install -y curl

# Download Monero binaries
wget https://downloads.getmonero.org/cli/linux64 -O monero.tar.bz2
tar -xvf monero.tar.bz2
sudo mv monero-*/* /usr/local/bin/

# Verify installation
monerod --version
monero-wallet-rpc --version
```

### 3. Start Monero Daemon
```bash
# Create systemd service
sudo nano /etc/systemd/system/monerod.service
```

Inhalt:
```ini
[Unit]
Description=Monero Daemon
After=network.target

[Service]
Type=forking
User=monero
ExecStart=/usr/local/bin/monerod \
  --rpc-bind-ip=127.0.0.1 \
  --confirm-external-bind \
  --detach

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable monerod
sudo systemctl start monerod

# Check sync status (takes 1-2 days!)
tail -f ~/.bitmonero/bitmonero.log
```

### 4. Setup Wallet-RPC
```bash
# Create wallet directory
mkdir -p ~/monero-wallets

# Import seeds from your 5 wallets
monero-wallet-cli --restore-deterministic-wallet \
  --restore-height 0 \
  --wallet-file ~/monero-wallets/wallet-1

# Repeat for wallets 2-5
```

Start wallet-rpc:
```bash
monero-wallet-rpc \
  --rpc-bind-port 18082 \
  --wallet-dir ~/monero-wallets \
  --daemon-host 127.0.0.1:18081 \
  --disable-rpc-login \
  --trusted-daemon
```

### 5. Install Node.js & Dependencies
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone VPS server code
git clone <your-repo> vps-wallet-server
cd vps-wallet-server/vps-server

npm install
```

### 6. Configure Environment
```bash
cp .env.example .env
nano .env
```

```env
PORT=3001
MONERO_RPC_URL=http://127.0.0.1:18082
API_SECRET=<generate-strong-random-secret>
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### 7. Start API Server
```bash
npm run build
npm start

# Or with PM2 for auto-restart
npm install -g pm2
pm2 start dist/server.js --name wallet-api
pm2 save
pm2 startup
```

### 8. Setup HTTPS (Caddy)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

```
your-domain.com {
  reverse_proxy localhost:3001
}
```

```bash
sudo systemctl restart caddy
```

### 9. Update Vercel Environment
In Vercel Dashboard → Settings → Environment Variables:
```
WALLET_VPS_URL=https://your-domain.com
WALLET_VPS_SECRET=<same-as-vps-api-secret>
```

## API Endpoints

### POST /api/wallet/transfer
Send XMR from wallet

```json
{
  "walletIndex": 2,
  "toAddress": "4ABC...",
  "amount": 1.5,
  "priority": "normal"
}
```

### GET /api/wallet/balance?walletIndex=0
Get wallet balance

### POST /api/wallet/distribute
Distribute to 5 wallets (20% each)

```json
{
  "fromWalletIndex": 0,
  "percentage": 20
}
```

### POST /api/wallet/consolidate
Merge wallets

```json
{
  "sourceWallets": [0, 1, 3, 4],
  "targetWallet": 2,
  "amount": 5.0
}
```

## Security

1. **Firewall**: Only allow SSH (22), HTTPS (443)
2. **API Secret**: Use strong random string (32+ chars)
3. **CORS**: Only allow your Vercel domain
4. **Rate Limiting**: Max 10 transfers/hour
5. **Wallet Passwords**: Store encrypted, never in logs

## Monitoring

```bash
# Check logs
pm2 logs wallet-api

# Check monerod sync
monerod status

# Check wallet-rpc
curl http://127.0.0.1:18082/json_rpc \
  -d '{"jsonrpc":"2.0","id":"0","method":"get_balance"}' \
  -H 'Content-Type: application/json'
```

## Kosten

- VPS: ~5-10€/Monat (Hetzner CX21/CX31)
- Domain: ~1€/Monat (optional, kannst auch IP nutzen)
- **Total: ~6-11€/Monat**

## Wartung

- **Wöchentlich**: Logs checken, Disk-Space prüfen
- **Monatlich**: System-Updates (`apt update && apt upgrade`)
- **Bei Bedarf**: Wallet-Backups (Seeds sind wichtiger!)
