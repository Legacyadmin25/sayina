import React from 'react';
import { cn } from './utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftAddon, rightAddon, fullWidth = false, ...props }, ref) => {
    const inputClasses = cn(
      'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error ? 'border-red-500 focus-visible:ring-red-500' : '',
      leftAddon ? 'rounded-l-none' : '',
      rightAddon ? 'rounded-r-none' : '',
      className
    );

    const wrapperClasses = cn(
      'flex flex-col',
      fullWidth ? 'w-full' : ''
    );

    const inputGroupClasses = cn(
      'flex',
      fullWidth ? 'w-full' : ''
    );

    const addonClasses = cn(
      'inline-flex items-center px-3 rounded-md border border-input bg-muted text-muted-foreground',
      'text-sm'
    );

    return (
      <div className={wrapperClasses}>
        {label && (
          <label
            className="text-sm font-medium mb-1.5 text-gray-700"
            htmlFor={props.id}
          >
            {label}
          </label>
        )}
        <div className={inputGroupClasses}>
          {leftAddon && (
            <div className={cn(addonClasses, 'rounded-r-none border-r-0')}>
              {leftAddon}
            </div>
          )}
          <input
            className={cn(inputClasses, fullWidth ? 'w-full' : '')}
            ref={ref}
            {...props}
          />
          {rightAddon && (
            <div className={cn(addonClasses, 'rounded-l-none border-l-0')}>
              {rightAddon}
            </div>
          )}
        </div>
        {(helperText || error) && (
          <p
            className={cn(
              'text-xs mt-1',
              error ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
