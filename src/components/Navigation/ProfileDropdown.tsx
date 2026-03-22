"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export const ProfileDropdown = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (user ? setIsOpen(!isOpen) : router.push("/login"))}
        className="flex flex-col items-center gap-1 px-4 py-1 text-xs text-gray-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span aria-hidden="true">👤</span>
        {t("my")}
      </button>
      {isOpen && user && (
        <div
          className="absolute bottom-full right-0 mb-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <p className="truncate px-3 py-2 text-xs text-gray-500">{user.email}</p>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            role="menuitem"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
};
