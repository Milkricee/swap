// Example usage of TX Status Verification UI Components

import TransactionRow from '@/components/TransactionRow';

// ============================================
// EXAMPLE 1: Payment (Pending)
// ============================================
const pendingPayment = {
  id: 'payment-1',
  timestamp: Date.now() - 120000, // 2 minutes ago
  amount: '2.45372',
  recipient: '4Adk5h7y9x3b2c1...',
  status: 'pending',
  txHash: 'a3f5b2c9d8e1f7g4...',
  fromWallet: 3,
  fee: '0.000012',
  lastChecked: Date.now() - 60000, // Checked 1 min ago
};

/*
UI Output:
┌─────────────────────────────────────────────────────────┐
│ [💸] Payment                    -2.45372 XMR            │
│     2m ago • To 4Adk...5h7y   [⏳ pending] [▶] [🔄]     │
│                                  ↑ Badge    ↑    ↑      │
│                             (Tooltip)   Details Check   │
└─────────────────────────────────────────────────────────┘

Tooltip on Badge: "Last checked: 2:30 PM"
Tooltip on [🔄]: "Last checked: 2:30 PM"
*/

// ============================================
// EXAMPLE 2: Payment (Confirmed)
// ============================================
const confirmedPayment = {
  id: 'payment-2',
  timestamp: Date.now() - 3600000, // 1 hour ago
  amount: '0.5',
  recipient: '48vN3k9s2m7p...',
  status: 'confirmed',
  txHash: 'b4g6c3d9e2f8h5...',
  fromWallet: 3,
  fee: '0.000010',
  lastChecked: Date.now() - 300000, // Checked 5 min ago
};

/*
UI Output:
┌─────────────────────────────────────────────────────────┐
│ [💸] Payment                    -0.5 XMR                │
│     1h ago • To 48vN...2m7p   [✅ confirmed] [▶]        │
│                                  ↑ Green Badge           │
│                               (No Check Button)          │
└─────────────────────────────────────────────────────────┘

Note: No "Check Status" button because already confirmed
*/

// ============================================
// EXAMPLE 3: Swap (Timeout)
// ============================================
const timeoutSwap = {
  id: 'swap-3',
  timestamp: Date.now() - 1800000, // 30 min ago
  depositAmount: '0.001',
  depositCurrency: 'BTC',
  receiveAmount: '0.5',
  receiveCurrency: 'XMR',
  status: 'timeout',
  provider: 'btcswapxmr',
  orderId: 'btcswap-123456',
  depositAddress: '8vN3k9s2m7p...',
  canRetry: true,
  retryCount: 0,
  createdAt: Date.now() - 1800000,
  timeoutAt: Date.now(),
  errorMessage: 'No deposit detected within 30 minutes',
};

/*
UI Output:
┌─────────────────────────────────────────────────────────┐
│ [↔️] Swap BTC → XMR             +0.5 XMR                │
│     30m ago • btcswapxmr      [⏰ timeout] [▶] [🔄 Retry]│
│                                  ↑ Orange Badge   ↑      │
│                                                Retry Btn  │
└─────────────────────────────────────────────────────────┘

Expanded Details:
┌─────────────────────────────────────────────────────────┐
│ Order ID: btcswap-123456                                │
│ Deposit Address: 8vN3...2m7p                            │
│ Deposit Amount: 0.001 BTC                               │
│ Expected: 0.5 XMR                                       │
│                                                         │
│ [⏰ Swap Timed Out]                                     │
│ No deposit detected within 30 minutes. You can retry    │
│ the swap or contact btcswapxmr support with Order ID:   │
│ btcswap-123456                                          │
└─────────────────────────────────────────────────────────┘
*/

// ============================================
// EXAMPLE 4: Payment with Expanded Details
// ============================================
/*
User clicks [▶] Button:

┌─────────────────────────────────────────────────────────┐
│ [💸] Payment                    -2.45372 XMR            │
│     2m ago • To 4Adk...5h7y   [⏳ pending] [▼] [🔄]     │
├─────────────────────────────────────────────────────────┤
│ TX Hash: a3f5b2c9...e1f7g4 [🔗] [📋]                   │
│          ↑ Click → Opens XMRChain.net in new tab        │
│          ↑ Copy Button                                  │
│                                                         │
│ Network Fee: 0.000012 XMR                               │
│ From Wallet: Wallet #3 (Hot)                            │
│ Recipient: 4Adk5h7y9x3b2c1f6g8j9...                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔍 Manual Verification                              │ │
│ │ 1. Click TX hash link above → XMRChain.net          │ │
│ │ 2. Check confirmations (10+ = confirmed)            │ │
│ │ 3. Verify recipient address matches                 │ │
│ │ Status updates automatically every 60 seconds       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
*/

