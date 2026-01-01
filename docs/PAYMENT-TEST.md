# PaymentForm Test Guide

## Quick Test: 2.45372 XMR → test-address

### Test Setup
1. Open http://localhost:3000
2. Scroll to "Smart Pay" section
3. Enter test data

### Test Case: Exact Payment Simulation

**Input:**
```
Shop Address: 4AdkPJoxn7JCvAby9szgnt93MSEwdWWLPJJPBkSTa3cQJBz3hLXr8FKx6CxnkJKPT9mBJNWvr6pVUGPcZe6Jbp9iL3NQ1EJ
Exact Amount: 2.45372
```

**Expected Flow:**
1. Click "Smart Pay (1 Tx)"
2. Status: "🔄 Checking wallets..."
3. Status: "🔄 Collecting funds..." (if consolidation needed)
4. Status: "💸 Sending payment..."
5. Status: "✅ Sent! 2.45372 XMR"
6. TxID displayed: `tx: simulated-tx-[timestamp]`

### Backend Simulation
The `/api/pay` endpoint currently returns:
```json
{
  "status": {
    "stage": "completed",
    "message": "Payment successful",
    "txId": "simulated-tx-1735689123456"
  },
  "consolidationNeeded": true
}
```

### What Happens Behind the Scenes
1. **Rate Limiting Check**: Max 5 payments/minute
2. **Input Validation**: Zod schema validates address + amount
3. **Smart Consolidation**: 
   - Checks Hot Wallet #3 balance
   - If insufficient → consolidates from Wallets 1,2,4,5
   - Adds 1% buffer for fees (2.45372 → 2.478 XMR consolidated)
4. **Exact Payment**: Sends EXACTLY 2.45372 XMR to shop address
5. **Return**: TxID + status

### Testing Different Scenarios

#### Scenario 1: Insufficient Funds
```
Amount: 999.99
Expected: ❌ Error - "Insufficient funds across all wallets"
```

#### Scenario 2: Invalid Address
```
Address: "invalid-address"
Expected: ❌ Error - "Invalid request" (Zod validation)
```

#### Scenario 3: Rate Limit
```
Send 6 payments rapidly
Expected: ❌ Error - "Rate limit exceeded"
```

#### Scenario 4: Success with Consolidation
```
Amount: 2.45372
Hot Wallet Balance: 1.5 XMR (insufficient)
Expected: 
- Consolidates from other wallets
- Sends exact 2.45372 XMR
- ✅ Success
```

## UI Features Implemented

✅ **Input Fields**
- Shop Address (XMR format validation)
- Exact Amount (6 decimal precision)

✅ **Smart Pay Button**
- Disabled when loading or fields empty
- Shows animated loading state

✅ **Status Display**
- Real-time progress updates
- Color-coded stages (yellow → blue → green)
- TxID display on success
- Error messages on failure

✅ **Auto-clear**
- Form resets 5 seconds after successful payment

✅ **Info Box**
- Explains 1-click payment flow
- +1% fee buffer note

## Mobile Optimization
- Touch targets: 48x48px minimum
- Glassmorphism cards
- Responsive layout
- Dark mode only (#00d4aa accent)

## Next Steps for Production
1. Replace `simulated-tx-*` with real Monero transaction IDs
2. Implement actual wallet consolidation with monero-javascript
3. Add transaction confirmation polling
4. Store payment history in encrypted localStorage
5. Add QR code scanner for shop addresses
