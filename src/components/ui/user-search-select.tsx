'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface UserInfo {
  id: string;
  username: string;
  cocTag: string;
  photoURL: string;
}

interface UserSearchSelectProps {
  selectedUsers: UserInfo[];
  onChange: (users: UserInfo[]) => void;
  placeholder?: string;
}

export function UserSearchSelect({ selectedUsers, onChange, placeholder = "Search username or #cocTag" }: UserSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/search-users?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data.users || []);
          setIsOpen(true);
        } catch (err) {
          console.error("Failed to search users", err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (user: UserInfo) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      onChange([...selectedUsers, user]);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (userId: string) => {
    onChange(selectedUsers.filter(u => u.id !== userId));
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedUsers.map(user => (
          <Badge key={user.id} variant="secondary" className="flex items-center gap-1 py-1 px-2 border border-white/10 bg-white/5">
            <span className="text-xs truncate max-w-[100px]">{user.username}</span>
            <button
              onClick={(e) => { e.preventDefault(); handleRemove(user.id); }}
              className="ml-1 hover:text-red-400 focus:outline-none transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 bg-black/40 border-white/10 focus:border-red-500/50"
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#121212] border border-white/10 rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {results.map(user => (
            <div
              key={user.id}
              onClick={() => handleSelect(user)}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {user.photoURL ? (
                <Image src={user.photoURL} alt={user.username} width={24} height={24} className="rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs text-red-500">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{user.username}</span>
                <span className="text-xs text-muted-foreground font-mono">{user.cocTag || 'No Tag'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
