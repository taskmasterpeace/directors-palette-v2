import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PromptProvider } from "@/components/providers/PromptProvider"
import { CapacitorProvider } from "@/components/providers/CapacitorProvider"
import { DragDropPrevention } from "@/components/DragDropPrevention"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Director's Palette — AI Creative Studio",
  description: "The AI creative studio for images, video, music, storyboards, children's books, and more. Create consistent characters, stunning scenes, and complete productions with AI.",
  generator: "Director's Palette",
  keywords: ['AI creative studio', 'AI image generation', 'AI video generation', 'AI music', 'storyboard', 'character consistency', 'prompt engineering', 'visual storytelling', 'AI production'],
  authors: [{ name: 'Machine King Labs', url: 'https://machinekinglabs.com' }],
  creator: 'Machine King Labs',
  publisher: 'Machine King Labs',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Director's Palette"
  },
  openGraph: {
    title: "Director's Palette — AI Creative Studio",
    description: 'The AI creative studio for images, video, music, storyboards, and more. Turn ideas into complete creative productions.',
    url: 'https://directorspalette.com',
    siteName: "Director's Palette",
    images: [
      {
        url: '/landing/app-results-1.png',
        width: 1920,
        height: 1080,
        alt: "Director's Palette — AI Creative Studio",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Director's Palette — AI Creative Studio",
    description: 'The AI creative studio for images, video, music, storyboards, and more. Turn ideas into complete creative productions.',
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
        <DragDropPrevention />
        <CapacitorProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <PromptProvider>
              {children}
              <footer className="hidden md:block fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground z-40 text-center">
                <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
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
