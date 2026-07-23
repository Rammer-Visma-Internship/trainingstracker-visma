"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const { t } = useLanguage();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isVisma = /^[a-zA-Z0-9._%+-]+@visma\.[a-zA-Z]{2,}$/i.test(email.trim());

      if (mode === "signup") {
        if (!isVisma) {
          setError(t.login.onlyVismaAllowed);
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              department: department.trim() || null,
            },
          },
        });
        if (signUpError) throw signUpError;
        router.push(redirect);
        router.refresh();
      } else if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push(redirect);
        router.refresh();
      } else if (mode === "forgot") {
        if (!isVisma) {
          setError(t.login.onlyVismaAllowed);
          setLoading(false);
          return;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );
        if (resetError) throw resetError;
        setSuccess(t.login.resetLinkSent);
      }
    } catch {
      setError(t.login.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === "forgot"
            ? t.login.resetPassword
            : mode === "signup"
            ? t.login.signUp
            : t.login.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "forgot" ? "" : t.login.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {t.login.fullName}
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="department"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {t.login.department}
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              />
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {t.login.email}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
          />
        </div>

        {mode !== "forgot" && (
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              {t.login.password}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-3 pr-10 py-2.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {mode === "signin" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setSuccess(null);
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {t.login.forgotPassword}
            </button>
          </div>
        )}

        {error && (
          <p
            className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700"
            role="alert"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !!success}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? mode === "signup"
              ? t.login.creatingAccount
              : mode === "forgot"
              ? t.login.updatingPassword
              : t.login.signingIn
            : mode === "signup"
            ? t.login.signUp
            : mode === "forgot"
            ? t.login.sendResetLink
            : t.login.signIn}
        </button>
      </form>

      {mode !== "forgot" ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "signin" ? t.login.noAccount : t.login.hasAccount}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setSuccess(null);
            }}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {mode === "signin" ? t.login.signUp : t.login.signIn}
          </button>
        </p>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setSuccess(null);
            }}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {t.login.backToSignIn}
          </button>
        </p>
      )}
    </div>
  );
}

export function LoginShell() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-slate-50">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <LoginForm />
      </div>
    </div>
  );
}
