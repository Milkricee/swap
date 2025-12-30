# 🔒 Privacy & Anonymity Guide

## Maximale Privatsphäre beim Swappen

### ✅ Best Practices

**1. Netzwerk-Setup**
```bash
# Tor Browser verwenden
# Oder VPN + Tor für double-layering
```

**2. Coin-Auswahl nach Privatsphäre**
| Coin | Privatsphäre | Empfehlung |
|------|--------------|------------|
| **Monero (XMR)** | ⭐⭐⭐⭐⭐ | Ziel-Coin |
| **Bitcoin (BTC)** | ⭐⭐ | Via Lightning/CoinJoin |
| **Litecoin (LTC)** | ⭐⭐ | MWEB für Privacy |
| **Ethereum (ETH)** | ⭐ | Tornado Cash tot |
| **Solana (SOL)** | ⭐ | Transparent |

**3. Provider-Auswahl**
- **BTCSwapXMR** (0.15%) - No KYC, Tor-friendly
- **ChangeNOW** (0.25%) - No KYC bis 2 BTC
- Immer **fixed-rate** statt floating wählen

**4. Wallet-Hygiene**
- ✅ Neue Wallet-Adresse pro Swap
- ✅ 5-Wallet-Distribution aktiviert (automatisch)
- ✅ Nie direkt von Exchange zu Exchange
- ❌ Nie KYC-Exchange → XMR direkt

### 🚀 Swap-Workflow (maximal privat)

```
1. LTC von Exchange abheben
   ↓ (zu eigener Wallet)
   
2. LTC → XMR via ChangeNOW
   ↓ (fixed-rate, no account)
   
3. XMR landet in 5 Wallets
   ↓ (20%-20%-30%-20%-10%)
   
4. Hot Wallet für Payments nutzen
   ↓ (Wallet #3)
   
5. Rest bleibt verteilt (Cold Storage)
```

### ⚡ Schnellster Provider

**Jupiter** (SOL→XMR): 5-10 Min
- ❌ Aber: SOL = transparent
- ✅ Nutze nur für kleine Beträge

**BTCSwapXMR** (BTC→XMR): 15-30 Min
- ✅ No-KYC
- ✅ Tor Hidden Service verfügbar

**ChangeNOW** (LTC→XMR): 10-20 Min
- ✅ Bester Kompromiss
- ✅ Viele Coin-Paare

### 💰 Günstigste Routen

| Von | Zu | Provider | Fee | Zeit |
|-----|-----|----------|-----|------|
| BTC | XMR | BTCSwapXMR | 0.15% | 15-30m |
| LTC | XMR | ChangeNOW | 0.25% | 10-20m |
| ETH | XMR | ChangeNOW | 0.25% | 10-20m |
| SOL | XMR | Jupiter | 0.30% | 5-10m |

### 🛡️ Zusätzliche Privacy-Tipps

**Vor dem Swap:**
1. Coins von Exchange abheben
2. 24h warten (chain analysis break)
3. Optional: BTC via CoinJoin mischen
4. LTC via MWEB senden (privacy feature)

**Nach dem Swap:**
1. XMR nie sofort ausgeben
2. Mehrere Tage in Cold Wallets lagern
3. Churning: XMR an sich selbst senden (2-3x)
4. Erst dann für Payments nutzen

**Browser/VPN:**
```bash
# Tor Browser
https://www.torproject.org/download/

# Mullvad VPN (akzeptiert XMR!)
https://mullvad.net/

# Kombiniere: VPN → Tor → Swap
```

### ⚠️ Was du vermeiden solltest

❌ **Direkt von Exchange zu Exchange swappen**
❌ **Große Beträge auf einmal (> 1 BTC)**
❌ **Selbe Wallet mehrfach verwenden**
❌ **KYC-Exchanges für Privacy-Coins**
❌ **Floating-Rate Swaps (Preis ändert sich)**

### 📋 Checklist für maximale Anonymität

- [ ] Tor Browser aktiv
- [ ] VPN (optional, Mullvad)
- [ ] Coins aus eigener Wallet (nicht Exchange)
- [ ] Fixed-Rate Swap gewählt
- [ ] No-KYC Provider (BTCSwapXMR, ChangeNOW)
- [ ] 5-Wallet Distribution aktiviert
- [ ] Nach Swap: 24h+ warten vor Ausgabe
- [ ] XMR Churning (2-3 Transaktionen an sich selbst)

---

**🎯 Empfehlung für LTC→XMR:**

1. **ChangeNOW** nutzen (0.25% Fee)
2. **Fixed Rate** wählen
3. **Keine Email** angeben
4. **Tor Browser** verwenden
5. XMR landet automatisch in 5 Wallets
6. **24h warten**, dann von Hot Wallet ausgeben

**Estimated Cost für 10 LTC:**
- Swap Fee: 0.025 LTC (~$2)
- Network Fee: 0.001 LTC (~$0.08)
- **Total: ~$2.08**

**Privatsphäre-Score: 9/10** ✨
