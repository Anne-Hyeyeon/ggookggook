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
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-2xl bg-white shadow-xl",
          "transition-transform duration-300 ease-out",
          "max-h-[85vh] overflow-y-auto",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        {children}
      </div>
    </>
  );
};
