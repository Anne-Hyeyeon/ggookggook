"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Heart, User } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", icon: Home, labelKr: "홈", iconW: "w-4", iconH: "h-[18px]" },
  { href: "/favorites", icon: Heart, labelKr: "즐겨찾기", iconW: "w-5", iconH: "h-[18px]" },
  { href: "/login", icon: User, labelKr: "마이", iconW: "w-4", iconH: "h-4" },
] as const;

export const BottomNav = () => {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-40 flex justify-center items-center px-[60px] pb-6 pt-3 glass-panel rounded-t-[1.5rem] shadow-[0_-4px_40px_rgba(48,51,46,0.06)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center gap-14 w-full justify-center">
        {navItems.map(({ href, icon: Icon, labelKr, iconW, iconH }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center justify-center transition-all duration-300",
                isActive
                  ? "w-14 h-14 bg-primary rounded-full text-white shadow-[0_2px_8px_rgba(71,98,65,0.3)]"
                  : "text-[#a8a29e] p-2"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={clsx(iconW, iconH)}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={clsx(
                  "mt-0.5",
                  isActive
                    ? "text-[10px] font-bold text-white"
                    : "text-[11px] font-semibold tracking-[0.3px] text-[#a8a29e]"
                )}
              >
                {labelKr}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
