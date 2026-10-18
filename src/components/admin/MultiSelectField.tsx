'use client';

import { useState } from 'react';
import { MultiSelect, Option } from './MultiSelect';

interface MultiSelectFieldProps {
  options: Option[];
  name: string;
  placeholder?: string;
  initialSelectedIds?: string[];
  required?: boolean;
  onChange?: (ids: string[]) => void;
  onCreate?: (name: string) => Promise<{ success: boolean; data?: Option; error?: string }>;
  createItemLabel?: string;
  onOptionCreated?: (option: Option) => void;
}

export function MultiSelectField({
  options,
  name,
  placeholder,
  initialSelectedIds = [],
  required,
  onChange,
  onCreate,
  createItemLabel,
  onOptionCreated,
}: MultiSelectFieldProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  const handleChange = (ids: string[]) => {
    setSelectedIds(ids);
    if (onChange) onChange(ids);
  };

  return (
    <MultiSelect
      options={options}
      selectedIds={selectedIds}
      onChange={handleChange}
      name={name}
      placeholder={placeholder}
      required={required}
      onCreateOption={onCreate}
      createItemLabel={createItemLabel}
      onOptionCreated={onOptionCreated}
    />
  );
}
