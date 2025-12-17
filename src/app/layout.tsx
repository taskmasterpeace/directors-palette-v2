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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Directors Palette'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
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
              <footer className="hidden md:block fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground z-40 text-center">
                <span>v0.8</span>
                <span className="mx-2">|</span>
                <a href="https://machinekinglabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
                  Designed by Machine King Labs
                </a>
              </footer>
            </PromptProvider>
            <Toaster />
          </ThemeProvider>
        </CapacitorProvider>
      </body>
    </html>
  );
}
