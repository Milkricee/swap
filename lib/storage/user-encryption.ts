/**
 * User-Password-Based Encryption
 * 
 * CRITICAL: Replaces static NEXT_PUBLIC_ENCRYPTION_KEY with user-generated password
 * Uses PBKDF2 for key derivation (100k iterations)
 */

export interface UserKeyDerivation {
  salt: string; // Base64 encoded
  iterations: number;
  keyLength: number;
}

/**
 * Generate encryption key from user password
 */
export async function deriveKeyFromPassword(
  password: string,
  saltBase64?: string
): Promise<{ key: string; salt: string }> {
  // Generate or reuse salt
  const salt = saltBase64
    ? Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));

  // Derive key using PBKDF2
  const passwordBuffer = new TextEncoder().encode(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // 100k iterations (OWASP recommended)
      hash: 'SHA-256',
    },
    importedKey,
    256 // 256-bit key
  );

  // Convert to hex string
  const keyArray = Array.from(new Uint8Array(derivedBits));
  const keyHex = keyArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    key: keyHex,
    salt: btoa(String.fromCharCode(...salt)), // Base64 encode
  };
}

/**
 * Store salt in localStorage (NOT the key!)
 */
export function storeSalt(salt: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('xmr_wallet_salt', salt);
}

/**
 * Get salt from localStorage
 */
export function getSalt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('xmr_wallet_salt');
}

/**
 * Verify password against stored encrypted data
 */
export async function verifyPassword(
  password: string,
  encryptedTestData: string
): Promise<boolean> {
  try {
    const salt = getSalt();
    if (!salt) return false;

    const { key } = await deriveKeyFromPassword(password, salt);

    // Try to decrypt test data
    const CryptoJS = (await import('crypto-js')).default;
    const decrypted = CryptoJS.AES.decrypt(encryptedTestData, key);
    const text = decrypted.toString(CryptoJS.enc.Utf8);

    return text === 'valid'; // Test string
  } catch {
    return false;
  }
}

/**
 * Create encrypted test data for password verification
 */
export async function createPasswordTest(password: string): Promise<string> {
  const { key, salt } = await deriveKeyFromPassword(password);
  storeSalt(salt);

  const CryptoJS = (await import('crypto-js')).default;
  return CryptoJS.AES.encrypt('valid', key).toString();
}

/**
 * Encrypt data with user password
 */
export async function encryptWithPassword(
  data: string,
  password: string
): Promise<string> {
  const salt = getSalt();
  if (!salt) throw new Error('No salt found - password not initialized');

  const { key } = await deriveKeyFromPassword(password, salt);

  const CryptoJS = (await import('crypto-js')).default;
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Decrypt data with user password
 */
export async function decryptWithPassword(
  encrypted: string,
  password: string
): Promise<string> {
  const salt = getSalt();
  if (!salt) throw new Error('No salt found');

  const { key } = await deriveKeyFromPassword(password, salt);

  const CryptoJS = (await import('crypto-js')).default;
  const decrypted = CryptoJS.AES.decrypt(encrypted, key);
  const text = decrypted.toString(CryptoJS.enc.Utf8);

  if (!text) {
    throw new Error('Decryption failed - invalid password');
  }

  return text;
}

/**
 * Change password (re-encrypt all data)
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  try {
    // Get current encrypted data
    const walletsEncrypted = localStorage.getItem('xmr_wallets_encrypted');
    if (!walletsEncrypted) return false;

    // Decrypt with old password
    const wallets = await decryptWithPassword(walletsEncrypted, oldPassword);
    if (!wallets) return false;

    // Generate new salt + key
    const { key: newKey, salt: newSalt } = await deriveKeyFromPassword(newPassword);
    storeSalt(newSalt);

    // Re-encrypt with new password
    const CryptoJS = (await import('crypto-js')).default;
    const newEncrypted = CryptoJS.AES.encrypt(JSON.stringify(wallets), newKey).toString();
    localStorage.setItem('xmr_wallets_encrypted', newEncrypted);

    // Update password test
    await createPasswordTest(newPassword);

    return true;
  } catch (error) {
    console.error('Password change failed:', error);
    return false;
  }
}
