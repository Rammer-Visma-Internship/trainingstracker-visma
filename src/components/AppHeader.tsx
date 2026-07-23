"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

interface AppHeaderProps {
  title: string;
  variant?: "employee" | "admin";
}

export function AppHeader({ title, variant = "employee" }: AppHeaderProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur ${
        variant === "admin"
          ? "border-slate-200 bg-white/90"
          : "border-brand-100 bg-white/90"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            aria-label={t.nav.logout}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
