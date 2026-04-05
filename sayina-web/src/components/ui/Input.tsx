import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftAddon, rightAddon, fullWidth = false, ...props }, ref) => {
    const wrapperClasses = cn(
      "flex flex-col space-y-1",
      fullWidth ? "w-full" : "max-w-sm",
      className
    );

    const inputWrapperClasses = cn(
      "flex rounded-md border border-secondary-200 overflow-hidden",
      error ? "border-red-500 ring-1 ring-red-500" : "focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500",
      leftAddon ? "pl-0" : "pl-3",
      rightAddon ? "pr-0" : "pr-3"
    );

    const inputClasses = cn(
      "flex-grow bg-transparent py-2 text-secondary-900 placeholder:text-secondary-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      leftAddon ? "pl-2" : "",
      rightAddon ? "pr-2" : ""
    );

    const addonClasses = "flex items-center justify-center px-3 bg-secondary-50 text-secondary-500 border-r border-secondary-200";
    const rightAddonClasses = "flex items-center justify-center px-3 bg-secondary-50 text-secondary-500 border-l border-secondary-200";

    return (
      <div className={wrapperClasses}>
        {label && (
          <label className="text-sm font-medium text-secondary-900">
            {label}
          </label>
        )}
        <div className={inputWrapperClasses}>
          {leftAddon && (
            <div className={addonClasses}>{leftAddon}</div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            aria-invalid={error ? "true" : "false"}
            {...props}
          />
          {rightAddon && (
            <div className={rightAddonClasses}>{rightAddon}</div>
          )}
        </div>
        {helperText && !error && (
          <p className="text-xs text-secondary-500">{helperText}</p>
        )}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