// ============================================
// EXAMPLE 5: Manual Check Flow
// ============================================
/*
Step 1: User clicks "🔄 Check Status"
┌─────────────────────────────────────────────────────────┐
│ ... [⏳ pending] [▶] [⚙️ Checking...]                   │
│                       ↑ Spinner animation                │
└─────────────────────────────────────────────────────────┘

Step 2: API Response (Alert Dialog)
┌─────────────────────────────────────┐
│  ⏳ Transaction Status               │
├─────────────────────────────────────┤
│  In mempool (unconfirmed)           │
│  Current confirmations: 3           │
│                                     │
│  [OK]                               │
└─────────────────────────────────────┘

Step 3: After check complete
┌─────────────────────────────────────────────────────────┐
│ ... [⏳ pending] [▶] [🔄 Check Status]                  │
│                       ↑ Tooltip: "Last checked: 2:35 PM"│
└─────────────────────────────────────────────────────────┘

Step 4: If confirmed (after 10+ confirmations)
┌─────────────────────────────────────┐
│  ✅ Transaction Confirmed!           │
├─────────────────────────────────────┤
│  12 confirmations                   │
│                                     │
│  [OK]                               │
└─────────────────────────────────────┘
→ Page reloads → Badge changes to [✅ confirmed]
*/

// ============================================
// EXAMPLE 6: Failed Payment
// ============================================
const failedPayment = {
  id: 'payment-6',
  timestamp: Date.now() - 900000, // 15 min ago
  amount: '1.0',
  recipient: '42jN9m8k...',
  status: 'failed',
  txHash: undefined, // No TX hash for failed payment
  fromWallet: 3,
  lastChecked: Date.now() - 600000,
};

/*
UI Output:
┌─────────────────────────────────────────────────────────┐
│ [💸] Payment                    -1.0 XMR                │
│     15m ago • To 42jN...8k    [❌ failed]               │
│                                  ↑ Red Badge             │
│                               (No buttons - no TX hash)  │
└─────────────────────────────────────────────────────────┘
*/

// ============================================
// STATUS BADGE COLOR REFERENCE
// ============================================
/*
┌──────────────┬────────┬──────┬─────────────────────────┐
│ Status       │ Color  │ Icon │ Meaning                 │
├──────────────┼────────┼──────┼─────────────────────────┤
│ confirmed    │ 🟢 Green │ ✅  │ 10+ confirmations       │
│ pending      │ 🟡 Yellow│ ⏳  │ < 10 confirmations      │
│ processing   │ 🔵 Blue  │ ⚙️  │ Swap in progress        │
│ failed       │ 🔴 Red   │ ❌  │ TX failed               │
│ timeout      │ 🟠 Orange│ ⏰  │ Swap timeout (30min)    │
│ cancelled    │ ⚪ Gray  │ ⊘   │ User cancelled          │
└──────────────┴────────┴──────┴─────────────────────────┘
*/

// ============================================
// EXPLORER LINKS
// ============================================
/*
Available Explorers (lib/utils/explorer.ts):

1. XMRChain.net (Default)
   https://xmrchain.net/tx/a3f5b2...

2. LocalMonero Explorer
   https://localmonero.co/blocks/search/a3f5b2...

3. MoneroScan
   https://moneroscan.io/tx/a3f5b2...

Usage:
import { getExplorerUrl, getExplorerName } from '@/lib/utils/explorer';

const url = getExplorerUrl(txHash); // Default: XMRChain
const url2 = getExplorerUrl(txHash, 'localmonero');
const name = getExplorerName(); // "XMRChain.net"
*/

// ============================================
// API ENDPOINT
// ============================================
/*
Manual Status Check:

GET /api/tx-status?txHash=a3f5b2c9d8e1f7g4...

Response (Success):
{
  "status": "pending",
  "confirmations": 3,
  "blockHeight": null,
  "inTxPool": true
}

Response (Confirmed):
{
  "status": "confirmed",
  "confirmations": 12,
  "blockHeight": 3234567,
  "inTxPool": false
}

Response (Error):
{
  "error": "Failed to check transaction status",
  "details": "TX not found in mempool or blockchain"
}

Rate Limit:
- Max 10 requests per minute (per IP)
- Header: X-RateLimit-Remaining: 7
*/

// ============================================
// DEVELOPER NOTES
// ============================================
/*
Adding Custom Status:

1. Extend Type (if needed):
   type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'custom';

2. Add Color Mapping:
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'custom':
         return 'text-purple-400';
       // ...
     }
   };

3. Add Icon:
   const getStatusIcon = (status: string) => {
     switch (status) {
       case 'custom':
         return '🎯';
       // ...
     }
   };

4. Update StatusBadge background color:
   backgroundColor: status === 'custom' 
     ? 'rgba(168, 85, 247, 0.1)' 
     : ...
*/

export {
  pendingPayment,
  confirmedPayment,
  timeoutSwap,
  failedPayment,
};
