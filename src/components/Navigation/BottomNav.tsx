"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { ProfileDropdown } from "./ProfileDropdown";
import clsx from "clsx";

export const BottomNav = () => {
  const pathname = usePathname();
  const t = useTranslations("common");
  const { user } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        <Link
          href="/"
          className={clsx(
            "flex flex-col items-center gap-1 px-4 py-1 text-xs",
            pathname === "/" ? "text-blue-600 font-semibold" : "text-gray-500"
          )}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <span aria-hidden="true">🏠</span>
          {t("home")}
        </Link>
        <Link
          href={user ? "/favorites" : "/login?next=/favorites"}
          className={clsx(
            "flex flex-col items-center gap-1 px-4 py-1 text-xs",
            pathname === "/favorites"
              ? "text-blue-600 font-semibold"
              : "text-gray-500"
          )}
          aria-current={pathname === "/favorites" ? "page" : undefined}
        >
          <span aria-hidden="true">♡</span>
          {t("favorites")}
        </Link>
        <ProfileDropdown />
      </div>
    </nav>
  );
};
