"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getAcupointById } from "@/lib/utils/data";
import { AcupointCard } from "@/components/AcupointCard";
import { useAppStore } from "@/store/useAppStore";
import type { IAcupoint } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function FavoritesPage() {
  const t = useTranslations("favorites_page");
  const { user, isLoading: authLoading } = useAuth();
  const { favoriteIds, isLoading } = useFavorites();
  const { openAcupointDetail } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/favorites");
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const favoriteAcupoints = favoriteIds
    .map((id) => getAcupointById(id))
    .filter((a): a is IAcupoint => a !== undefined);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-20 pt-6">
      <h1 className="mb-4 text-xl font-bold">{t("title")}</h1>
      {favoriteAcupoints.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <p>{t("empty")}</p>
          <Link href="/" className="mt-2 inline-block text-blue-600 underline">
            {t("goHome")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {favoriteAcupoints.map((a) => (
            <AcupointCard key={a.id} acupoint={a} onClick={openAcupointDetail} />
          ))}
        </div>
      )}
    </main>
  );
}
