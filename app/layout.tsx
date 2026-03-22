import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { resolveLocale } from "@/i18n/getLocale";
import { loadMessages } from "@/i18n/loadMessages";
import RootClientWrapper from "./RootClientWrapper";

export const metadata = {
  title: "FleetBharat",
  description: "Next.js version of your React app",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await resolveLocale();
  const messages = await loadMessages(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RootClientWrapper>{children}</RootClientWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
