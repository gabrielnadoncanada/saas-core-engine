import "./globals.css";
import { ThemeScript } from "@/shared/ui/theme/theme-script";

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
