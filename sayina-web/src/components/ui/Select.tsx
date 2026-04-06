import React from 'react';

interface SelectProps {
  children?: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
}

export function Select({ children, onValueChange, value }: SelectProps) {
  return <div className="relative">{children}</div>;
}

export function SelectTrigger({ children }: { children?: React.ReactNode }) {
  return (
    <button type="button" className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
      {children}
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
      {children}
    </div>
  );
}

export function SelectItem({ children, value }: { children?: React.ReactNode; value: string }) {
  return (
    <div className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100" data-value={value}>
      {children}
    </div>
  );
}
