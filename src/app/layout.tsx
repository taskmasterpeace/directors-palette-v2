import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PromptProvider } from "@/components/providers/PromptProvider"
import { CapacitorProvider } from "@/components/providers/CapacitorProvider"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Directors Palette - AI Image & Video Generation",
  description: "Turn stories into visual art. AI-powered image and video generation with advanced prompting. Create consistent characters, stunning scenes, and complete storyboards.",
  generator: 'Directors Palette',
  keywords: ['AI image generation', 'storyboard', 'character consistency', 'video generation', 'prompt engineering', 'visual storytelling'],
  authors: [{ name: 'Machine King Labs', url: 'https://machinekinglabs.com' }],
  creator: 'Machine King Labs',
  publisher: 'Machine King Labs',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Directors Palette'
  },
  openGraph: {
    title: 'Directors Palette - AI Image & Video Generation',
    description: 'Turn stories into visual art. Create consistent characters, stunning scenes, and complete storyboards with AI-powered generation.',
    url: 'https://directorspalette.com',
    siteName: 'Directors Palette',
    images: [
      {
        url: '/landing/app-results-1.png',
        width: 1920,
        height: 1080,
        alt: 'Directors Palette - AI Generated Storyboard Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Directors Palette - AI Image & Video Generation',
    description: 'Turn stories into visual art. Create consistent characters, stunning scenes, and complete storyboards with AI.',
    images: ['/landing/app-results-1.png'],
    creator: '@machinekinglabs',
  },
  robots: {
    index: true,
    follow: true,
  },
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
