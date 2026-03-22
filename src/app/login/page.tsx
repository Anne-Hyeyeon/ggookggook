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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">꾹꾹</h1>
      <button
        onClick={() => handleOAuthLogin("google")}
        className="w-full max-w-xs rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50"
      >
        {t("loginWith", { provider: "Google" })}
      </button>
      <button
        onClick={() => handleOAuthLogin("kakao")}
        className="w-full max-w-xs rounded-lg bg-yellow-300 px-6 py-3 font-medium hover:bg-yellow-400"
      >
        {t("loginWith", { provider: "Kakao" })}
      </button>
    </main>
  );
}
