"use client";
import { useEffect } from "react";

// The bundled subset covers application copy and official department names.
// Load the complete font afterward for arbitrary student-written text.
export function FontEnhancement() {
  useEffect(() => {
    const timer = setTimeout(() => {
      void import("./full-chinese-font").then((font) => {
        document.documentElement.style.setProperty(
          "--font-chinese-full",
          font.fullChineseFamily,
        );
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
