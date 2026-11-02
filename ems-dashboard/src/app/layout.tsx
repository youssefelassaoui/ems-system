import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LiveProvider } from "@/providers/live-provider";

export const metadata: Metadata = {
  title: {
    default: "Logo — Energy platform",
    template: "%s · Logo",
  },
  description:
    "Real-time energy management dashboard: photovoltaic production, battery storage, grid exchange, weather and PV forecasts.",
};

export const viewport: Viewport = {
  themeColor: "#f4f8ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LiveProvider>
          <AppShell>{children}</AppShell>
        </LiveProvider>
      </body>
    </html>
  );
}
