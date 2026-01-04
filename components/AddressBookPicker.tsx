'use client';

import { useState, useEffect, useRef } from 'react';
import { getAddressBook, searchAddressBook } from '@/lib/storage/address-book';
import { truncateAddress } from '@/lib/utils/monero-address';
import type { AddressBookEntry } from '@/types/address-book';

interface AddressBookPickerProps {
  onSelect: (entry: AddressBookEntry) => void;
  selectedAddress?: string;
  disabled?: boolean;
}

/**
 * Autocomplete dropdown for selecting saved XMR recipients
 * Shows label + truncated address, sorted by last used
 */
export default function AddressBookPicker({ 
  onSelect, 
  selectedAddress,
  disabled = false 
}: AddressBookPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<AddressBookEntry[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load address book on mount and when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const entries = query.length > 0 
        ? searchAddressBook(query)
        : getAddressBook().sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0));
      
      setResults(entries);
      setHighlightedIndex(0);
    }
  }, [query, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  const handleSelect = (entry: AddressBookEntry) => {
    onSelect(entry);
    setQuery('');
    setIsOpen(false);
  };

  const selectedEntry = selectedAddress 
    ? results.find(e => e.address === selectedAddress)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Search saved recipients..."
          className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg 
                     text-white placeholder-gray-500 outline-none
                     focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa]/50
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
        
        {/* Selected Badge */}
        {selectedEntry && !query && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="inline-flex items-center gap-2 px-2 py-1 bg-[#00d4aa]/10 
                           border border-[#00d4aa]/30 rounded-md text-sm text-[#00d4aa]">
              <span className="font-medium">{selectedEntry.label}</span>
              <span className="text-xs text-gray-400">
                {truncateAddress(selectedEntry.address, 6, 4)}
              </span>
            </span>
          </div>
        )}

        {/* Dropdown Icon */}
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto
                        bg-black/95 backdrop-blur-md border border-white/10 rounded-lg
                        shadow-xl shadow-black/50">
          {results.map((entry, index) => (
            <button
              key={entry.id}
              onClick={() => handleSelect(entry)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left
                         transition-colors duration-150
                         ${index === highlightedIndex 
                           ? 'bg-[#00d4aa]/20 border-l-2 border-[#00d4aa]' 
                           : 'border-l-2 border-transparent hover:bg-white/5'
                         }
                         ${index !== results.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                            bg-[#00d4aa]/10 rounded-full text-[#00d4aa] mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white truncate">
                    {entry.label}
                  </span>
                  {entry.lastUsed && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatLastUsed(entry.lastUsed)}
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  {truncateAddress(entry.address, 10, 6)}
                </div>

                {entry.notes && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {entry.notes}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full px-4 py-6 text-center
                        bg-black/95 backdrop-blur-md border border-white/10 rounded-lg">
          <div className="text-gray-400 text-sm">
            {query.length > 0 ? (
              <>
                <div className="text-gray-500 mb-1">🔍</div>
                No recipients found matching &quot;{query}&quot;
              </>
            ) : (
              <>
                <div className="text-gray-500 mb-1">📭</div>
                No saved recipients yet
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format last used timestamp
 */
function formatLastUsed(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}
