import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

import { QueryProvider } from "@/shared/components/providers/query-provider";
import { Toaster } from "@/shared/components/ui/sonner";
import { ThemeProvider } from "@/shared/context/theme-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-CA" suppressHydrationWarning>
      <body className={plusJakartaSans.className}>
        <QueryProvider>
          <ThemeProvider defaultTheme="system">
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
