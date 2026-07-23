'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

export function MultiSelect({ options, selectedIds, onChange, placeholder = 'Select items...', name, required }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden inputs for native form submission */}
      {name && selectedIds.map(id => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      
      {required && (
        <input
          type="text"
          required
          value={selectedIds.length > 0 ? 'selected' : ''}
          onChange={() => {}}
          className="absolute opacity-0 w-0 h-0 border-0 p-0 -z-10"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      
      <div
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary cursor-text",
          isOpen ? "ring-1 ring-primary border-primary" : ""
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedOptions.length === 0 && !search && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          
          {selectedOptions.map(option => (
            <span
              key={option.id}
              className="flex items-center gap-1 rounded bg-primary/10 pl-2 pr-1 py-1 text-xs font-medium text-primary"
            >
              {option.name}
              <button
                type="button"
                onClick={(e) => removeOption(option.id, e)}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option.name}</span>
              </button>
            </span>
          ))}
          
          <input
            type="text"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[80px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedOptions.length === 0 ? "" : "Search..."}
          />
        </div>
        
        <div className="flex shrink-0 items-center gap-1 ml-2 text-muted-foreground">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="p-1 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-base shadow-md sm:text-sm">
          {filteredOptions.length === 0 ? (
            <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
              No results found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                className={cn(
                  "relative flex cursor-pointer select-none items-center py-2 pl-3 pr-9 hover:bg-muted",
                  selectedIds.includes(option.id) ? "bg-primary/5 text-primary" : "text-foreground"
                )}
                onClick={() => {
                  toggleOption(option.id);
                  setSearch(''); // Clear search on select to see all options again
                }}
              >
                <span className={cn("block truncate", selectedIds.includes(option.id) ? "font-semibold" : "font-normal")}>
                  {option.name}
                </span>
                
                {selectedIds.includes(option.id) && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
