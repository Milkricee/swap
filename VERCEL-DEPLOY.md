# Vercel Deployment Guide (Private Testing)

## 🚀 Quick Deploy

### 1. Push zu GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Vercel Setup
1. Gehe zu [vercel.com](https://vercel.com)
2. **Sign up mit GitHub** (kostenlos)
3. **Import Project** → Wähle `Milkricee/swap` Repository
4. **Framework Preset**: Next.js (auto-detected)

### 3. Environment Variables setzen

**WICHTIG:** Im Vercel Dashboard → Settings → Environment Variables:

```env
CHANGENOW_API_KEY=ad422020d4bf86bc0fbcc18ef1d927428472deab8abb2055f8e268aede9fbe5e
NEXT_PUBLIC_MONERO_RPC_URL=https://xmr-node.cakewallet.com:18081
NEXT_PUBLIC_MONERO_NETWORK=mainnet
NEXT_PUBLIC_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Für alle Environments:** Production, Preview, Development (alle 3 anhaken!)

### 4. Deploy Button klicken

Fertig! Deine App läuft auf: `https://swap-milkricee.vercel.app`

---

## 🔒 Privacy Settings (NUR FÜR DICH)

### Option A: Vercel Password Protection (Empfohlen)
1. Vercel Dashboard → Settings → **Deployment Protection**
2. Enable **Password Protection**
3. Setze Passwort → Nur du kannst zugreifen

### Option B: IP Whitelist (Pro Plan - €20/Monat)
Nur für deine IP-Adresse zugänglich

---

## 📱 Nach dem Deployment

### Erste Schritte:
1. Öffne `https://dein-projekt.vercel.app`
2. **Erstelle Wallets** (werden in Browser localStorage gespeichert)
3. **SOFORT Seed-Phrase sichern!** (Papier + Safe)
4. Teste mit kleinen Beträgen

### ⚠️ Wichtige Hinweise:

**Wallets sind Browser-gebunden:**
- ✅ Desktop Chrome = Wallet A
- ✅ Handy Safari = Neue Wallet B (außer Seed Recovery)
- ✅ Inkognito-Modus = Wallet weg nach Tab schließen

**Seed-Backup ist PFLICHT:**
```
localStorage wird gelöscht bei:
- Browser Cache löschen
- Anderes Gerät
- Browser-Reset
```

**Deine einzige Rettung = 25-Wort Seed-Phrase!**

---

## 🧪 Testnet-Modus (Empfohlen für erste Tests)

1. Vercel Environment Variables ändern:
```env
NEXT_PUBLIC_MONERO_NETWORK=stagenet
NEXT_PUBLIC_MONERO_RPC_URL=http://stagenet.xmr-tw.org:38081
```

2. Testnet-XMR holen:
- https://community.xmr.to/faucet/stagenet/

---

## 🔄 Updates deployen

```bash
# Änderungen machen
git add .
git commit -m "Update feature X"
git push origin main
# → Vercel deployed automatisch!
```

---

## 📊 Monitoring

**Vercel Dashboard zeigt:**
- Deployment Status
- Error Logs
- Analytics (kostenlos bis 100k requests/Monat)

---

## ⚡ Performance

**Erwartete Werte:**
- Lighthouse Score: 95+ Mobile
- First Load: <1.5s
- Bundle Size: <100KB gzipped

**Falls langsam:**
1. Check Vercel Logs für Errors
2. Monero Node möglicherweise überlastet (wechsle RPC URL)

---

## 🆘 Troubleshooting

### "Wallets werden nicht angezeigt"
→ localStorage blocked? Überprüfe Browser Privacy Settings

### "Swap failed"
→ Check Vercel Logs → Vermutlich ChangeNOW API Issue

### "Balance zeigt 0.00 XMR"
→ Remote Node langsam, warte 10-30 Sekunden

### "Can't access deployment"
→ Deployment Protection aktiv? Passwort korrekt?

---

## 💡 Kostenübersicht

**Vercel Free Plan:**
- ✅ 100 GB Bandwidth/Monat
- ✅ 100k Edge Requests
- ✅ Unlimited Deployments
- ✅ HTTPS + CDN kostenlos

**Reicht für:**
- ~1000 Swaps/Monat
- Nur für dich persönlich

**Kosten entstehen nur durch:**
- ChangeNOW Swap Fees (0.25% pro Swap)
- KEINE Vercel-Kosten für private Nutzung
