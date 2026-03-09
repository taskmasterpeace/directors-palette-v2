import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PromptProvider } from "@/components/providers/PromptProvider"
import { CapacitorProvider } from "@/components/providers/CapacitorProvider"
import { DragDropPrevention } from "@/components/DragDropPrevention"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL('https://directorspal.com'),
  title: "Director's Palette — AI Creative Studio",
  description: "The AI creative studio for images, video, music, storyboards, children's books, and more. Create consistent characters, stunning scenes, and complete productions with AI.",
  generator: "Director's Palette",
  keywords: ['AI creative studio', 'AI image generation', 'AI video generation', 'AI music', 'storyboard', 'character consistency', 'prompt engineering', 'visual storytelling', 'AI production'],
  authors: [{ name: 'Machine King Labs', url: 'https://machinekinglabs.com' }],
  creator: 'Machine King Labs',
  publisher: 'Machine King Labs',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Director's Palette",
  },
  openGraph: {
    title: "Director's Palette — AI Creative Studio",
    description: 'The AI creative studio for images, video, music, storyboards, and more. Turn ideas into complete creative productions.',
    url: 'https://directorspal.com',
    siteName: "Director's Palette",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
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
    images: ['/og-image.jpg'],
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
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
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
            </PromptProvider>
            <Toaster />
          </ThemeProvider>
        </CapacitorProvider>
      </body>
    </html>
  );
}
