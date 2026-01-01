/**
 * Payment History Management
 * Stores and retrieves payment records from localStorage
 */

export interface PaymentRecord {
  id: string;
  timestamp: number;
  amount: string; // XMR amount
  recipient: string; // XMR address
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  fromWallet: number; // Wallet 1-5
  fee?: string; // Transaction fee in XMR
}

const STORAGE_KEY = 'payment_history';
const MAX_RECORDS = 50;

/**
 * Save payment to history
 * Auto-trims to last 50 records
 */
export function savePaymentToHistory(payment: PaymentRecord): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getPaymentHistory();
    
    // Add new payment to beginning
    history.unshift(payment);
    
    // Keep only last 50 records
    if (history.length > MAX_RECORDS) {
      history.splice(MAX_RECORDS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Payment saved to history:', payment.id);
    }
  } catch (error) {
    console.error('Failed to save payment to history:', error);
  }
}

/**
 * Get all payment history
 * Returns empty array if none found
 */
export function getPaymentHistory(): PaymentRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load payment history:', error);
    return [];
  }
}

/**
 * Get single payment by ID
 */
export function getPaymentById(id: string): PaymentRecord | null {
  const history = getPaymentHistory();
  return history.find(p => p.id === id) || null;
}

/**
 * Update payment status
 * Used when transaction confirms on blockchain
 */
export function updatePaymentStatus(
  id: string,
  status: PaymentRecord['status'],
  txHash?: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getPaymentHistory();
    const index = history.findIndex(p => p.id === id);
    
    if (index !== -1) {
      history[index].status = status;
      if (txHash) {
        history[index].txHash = txHash;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Payment ${id} updated to ${status}`);
      }
    }
  } catch (error) {
    console.error('Failed to update payment status:', error);
  }
}

/**
 * Clear all payment history
 * WARNING: Irreversible action
 */
export function clearPaymentHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Payment history cleared');
    }
  } catch (error) {
    console.error('Failed to clear payment history:', error);
  }
}

/**
 * Get payment statistics
 */
export function getPaymentStats() {
  const history = getPaymentHistory();
  
  const totalXMR = history.reduce((sum, p) => {
    return sum + parseFloat(p.amount || '0');
  }, 0);
  
  const totalFees = history.reduce((sum, p) => {
    return sum + parseFloat(p.fee || '0');
  }, 0);
  
  return {
    totalPayments: history.length,
    totalXMR: totalXMR.toFixed(12),
    totalFees: totalFees.toFixed(12),
    confirmed: history.filter(p => p.status === 'confirmed').length,
    pending: history.filter(p => p.status === 'pending').length,
    failed: history.filter(p => p.status === 'failed').length,
  };
}
