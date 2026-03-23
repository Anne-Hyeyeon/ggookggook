import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/components/AuthProvider";
import { BottomNav } from "@/components/Navigation/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "꾹꾹 — 혈자리 지압 가이드",
  description: "셀프 지압을 위한 혈자리 가이드 앱",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-surface font-sans text-on-surface pb-20">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            {children}
            <BottomNav />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
