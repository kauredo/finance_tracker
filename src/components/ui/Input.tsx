"use client";

import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  forwardRef,
  ReactNode,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: ReactNode;
  endIcon?: ReactNode;
  helperText?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, error, icon, endIcon, helperText, label, id, ...props },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseStyles = cn(
      "w-full px-4 py-3 bg-cream border-2 border-border rounded-2xl",
      "transition-all duration-200",
      "placeholder:text-muted",
      "focus:outline-none focus:border-primary focus:bg-surface",
      "focus:shadow-[0_0_0_4px_rgba(255,143,171,0.15)]",
      "disabled:bg-sand disabled:cursor-not-allowed disabled:opacity-60",
    );

    const errorStyles = error
      ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(229,115,115,0.15)]"
      : "";

    const inputWithIcon = icon ? "pl-11" : "";
    const inputWithEndIcon = endIcon ? "pr-11" : "";

    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block mb-2 text-sm font-medium transition-colors duration-200",
              isFocused ? "text-primary" : "text-foreground",
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted",
              )}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseStyles,
              errorStyles,
              inputWithIcon,
              inputWithEndIcon,
              className,
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {endIcon && (
            <div
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted",
              )}
            >
              {endIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={cn(
              "mt-2 text-sm",
              error ? "text-danger" : "text-text-secondary",
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// Textarea component
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, label, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseStyles = cn(
      "w-full px-4 py-3 bg-cream border-2 border-border rounded-2xl",
      "transition-all duration-200 resize-none min-h-[120px]",
      "placeholder:text-muted",
      "focus:outline-none focus:border-primary focus:bg-surface",
      "focus:shadow-[0_0_0_4px_rgba(255,143,171,0.15)]",
      "disabled:bg-sand disabled:cursor-not-allowed disabled:opacity-60",
    );

    const errorStyles = error
      ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(229,115,115,0.15)]"
      : "";

    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block mb-2 text-sm font-medium transition-colors duration-200",
              isFocused ? "text-primary" : "text-foreground",
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(baseStyles, errorStyles, className)}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              "mt-2 text-sm",
              error ? "text-danger" : "text-text-secondary",
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

// Select component
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
  icon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, error, helperText, label, icon, id, children, ...props },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseStyles = cn(
      "w-full px-4 py-3 bg-cream border-2 border-border rounded-2xl",
      "transition-all duration-200 appearance-none cursor-pointer",
      "focus:outline-none focus:border-primary focus:bg-surface",
      "focus:shadow-[0_0_0_4px_rgba(255,143,171,0.15)]",
      "disabled:bg-sand disabled:cursor-not-allowed disabled:opacity-60",
    );

    const errorStyles = error
      ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(229,115,115,0.15)]"
      : "";

    const inputWithIcon = icon ? "pl-11" : "";
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block mb-2 text-sm font-medium transition-colors duration-200",
              isFocused ? "text-primary" : "text-foreground",
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted",
              )}
            >
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={inputId}
            className={cn(
              baseStyles,
              errorStyles,
              inputWithIcon,
              "pr-11",
              className,
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          >
            {children}
          </select>
          <div
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted",
            )}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {helperText && (
          <p
            className={cn(
              "mt-2 text-sm",
              error ? "text-danger" : "text-text-secondary",
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

// Checkbox component
export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-3 cursor-pointer group"
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={cn(
              "peer w-5 h-5 rounded-lg border-2 border-border bg-cream appearance-none cursor-pointer",
              "transition-all duration-200",
              "checked:bg-primary checked:border-primary",
              "focus:outline-none focus:shadow-[0_0_0_4px_rgba(255,143,171,0.15)]",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              className,
            )}
            {...props}
          />
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        {label && (
          <span className="text-foreground group-hover:text-primary transition-colors duration-200">
            {label}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

// Toggle/Switch component
export interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-3 cursor-pointer group"
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "w-11 h-6 rounded-full bg-clay transition-colors duration-300",
              "peer-checked:bg-primary",
              "peer-focus:shadow-[0_0_0_4px_rgba(255,143,171,0.15)]",
              "peer-disabled:opacity-60 peer-disabled:cursor-not-allowed",
              className,
            )}
          />
          <div
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm",
              "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "peer-checked:translate-x-5",
            )}
          />
        </div>
        {label && (
          <span className="text-foreground group-hover:text-primary transition-colors duration-200">
            {label}
          </span>
        )}
      </label>
    );
  },
);

Toggle.displayName = "Toggle";

export { Input, Textarea, Select, Checkbox, Toggle };
