import React from 'react';

interface PopoverProps {
  children: React.ReactNode;
}

export function Popover({ children }: PopoverProps) {
  return <div className="relative">{children}</div>;
}

export function PopoverTrigger({ children }: PopoverProps) {
  return <div>{children}</div>;
}

export function PopoverContent({ children }: PopoverProps) {
  return (
    <div className="absolute z-50 mt-1 w-48 rounded-md border bg-white shadow-lg">
      {children}
    </div>
  );
}
