/**
 * Monero Address Validation
 * Checks if address follows Monero format rules
 */

const BASE58_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

// Monero address prefixes
const MAINNET_PREFIXES = ['4', '8']; // Standard & Integrated
const TESTNET_PREFIXES = ['9', 'A', 'B']; // Testnet addresses

/**
 * Validates Monero address format
 * @param address - Monero address to validate
 * @param allowTestnet - Allow testnet addresses (default: false)
 * @returns Validation result with error message if invalid
 */
export function validateMoneroAddress(
  address: string,
  allowTestnet = false
): { valid: boolean; error?: string } {
  
  // Check if address exists
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Check length (Monero addresses are 95-106 characters)
  if (trimmed.length < 95 || trimmed.length > 106) {
    return { 
      valid: false, 
      error: `Invalid length: ${trimmed.length} chars (expected 95-106)` 
    };
  }

  // Check Base58 format
  if (!BASE58_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid characters (must be Base58)' 
    };
  }

  // Check prefix
  const prefix = trimmed[0];
  const validPrefixes = allowTestnet 
    ? [...MAINNET_PREFIXES, ...TESTNET_PREFIXES]
    : MAINNET_PREFIXES;

  if (!validPrefixes.includes(prefix)) {
    return { 
      valid: false, 
      error: `Invalid prefix: "${prefix}" (expected ${validPrefixes.join(', ')})` 
    };
  }

  return { valid: true };
}

/**
 * Truncates Monero address for display
 * @param address - Full Monero address
 * @param startChars - Characters to show at start (default: 8)
 * @param endChars - Characters to show at end (default: 6)
 */
export function truncateAddress(
  address: string, 
  startChars = 8, 
  endChars = 6
): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Checks if two Monero addresses are equal (case-insensitive)
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  return addr1.trim().toLowerCase() === addr2.trim().toLowerCase();
}
