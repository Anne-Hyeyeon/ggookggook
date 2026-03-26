"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, User } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", icon: Home, labelKr: "홈", iconW: "w-4", iconH: "h-[18px]" },
  { href: "/favorites", icon: Heart, labelKr: "즐겨찾기", iconW: "w-5", iconH: "h-[18px]" },
  { href: "/login", icon: User, labelKr: "마이", iconW: "w-4", iconH: "h-4" },
] as const;

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 z-40 flex w-full justify-center px-4 pb-6 pt-3"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="glass-panel flex w-full max-w-md items-center justify-between rounded-[30px] px-4 py-3 shadow-[0_18px_40px_rgba(24,32,29,0.08)]">
        {navItems.map(({ href, icon: Icon, labelKr, iconW, iconH }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex h-[62px] w-[96px] shrink-0 flex-col items-center justify-center rounded-[22px] px-3 py-2 transition-all duration-300",
                isActive
                  ? "bg-brand text-white shadow-[0_12px_24px_rgba(21,33,28,0.14)]"
                  : "text-on-surface-variant"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex h-5 items-center justify-center">
                <Icon
                  className={clsx(iconW, iconH)}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={clsx(
                  "mt-1",
                  isActive
                    ? "text-[10px] font-bold text-white"
                    : "text-[11px] font-semibold tracking-[0.3px] text-on-surface-variant"
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
