"use client";

import { formatPhoneMask } from "@/lib/phone";

interface PhoneFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

/** Phone input with the +7 (999) 123-45-67 mask. */
export default function PhoneField({ id, value, onChange, className = "input-field", required }: PhoneFieldProps) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7 (999) 123-45-67"
      value={value}
      onChange={(e) => onChange(formatPhoneMask(e.target.value))}
      onFocus={() => {
        if (!value) onChange("+7 (");
      }}
      onBlur={() => {
        if (value === "+7" || value === "+7 (" || value === "+7 ()") onChange("");
      }}
      maxLength={18}
      className={className}
      required={required}
    />
  );
}
