'use client';

import { useState } from 'react';
import { MultiSelect, Option } from './MultiSelect';

interface MultiSelectFieldProps {
  options: Option[];
  name: string;
  placeholder?: string;
  initialSelectedIds?: string[];
}

export function MultiSelectField({ options, name, placeholder, initialSelectedIds = [] }: MultiSelectFieldProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  return (
    <MultiSelect
      options={options}
      selectedIds={selectedIds}
      onChange={setSelectedIds}
      name={name}
      placeholder={placeholder}
    />
  );
}
