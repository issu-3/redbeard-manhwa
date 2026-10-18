'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Check, ChevronDown, X, Search, Plus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  onCreateOption?: (name: string) => Promise<{ success: boolean; data?: Option; error?: string }>;
  createItemLabel?: string;
  onOptionCreated?: (option: Option) => void;
}

export function MultiSelect({
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Select items...',
  name,
  required,
  onCreateOption,
  createItemLabel = 'Item',
  onOptionCreated,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Inline creation states
  const [createdOptions, setCreatedOptions] = useState<Option[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Outside click handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
        setIsCreating(false);
        setNewItemName('');
        setCreateError(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge external options with dynamically created options (deduplicated by id)
  const allOptions = useMemo(() => {
    const map = new Map<string, Option>();
    options.forEach(opt => map.set(opt.id, opt));
    createdOptions.forEach(opt => map.set(opt.id, opt));
    return Array.from(map.values());
  }, [options, createdOptions]);

  const filteredOptions = allOptions.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOptions = allOptions.filter(opt => selectedIds.includes(opt.id));

  // Check if search query matches an existing option (case-insensitive)
  const exactMatch = search.trim()
    ? allOptions.find(opt => opt.name.trim().toLowerCase() === search.trim().toLowerCase())
    : null;

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsListRef.current) {
      const items = optionsListRef.current.querySelectorAll<HTMLDivElement>('[data-option-item]');
      const target = items[highlightedIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const toggleOption = useCallback((id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
    inputRef.current?.focus();
  }, [selectedIds, onChange]);

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };

  const handleCreateNew = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) {
      setCreateError(`${createItemLabel} name cannot be empty.`);
      return;
    }
    if (trimmed.length < 2) {
      setCreateError(`${createItemLabel} name must be at least 2 characters.`);
      return;
    }
    if (trimmed.length > 50) {
      setCreateError(`${createItemLabel} name cannot exceed 50 characters.`);
      return;
    }

    // Client-side duplicate check (case-insensitive)
    const existing = allOptions.find(opt => opt.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const errorMsg = `${createItemLabel} "${existing.name}" already exists.`;
      setCreateError(errorMsg);
      toast.error(errorMsg);
      if (!selectedIds.includes(existing.id)) {
        onChange([...selectedIds, existing.id]);
        toast.info(`Selected existing ${createItemLabel.toLowerCase()} "${existing.name}".`);
      }
      setIsCreating(false);
      setNewItemName('');
      setSearch('');
      return;
    }

    if (!onCreateOption) return;

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const res = await onCreateOption(trimmed);
      if (!res.success || !res.data) {
        const errorMsg = res.error || `Failed to create ${createItemLabel.toLowerCase()}.`;
        setCreateError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const created = res.data;
      setCreatedOptions(prev => [...prev, created]);
      onChange([...selectedIds, created.id]);
      if (onOptionCreated) {
        onOptionCreated(created);
      }

      toast.success(`${createItemLabel} "${created.name}" created successfully!`);
      setIsCreating(false);
      setNewItemName('');
      setSearch('');
      setCreateError(null);
      inputRef.current?.focus();
    } catch (err: any) {
      const errorMsg = err?.message || `Failed to create ${createItemLabel.toLowerCase()}.`;
      setCreateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearch('');
      setHighlightedIndex(-1);
      setIsCreating(false);
      setNewItemName('');
      setCreateError(null);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      if (filteredOptions.length > 0) {
        const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
        if (targetIndex >= 0 && targetIndex < filteredOptions.length) {
          toggleOption(filteredOptions[targetIndex].id);
        }
        return;
      }

      // If no options match and creation is supported, create with current search term
      if (filteredOptions.length === 0 && search.trim().length >= 2 && onCreateOption && !exactMatch) {
        handleCreateNew(search);
        return;
      }
      return;
    }

    if (e.key === 'Backspace' && search === '' && selectedIds.length > 0) {
      // Remove last selected item on backspace when input is empty
      e.preventDefault();
      onChange(selectedIds.slice(0, -1));
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden inputs for native form submission */}
      {name && selectedIds.map(id => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {/* Hidden input for HTML5 required constraint validation */}
      {required && (
        <input
          type="text"
          required
          value={selectedIds.length > 0 ? 'selected' : ''}
          onChange={() => {}}
          className="sr-only pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Main trigger box */}
      <div
        className={cn(
          "flex min-h-[46px] w-full flex-wrap items-center justify-between rounded-xl border border-[#2A2E39] bg-[#1D212B] px-3.5 py-2 text-sm transition-all cursor-text",
          isOpen
            ? "border-[#E53935] ring-1 ring-[#E53935]/40 shadow-sm"
            : "hover:border-[#3E4554]"
        )}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {selectedOptions.map(option => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E53935]/15 border border-[#E53935]/30 text-white text-xs font-semibold px-2.5 py-1 select-none transition-colors"
            >
              {option.name}
              <button
                type="button"
                onClick={(e) => removeOption(option.id, e)}
                className="rounded-full p-0.5 text-white/70 hover:text-white hover:bg-[#E53935]/30 transition-colors focus:outline-none"
                title={`Remove ${option.name}`}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option.name}</span>
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-[#9CA3AF] min-w-[100px] py-0.5"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedOptions.length === 0 ? placeholder : "Add more..."}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 ml-2 text-[#9CA3AF]">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
                setSearch('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:text-white hover:bg-[#252A36] transition-colors"
              title="Clear all"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
              if (!isOpen) {
                setTimeout(() => inputRef.current?.focus(), 0);
              }
            }}
            className="p-1 rounded-lg hover:text-white hover:bg-[#252A36] transition-colors"
            tabIndex={-1}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen ? "rotate-180 text-[#E53935]" : "text-[#9CA3AF]"
              )}
            />
          </button>
        </div>
      </div>

      {/*
        In-Flow Expandable Options Tray:
        Rendered in normal document flow (relative) rather than absolute top-full.
        Guarantees that space is reserved in the DOM, pushing subsequent
        form fields down naturally without any visual overlap.
      */}
      {isOpen && (
        <div
          ref={optionsListRef}
          className="relative mt-2 w-full rounded-xl border border-[#2A2E39] bg-[#1D212B] shadow-xl shadow-black/40 overflow-hidden transition-all animate-in fade-in-50 duration-150"
        >
          {/* Quick Create Header when inline creation is supported */}
          {onCreateOption && (
            <div className="p-2 border-b border-[#2A2E39] bg-[#171A22]/80">
              {isCreating ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={createInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => {
                        setNewItemName(e.target.value);
                        setCreateError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCreateNew(newItemName);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCreating(false);
                          setNewItemName('');
                          setCreateError(null);
                        }
                      }}
                      placeholder={`Enter new ${createItemLabel.toLowerCase()} name...`}
                      className="flex-1 bg-[#12141A] border border-[#2A2E39] focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#9CA3AF] outline-none"
                      disabled={isSubmittingCreate}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateNew(newItemName)}
                      disabled={isSubmittingCreate || !newItemName.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E53935] hover:bg-[#F20D3A] text-white disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                    >
                      {isSubmittingCreate ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewItemName('');
                        setCreateError(null);
                      }}
                      disabled={isSubmittingCreate}
                      className="p-1.5 rounded-lg text-xs text-[#9CA3AF] hover:text-white hover:bg-[#252A36] transition-colors shrink-0"
                      title="Cancel (Escape)"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {createError && (
                    <p className="text-[11px] text-[#E53935] font-medium flex items-center gap-1 px-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {createError}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(true);
                    setNewItemName(search.trim());
                    setTimeout(() => createInputRef.current?.focus(), 50);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E53935] hover:bg-[#E53935]/10 border border-dashed border-[#E53935]/30 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {search.trim() && !exactMatch
                      ? `+ Create ${createItemLabel} "${search.trim()}"`
                      : `+ Create ${createItemLabel}`}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] bg-[#12141A] px-1.5 py-0.5 rounded border border-[#2A2E39]">
                    New
                  </span>
                </button>
              )}
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="py-6 px-4 text-center">
              <Search className="h-6 w-6 text-[#9CA3AF]/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-white/90">No results found</p>
              {search ? (
                <>
                  <p className="text-xs text-[#9CA3AF] mt-0.5 mb-3">
                    No matching {createItemLabel.toLowerCase()}s for &ldquo;<span className="text-white font-medium">{search}</span>&rdquo;
                  </p>
                  {onCreateOption && !exactMatch && (
                    <button
                      type="button"
                      onClick={() => handleCreateNew(search)}
                      disabled={isSubmittingCreate}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#E53935] hover:bg-[#F20D3A] text-white transition-colors shadow-sm"
                    >
                      {isSubmittingCreate ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Create &ldquo;{search.trim()}&rdquo; as {createItemLabel}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#9CA3AF] mt-0.5">No options available</p>
              )}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
              {filteredOptions.map((option, index) => {
                const isSelected = selectedIds.includes(option.id);
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={option.id}
                    data-option-item
                    className={cn(
                      "relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm cursor-pointer select-none transition-colors",
                      isSelected
                        ? "bg-[#E53935]/15 text-white font-semibold"
                        : isHighlighted
                        ? "bg-[#252A36] text-white"
                        : "text-[#F1F3F5] hover:bg-[#252A36] hover:text-white"
                    )}
                    onClick={() => toggleOption(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="truncate pr-2">{option.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-[#E53935] shrink-0" />
                    )}
                  </div>
                );
              })}

              {/* Suggest inline create when query is not matched exactly */}
              {onCreateOption && search.trim().length >= 2 && !exactMatch && (
                <div
                  onClick={() => handleCreateNew(search)}
                  className="flex items-center justify-between px-3.5 py-2 mt-1 rounded-lg text-xs font-bold text-[#E53935] bg-[#E53935]/10 hover:bg-[#E53935]/20 border border-dashed border-[#E53935]/30 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Create {createItemLabel} &ldquo;{search.trim()}&rdquo;
                  </span>
                  <span className="text-[10px] text-[#E53935]/80 font-normal shrink-0">
                    Press Enter
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tray footer with selection summary and done action */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#171A22] border-t border-[#2A2E39] text-xs text-[#9CA3AF]">
            <span>
              <strong className="text-white font-semibold">{selectedIds.length}</strong> of {allOptions.length} selected
            </span>
            <div className="flex items-center gap-2">
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs text-[#9CA3AF] hover:text-white transition-colors"
                >
                  Clear search
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearch('');
                  setHighlightedIndex(-1);
                  setIsCreating(false);
                  setNewItemName('');
                  setCreateError(null);
                }}
                className="text-xs font-semibold text-[#E53935] hover:text-[#FF1744] transition-colors px-2 py-0.5 rounded hover:bg-[#E53935]/10"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
