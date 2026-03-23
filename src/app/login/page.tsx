"use client";

import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  const supabase = createClient();

  const handleOAuthLogin = async (provider: "google" | "kakao") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 bg-surface">
      <div className="text-center">
        <span className="text-brand text-4xl">&#x2766;</span>
        <h1 className="text-3xl font-extrabold text-brand italic tracking-tight mt-2">ggookggook</h1>
        <p className="mt-2 text-sm text-on-surface-variant">혈자리 지압 가이드</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => handleOAuthLogin("google")}
          className="w-full rounded-[1.5rem] bg-surface-container-lowest px-6 py-4 text-sm font-medium text-on-surface shadow-[0_4px_20px_rgba(48,51,46,0.04)] transition-all hover:bg-surface-container-low active:scale-[0.98]"
        >
          {t("loginWith", { provider: "Google" })}
        </button>
        <button
          onClick={() => handleOAuthLogin("kakao")}
          className="w-full rounded-[1.5rem] bg-[#FEE500] px-6 py-4 text-sm font-medium text-[#3C1E1E] transition-all hover:bg-[#FADA0A] active:scale-[0.98]"
        >
          {t("loginWith", { provider: "Kakao" })}
        </button>
      </div>
    </main>
  );
}
