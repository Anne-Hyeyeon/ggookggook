"use client";

import { useEffect, useCallback } from "react";
import clsx from "clsx";

interface IBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet = ({ isOpen, onClose, children }: IBottomSheetProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-on-surface/5 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl",
          "rounded-t-[2.5rem] bg-surface-container-lowest shadow-[0_-8px_40px_rgba(48,51,46,0.08)]",
          "transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          "max-h-[85vh] overflow-y-auto scrollbar-thin",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="sticky top-0 z-10 flex justify-center pt-4 pb-4">
          <div className="h-[6px] w-12 rounded-full bg-[#e8e9e3]" />
        </div>
        {children}
      </div>
    </>
  );
};
