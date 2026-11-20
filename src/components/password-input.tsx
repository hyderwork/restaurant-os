"use client";

import { useState } from "react";

type PasswordInputProps = {
  name: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
};

export default function PasswordInput({
  name,
  required = false,
  minLength,
  autoComplete = "current-password",
  className = "",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        required={required}
        minLength={minLength}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border border-white/10 bg-black/20 p-3 pr-12 outline-none focus:border-orange-300 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.8 4.7 9.8 6.2a1.4 1.4 0 010 1.6 17 17 0 01-3.1 3.3" />
            <path d="M6.2 6.2a17.4 17.4 0 00-4 5 1.4 1.4 0 000 1.6C3.2 14.3 6.8 19 12 19a10.7 10.7 0 004-.8" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.2 12s3.5-7 9.8-7 9.8 7 9.8 7-3.5 7-9.8 7-9.8-7-9.8-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
