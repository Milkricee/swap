/**
 * Address Book Types
 * For storing and managing recurring XMR payment recipients
 */

export interface AddressBookEntry {
  id: string; // Unique identifier (timestamp-based)
  label: string; // User-friendly name (e.g., "Coffee Shop", "VPN Provider")
  address: string; // Monero address (95-106 characters)
  createdAt: number; // Timestamp when entry was created
  lastUsed?: number; // Timestamp when last used for payment (optional)
  notes?: string; // Optional memo/notes (max 200 chars)
}

export interface AddressBookStats {
  totalEntries: number;
  mostUsed?: AddressBookEntry;
  recentlyAdded: AddressBookEntry[];
}

export type SortField = 'label' | 'lastUsed' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
