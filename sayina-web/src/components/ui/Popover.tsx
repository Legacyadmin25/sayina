import React from 'react';

interface PopoverProps {
  children: React.ReactNode;
  className?: string;
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
}

export function Popover({ children }: PopoverProps) {
  return <div className="relative inline-block">{children}</div>;
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return children;
  }
  return <div>{children}</div>;
}

export function PopoverContent({ children, className }: PopoverContentProps) {
  return (
    <div className={`absolute z-50 mt-1 w-48 rounded-md border bg-white shadow-lg ${className || ''}`}>
      {children}
    </div>
  );
}
