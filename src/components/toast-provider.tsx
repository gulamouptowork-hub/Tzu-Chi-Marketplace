"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ToastContext.Provider
      value={(text) => {
        setMessage(text);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setMessage(""), 4000);
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        className={
          message
            ? "fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-slate-900/20 md:inset-x-auto md:bottom-6 md:right-6"
            : "sr-only"
        }
      >
        {message && (
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-blue-400"
          />
        )}
        {message}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  return useContext(ToastContext);
}
