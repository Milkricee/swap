# WalletView.tsx - Production Testing Guide

## ✅ Implemented Features

### 1. Real Balance Loading
```typescript
// Automatically fetches real balances from lib/wallets/getWalletBalance()
// On component mount + manual refresh button
useEffect(() => loadWallets(), []);
```

### 2. Consolidate to Hot Wallet Button
- **Action**: Moves funds from all Cold Wallets → Hot Wallet #2
- **Location**: Top right of "Wallet Distribution" section
- **API**: `POST /api/wallets/consolidate` with `{targetAmount: coldWalletsTotal}`
- **Confirmation**: Shows total amount before execution

### 3. Wallet Type Badges
- **Hot Wallet (#2)**: Orange badge + orange ring border
  - `bg-orange-500/20 text-orange-400 border-orange-500/30`
  - Special ring: `ring-2 ring-orange-500/30`
- **Cold Wallets (#0, #1, #3, #4)**: Gray badges
  - `bg-gray-500/20 text-gray-400 border-gray-500/30`

### 4. Total Balance Display
```typescript
const totalBalance = useMemo(() => 
  wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0),
  [wallets]
);
```
- Shows sum of all 5 wallets in large centered display
- Updated after consolidation

### 5. Mobile-Responsive Grid
```css
grid grid-cols-1          /* Mobile: 320px+ */
sm:grid-cols-2            /* Tablet: 640px+ */
lg:grid-cols-5            /* Desktop: 1024px+ */
```

## 🧪 Testing Checklist

### Test 1: Wallet Creation
1. Open `http://localhost:3000`
2. Click **"Create Wallet"** button
3. ✅ Verify 5 wallet cards appear in grid
4. ✅ Check Wallet #2 has **HOT** orange badge
5. ✅ Check Wallets #0, #1, #3, #4 have **COLD** gray badges

### Test 2: Balance Loading
```bash
# Open browser console (F12)
# Check network requests to /api/wallets
# Should see real XMR balances (initially 0.000000)
```

### Test 3: Refresh Balance Button
1. Click **Refresh** button (↻ icon)
2. ✅ Icon should spin during load
3. ✅ Balances should update from blockchain

### Test 4: Consolidate to Hot Wallet
**Prerequisites**: Need funds in Cold Wallets (test with swap first)

1. After receiving swap funds (distributed 20% each to 5 wallets)
2. Click **"Consolidate to Hot"** button
3. ✅ Confirmation dialog shows total cold wallet amount
4. Click "OK"
5. ✅ Button text changes to "Consolidating..."
6. ✅ Button shows bounce animation on icon
7. ✅ Success alert shows exact amount consolidated
8. ✅ Hot Wallet #2 balance increases
9. ✅ Cold Wallets show 0.000000 XMR

### Test 5: Mobile Responsive Grid
**Resize browser window to test breakpoints:**

- **320px - 639px**: 1 column (vertical stack)
- **640px - 1023px**: 2 columns
- **1024px+**: 5 columns (horizontal row)

### Test 6: API Consolidation Endpoint
```bash
# PowerShell test (after creating wallets)
$body = @{targetAmount = 2.5} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/wallets/consolidate" `
  -Method POST -Body $body -ContentType "application/json"

# Expected Response:
# {
#   "success": true,
#   "targetAmount": 2.5,
#   "wallets": [...] // Updated wallet array
# }
```

## 🔧 Component Structure

```tsx
WalletView.tsx
├── State Management
│   ├── wallets: XMRWallet[] | null
│   ├── loading, refreshing, consolidating
│   └── showDetails, copied
│
├── Functions
│   ├── loadWallets() → GET /api/wallets
│   ├── handleCreateWallet() → POST /api/wallets/create
│   ├── handleRefreshBalance() → Re-fetch balances
│   ├── handleConsolidateToHot() → POST /api/wallets/consolidate
│   └── handleCopyAddress() → Copy primary address
│
└── UI Sections
    ├── Total Balance (centered, large)
    ├── Primary Address (Wallet #2 - Hot)
    ├── Wallet Distribution Grid (5 cards)
    │   ├── Wallet #0 (COLD)
    │   ├── Wallet #1 (COLD)
    │   ├── Wallet #2 (HOT) ← Orange Badge
    │   ├── Wallet #3 (COLD)
    │   └── Wallet #4 (COLD)
    └── Quick Info Cards (2-col grid)
```

## 🎨 Design Tokens

```css
/* Hot Wallet Colors */
--hot-bg: rgba(249, 115, 22, 0.2)     /* orange-500/20 */
--hot-text: rgb(251, 146, 60)         /* orange-400 */
--hot-border: rgba(249, 115, 22, 0.3) /* orange-500/30 */
--hot-ring: rgba(249, 115, 22, 0.3)   /* ring-2 */

/* Cold Wallet Colors */
--cold-bg: rgba(107, 114, 128, 0.2)    /* gray-500/20 */
--cold-text: rgb(156, 163, 175)        /* gray-400 */
--cold-border: rgba(107, 114, 128, 0.3) /* gray-500/30 */
```

## 📊 Expected Behavior After Swap

**Scenario**: User swaps 0.5 BTC → ~175 XMR

**Initial Distribution** (lib/wallets/distribution.ts):
```
Wallet #0 (Cold):    35 XMR  (20%)
Wallet #1 (Cold):    35 XMR  (20%)
Wallet #2 (Hot):     52.5 XMR (30%)
Wallet #3 (Cold):    35 XMR  (20%)
Wallet #4 (Reserve): 17.5 XMR (10%)
```

**After "Consolidate to Hot"**:
```
Wallet #0 (Cold):    0 XMR
Wallet #1 (Cold):    0 XMR
Wallet #2 (Hot):     175 XMR  ← All funds
Wallet #3 (Cold):    0 XMR
Wallet #4 (Reserve): 0 XMR
```

## ⚠️ Known Limitations

1. **Blockchain Sync**: First balance load may take 10-30 seconds
2. **Consolidation Time**: Transfers take ~2 minutes to confirm
3. **Rate Limiting**: Consolidation limited to 5 requests/minute
4. **Browser Console**: Use `await getWalletSeed(2)` to backup Hot Wallet seed

## 🔗 Related Files

- `/lib/wallets/index.ts` - Wallet creation & consolidation logic
- `/lib/wallets/distribution.ts` - 5-wallet distribution percentages
- `/app/api/wallets/consolidate/route.ts` - Consolidation API endpoint
- `/app/api/wallets/route.ts` - Balance fetching endpoint
- `/types/wallet.ts` - XMRWallet & EncryptedWalletData interfaces

## 🚀 Next Steps

1. ✅ **Test Balance Loading**: Verify real balances sync from blockchain
2. ✅ **Test Consolidation**: Execute cold → hot transfer
3. ⏳ **Test Payment Flow**: Use consolidated Hot Wallet for 1-click payments
4. ⏳ **Performance Check**: Measure balance refresh time with Lighthouse

---

**Last Updated**: December 31, 2025  
**Dev Server**: http://localhost:3000  
**Status**: ✅ Ready for Testing
