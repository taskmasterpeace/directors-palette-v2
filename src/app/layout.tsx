import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PromptProvider } from "@/components/providers/PromptProvider"
import { CapacitorProvider } from "@/components/providers/CapacitorProvider"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Directors Palette",
  description: "Visual story and music video breakdown tool",
  generator: 'Directors Palette v0.dev',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Directors Palette'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <CapacitorProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <PromptProvider>
              {children}
              <footer className="fixed bottom-2 right-2 text-xs text-slate-600 z-50">
                v0.51
              </footer>
            </PromptProvider>
            <Toaster />
          </ThemeProvider>
        </CapacitorProvider>
      </body>
    </html>
  );
}
