/**
 * Address Book Storage
 * Encrypted local storage for XMR payment recipients
 * Uses same encryption as wallet storage (crypto-js AES)
 */

import CryptoJS from 'crypto-js';
import type { AddressBookEntry, SortField, SortOrder } from '@/types/address-book';
import { validateMoneroAddress } from '@/lib/utils/monero-address';

const STORAGE_KEY = 'xmr-address-book';
const MAX_LABEL_LENGTH = 50;
const MAX_NOTES_LENGTH = 200;

/**
 * Get user's encryption password from session
 */
function getEncryptionKey(): string | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    return sessionStorage.getItem('user-password');
  } catch (error) {
    console.error('Failed to get encryption key:', error);
    return null;
  }
}

/**
 * Load all address book entries (decrypted)
 */
export function getAddressBook(): AddressBookEntry[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return [];
    }

    const password = getEncryptionKey();
    if (!password) {
      console.warn('No encryption key - returning empty address book');
      return [];
    }

    const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      console.error('Failed to decrypt address book');
      return [];
    }

    const entries: AddressBookEntry[] = JSON.parse(decrypted);
    return Array.isArray(entries) ? entries : [];

  } catch (error) {
    console.error('Failed to load address book:', error);
    return [];
  }
}

/**
 * Save address book entries (encrypted)
 */
function saveAddressBook(entries: AddressBookEntry[]): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const password = getEncryptionKey();
    if (!password) {
      throw new Error('No encryption key available');
    }

    const json = JSON.stringify(entries);
    const encrypted = CryptoJS.AES.encrypt(json, password).toString();
    
    localStorage.setItem(STORAGE_KEY, encrypted);
    return true;

  } catch (error) {
    console.error('Failed to save address book:', error);
    return false;
  }
}

/**
 * Add new entry to address book
 */
export function addAddressBookEntry(
  label: string,
  address: string,
  notes?: string
): { success: boolean; error?: string; entry?: AddressBookEntry } {
  
  // Validate label
  if (!label || label.trim().length === 0) {
    return { success: false, error: 'Label is required' };
  }

  if (label.length > MAX_LABEL_LENGTH) {
    return { 
      success: false, 
      error: `Label too long (max ${MAX_LABEL_LENGTH} characters)` 
    };
  }

  // Validate address
  const addressValidation = validateMoneroAddress(address);
  if (!addressValidation.valid) {
    return { success: false, error: addressValidation.error };
  }

  // Validate notes
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return { 
      success: false, 
      error: `Notes too long (max ${MAX_NOTES_LENGTH} characters)` 
    };
  }

  // Check for duplicates
  const existing = getAddressBook();
  const duplicate = existing.find(
    e => e.address.toLowerCase() === address.trim().toLowerCase()
  );

  if (duplicate) {
    return { 
      success: false, 
      error: `Address already exists with label "${duplicate.label}"` 
    };
  }

  // Create new entry
  const entry: AddressBookEntry = {
    id: `addr-${Date.now()}`,
    label: label.trim(),
    address: address.trim(),
    createdAt: Date.now(),
    notes: notes?.trim(),
  };

  // Save
  const updated = [...existing, entry];
  const saved = saveAddressBook(updated);

  if (!saved) {
    return { success: false, error: 'Failed to save to storage' };
  }

  return { success: true, entry };
}

/**
 * Update existing entry
 */
export function updateAddressBookEntry(
  id: string,
  updates: Partial<Pick<AddressBookEntry, 'label' | 'address' | 'notes'>>
): { success: boolean; error?: string } {
  
  const entries = getAddressBook();
  const index = entries.findIndex(e => e.id === id);

  if (index === -1) {
    return { success: false, error: 'Entry not found' };
  }

  // Validate updates
  if (updates.label !== undefined) {
    if (!updates.label || updates.label.trim().length === 0) {
      return { success: false, error: 'Label cannot be empty' };
    }
    if (updates.label.length > MAX_LABEL_LENGTH) {
      return { success: false, error: `Label too long (max ${MAX_LABEL_LENGTH} chars)` };
    }
  }

  if (updates.address !== undefined) {
    const validation = validateMoneroAddress(updates.address);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check for duplicate address (excluding current entry)
    const duplicate = entries.find(
      e => e.id !== id && e.address.toLowerCase() === updates.address!.trim().toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `Address already exists with label "${duplicate.label}"` };
    }
  }

  if (updates.notes !== undefined && updates.notes.length > MAX_NOTES_LENGTH) {
    return { success: false, error: `Notes too long (max ${MAX_NOTES_LENGTH} chars)` };
  }

  // Apply updates
  entries[index] = {
    ...entries[index],
    ...updates,
    label: updates.label?.trim() ?? entries[index].label,
    address: updates.address?.trim() ?? entries[index].address,
    notes: updates.notes?.trim(),
  };

  const saved = saveAddressBook(entries);
  return saved 
    ? { success: true } 
    : { success: false, error: 'Failed to save changes' };
}

/**
 * Delete entry from address book
 */
export function deleteAddressBookEntry(id: string): boolean {
  const entries = getAddressBook();
  const filtered = entries.filter(e => e.id !== id);

  if (filtered.length === entries.length) {
    return false; // Entry not found
  }

  return saveAddressBook(filtered);
}

/**
 * Mark entry as used (updates lastUsed timestamp)
 */
export function markAddressUsed(id: string): void {
  const entries = getAddressBook();
  const index = entries.findIndex(e => e.id === id);

  if (index !== -1) {
    entries[index].lastUsed = Date.now();
    saveAddressBook(entries);
  }
}

/**
 * Find entry by address
 */
export function findEntryByAddress(address: string): AddressBookEntry | null {
  const entries = getAddressBook();
  return entries.find(
    e => e.address.toLowerCase() === address.trim().toLowerCase()
  ) || null;
}

/**
 * Get sorted address book
 */
export function getSortedAddressBook(
  sortBy: SortField = 'lastUsed',
  order: SortOrder = 'desc'
): AddressBookEntry[] {
  const entries = getAddressBook();

  return entries.sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortBy) {
      case 'lastUsed':
        aValue = a.lastUsed ?? 0;
        bValue = b.lastUsed ?? 0;
        break;
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      case 'label':
        aValue = a.label.toLowerCase();
        bValue = b.label.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Search address book by label or address
 */
export function searchAddressBook(query: string): AddressBookEntry[] {
  if (!query || query.trim().length === 0) {
    return getAddressBook();
  }

  const lowerQuery = query.toLowerCase();
  const entries = getAddressBook();

  return entries.filter(
    e => 
      e.label.toLowerCase().includes(lowerQuery) ||
      e.address.toLowerCase().includes(lowerQuery) ||
      (e.notes && e.notes.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Clear entire address book
 */
export function clearAddressBook(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear address book:', error);
    return false;
  }
}
