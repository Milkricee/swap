'use client';

import { useState, useEffect } from 'react';
import { 
  getAddressBook, 
  getSortedAddressBook,
  addAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
  clearAddressBook,
} from '@/lib/storage/address-book';
import { truncateAddress } from '@/lib/utils/monero-address';
import type { AddressBookEntry, SortField, SortOrder } from '@/types/address-book';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Address Book Management UI
 * View, add, edit, and delete saved XMR recipients
 */
export default function AddressBookManager() {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('lastUsed');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ label: '', address: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load entries on mount and when sorting changes
  useEffect(() => {
    loadEntries();
  }, [sortBy, sortOrder]);

  const loadEntries = () => {
    const sorted = getSortedAddressBook(sortBy, sortOrder);
    setEntries(sorted);
  };

  const handleAdd = () => {
    setError(null);
    setSuccess(null);

    const result = addAddressBookEntry(
      formData.label,
      formData.address,
      formData.notes || undefined
    );

    if (result.success) {
      setSuccess(`✅ Added "${formData.label}" to address book`);
      setFormData({ label: '', address: '', notes: '' });
      setShowAddForm(false);
      loadEntries();
      
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to add entry');
    }
  };

  const handleUpdate = (id: string) => {
    setError(null);
    setSuccess(null);

    const result = updateAddressBookEntry(id, {
      label: formData.label || undefined,
      address: formData.address || undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setSuccess('✅ Entry updated');
      setEditingId(null);
      setFormData({ label: '', address: '', notes: '' });
      loadEntries();
      
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to update entry');
    }
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Delete "${label}" from address book?`)) {
      return;
    }

    const deleted = deleteAddressBookEntry(id);
    
    if (deleted) {
      setSuccess(`✅ Deleted "${label}"`);
      loadEntries();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Failed to delete entry');
    }
  };

  const handleClearAll = () => {
    if (!confirm('⚠️ Delete ALL saved recipients? This cannot be undone.')) {
      return;
    }

    const cleared = clearAddressBook();
    
    if (cleared) {
      setSuccess('✅ Address book cleared');
      loadEntries();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Failed to clear address book');
    }
  };

  const startEdit = (entry: AddressBookEntry) => {
    setEditingId(entry.id);
    setFormData({
      label: entry.label,
      address: entry.address,
      notes: entry.notes || '',
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ label: '', address: '', notes: '' });
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Address Book</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {entries.length} saved recipient{entries.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          {entries.length > 0 && (
            <Button
              onClick={handleClearAll}
              variant="outline"
              className="text-red-400 border-red-400/30 hover:bg-red-400/10"
            >
              Clear All
            </Button>
          )}
          
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-medium"
          >
            {showAddForm ? '✕ Cancel' : '+ Add Recipient'}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
          <h3 className="text-sm font-medium text-white">Add New Recipient</h3>
          
          <Input
            placeholder="Label (e.g., Coffee Shop)"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            maxLength={50}
          />
          
          <Input
            placeholder="XMR Address (95-106 characters)"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="font-mono text-xs"
          />
          
          <Input
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            maxLength={200}
          />

          <div className="flex gap-2">
            <Button onClick={handleAdd} className="flex-1 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black">
              Add to Address Book
            </Button>
            <Button onClick={cancelEdit} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      {entries.length > 0 && (
        <div className="flex gap-2 text-sm">
          <span className="text-gray-400">Sort by:</span>
          
          {(['lastUsed', 'label', 'createdAt'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(field);
                  setSortOrder(field === 'label' ? 'asc' : 'desc');
                }
              }}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === field
                  ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {field === 'lastUsed' && 'Last Used'}
              {field === 'label' && 'Name'}
              {field === 'createdAt' && 'Date Added'}
              {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-400">
            No saved recipients yet
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Add recipients to quickly select them for payments
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 bg-white/5 border border-white/10 rounded-lg
                         hover:border-white/20 transition-all duration-200"
            >
              {editingId === entry.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <Input
                    placeholder="Label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    maxLength={50}
                  />
                  
                  <Input
                    placeholder="XMR Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="font-mono text-xs"
                  />
                  
                  <Input
                    placeholder="Notes (optional)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    maxLength={200}
                  />

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleUpdate(entry.id)}
                      className="flex-1 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black"
                    >
                      Save Changes
                    </Button>
                    <Button onClick={cancelEdit} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">
                          {entry.label}
                        </h3>
                        {entry.lastUsed && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            Used {formatTimestamp(entry.lastUsed)}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400 font-mono mt-1 break-all">
                        {entry.address}
                      </div>

                      {entry.notes && (
                        <div className="text-sm text-gray-400 mt-2">
                          {entry.notes}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        Added {formatTimestamp(entry.createdAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(entry)}
                        className="px-3 py-1.5 text-xs text-[#00d4aa] border border-[#00d4aa]/30
                                 rounded hover:bg-[#00d4aa]/10 transition-colors"
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDelete(entry.id, entry.label)}
                        className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30
                                 rounded hover:bg-red-400/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
