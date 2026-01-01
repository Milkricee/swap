# XMR Swap App - Seed Backup Guide

## 🔐 CRITICAL: Backup Your Wallet Seeds

After creating wallets, **IMMEDIATELY** backup your mnemonic seeds:

### Step 1: Open Browser Console
```
Press F12 (or Ctrl+Shift+I)
Navigate to "Console" tab
```

### Step 2: Extract All Seeds
```javascript
// Copy and run this in console:
for (let i = 0; i < 5; i++) {
  const seed = await getWalletSeed(i);
  console.log(`Wallet ${i}: ${seed}`);
}
```

### Step 3: Save Seeds Securely

**Option A: Password Manager (Recommended)**
- KeePass
- Bitwarden
- 1Password
- Create entry: "XMR Swap Wallets"
- Store all 5 seeds as separate fields

**Option B: Encrypted File**
```bash
# Create text file with seeds
# Encrypt with 7-Zip/VeraCrypt
# Store on USB drive + cloud backup
```

**Option C: Paper Backup**
```
Print seeds on paper
Store in safe/vault
Keep 2 copies in different locations
```

### Seed Format
```
Wallet 0 (Cold): word1 word2 ... word25
Wallet 1 (Cold): word1 word2 ... word25
Wallet 2 (Hot):  word1 word2 ... word25
Wallet 3 (Cold): word1 word2 ... word25
Wallet 4 (Reserve): word1 word2 ... word25
```

## ⚠️ SECURITY RULES

1. **NEVER** share seeds online
2. **NEVER** store in plain text cloud (Google Docs, Dropbox)
3. **NEVER** email seeds to yourself
4. **ALWAYS** use encryption
5. **ALWAYS** have 2+ backups in different locations

## 🔄 Restore Wallets

If you lose localStorage data:

```javascript
// In browser console:
import { MoneroWalletFull } from 'monero-javascript';

// Restore wallet from seed
const wallet = await MoneroWalletFull.createWallet({
  networkType: MoneroNetworkType.MAINNET,
  mnemonic: "your 25 word seed phrase here",
  restoreHeight: 0, // or block height when wallet was created
});

const address = await wallet.getPrimaryAddress();
console.log('Restored address:', address);
```

## 📋 Checklist

- [ ] Seeds backed up in password manager
- [ ] Seeds written on paper (2 copies)
- [ ] Seeds encrypted on USB drive
- [ ] Test restore with 1 wallet
- [ ] Delete browser localStorage test
- [ ] Verify you can recover

## 🆘 Lost Seeds?

**Without seeds = PERMANENT LOSS!**

There is **NO WAY** to recover wallets without the mnemonic seeds.

LocalStorage can be cleared by:
- Clearing browser data
- Reinstalling browser
- Hard drive failure
- Accidental deletion

**BACKUP NOW!**
