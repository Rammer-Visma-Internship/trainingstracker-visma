"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shadow-sm"
      role="group"
      aria-label="Language toggle"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2.5 py-1 transition-colors ${
          locale === "en"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        className={`rounded-md px-2.5 py-1 transition-colors ${
          locale === "pt"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-pressed={locale === "pt"}
      >
        PT
      </button>
    </div>
  );
}
