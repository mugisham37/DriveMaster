import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
// Performance monitoring and flash messages
import { PerformanceMonitor, FlashMessages } from "@/components";
import { AuthProvider } from "@/contexts/AuthContext";
import { GDPRProvider } from "@/contexts/GDPRContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { EmailVerificationBanner } from "@/components/auth/shared";
import { Toaster } from "@/components/ui/sonner";
import { SkipNavigation } from "@/components/layout/SkipNavigation";
import { GlobalKeyboardShortcuts } from "@/components/accessibility/GlobalKeyboardShortcuts";
import { GlobalAriaLiveRegions } from "@/components/accessibility/AriaLiveRegion";
import { ReducedMotionProvider } from "@/components/accessibility/ReducedMotionProvider";
import { HighContrastProvider } from "@/components/accessibility/HighContrastProvider";
import { AnalyticsInitializer } from "@/components/analytics/AnalyticsInitializer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DriveMaster - Master Your Driving Skills",
    template: "%s | DriveMaster",
  },
  description:
    "Master your driving skills with comprehensive lessons, practice tests, and personalized learning paths. Prepare for your driving test with confidence.",
  keywords: "driving lessons, driving test, practice test, driving school, learn to drive, driving exam preparation",
  authors: [{ name: "DriveMaster Team" }],
  creator: "DriveMaster",
  publisher: "DriveMaster",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://drivemaster.com",
  ),
  openGraph: {
    title: "DriveMaster - Master Your Driving Skills",
    description:
      "Master your driving skills with comprehensive lessons, practice tests, and personalized learning paths. Prepare for your driving test with confidence.",
    url: "/",
    siteName: "DriveMaster",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DriveMaster - Master Your Driving Skills",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveMaster - Master Your Driving Skills",
    description:
      "Master your driving skills with comprehensive lessons, practice tests, and personalized learning paths. Prepare for your driving test with confidence.",
    creator: "@drivemaster",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} antialiased focus-visible-enabled`}
        suppressHydrationWarning={true}
      >
        <SkipNavigation />
        <GlobalAriaLiveRegions />
        <QueryProvider>
          <AuthProvider>
            <GDPRProvider>
              <I18nProvider>
                <ReducedMotionProvider>
                  <HighContrastProvider>
                    <PerformanceMonitor />
                    <FlashMessages />
                    <EmailVerificationBanner />
                    <Toaster position="top-right" richColors closeButton />
                    <GlobalKeyboardShortcuts />
                    <AnalyticsInitializer />
                    {children}
                  </HighContrastProvider>
                </ReducedMotionProvider>
              </I18nProvider>
            </GDPRProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
