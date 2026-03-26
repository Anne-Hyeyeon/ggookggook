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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 pb-24 pt-8">
      <div className="premium-panel rounded-[32px] px-6 py-8 text-center shadow-[0_18px_36px_rgba(24,32,29,0.08)]">
        <span className="text-brand text-4xl">&#x2766;</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand">ggookggook</h1>
        <p className="mt-2 text-sm text-on-surface-variant">혈자리 지압 가이드</p>

        <div className="mt-8 flex w-full flex-col gap-3">
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
      </div>
    </main>
  );
}
