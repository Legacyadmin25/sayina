import React, { useState, useRef, useEffect } from 'react';

interface SelectProps {
  children?: React.ReactNode;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  value?: string;
}

interface SelectItemProps {
  children?: React.ReactNode;
  value: string;
}

const SelectContext = React.createContext<{
  onValueChange?: (value: string) => void;
  selectedValue?: string;
  setOpen: (open: boolean) => void;
}>({ setOpen: () => {} });

export function Select({ children, onValueChange, defaultValue, value }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');

  const handleValueChange = (val: string) => {
    setSelectedValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ onValueChange: handleValueChange, selectedValue, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children }: { children?: React.ReactNode }) {
  const { setOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-sm bg-white"
      onClick={() => setOpen(prev => !prev)}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { selectedValue } = React.useContext(SelectContext);
  return <span>{selectedValue || placeholder}</span>;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
      {children}
    </div>
  );
}

export function SelectItem({ children, value }: SelectItemProps) {
  const { onValueChange, selectedValue } = React.useContext(SelectContext);
  return (
    <div
      className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${selectedValue === value ? 'bg-primary-50 font-medium' : ''}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </div>
  );
}
