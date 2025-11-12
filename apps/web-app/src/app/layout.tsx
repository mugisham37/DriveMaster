import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
// Performance monitoring and flash messages
import { PerformanceMonitor, FlashMessages } from "@/components";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { EmailVerificationBanner } from "@/components/auth/shared";

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
  title: "Exercism - Code Practice and Mentorship for Everyone",
  description:
    "Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.",
  keywords: "programming, coding, practice, mentorship, learn to code",
  authors: [{ name: "Exercism Team" }],
  creator: "Exercism",
  publisher: "Exercism",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://exercism.org",
  ),
  openGraph: {
    title: "Exercism - Code Practice and Mentorship for Everyone",
    description:
      "Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.",
    url: "/",
    siteName: "Exercism",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Exercism - Code Practice and Mentorship for Everyone",
    description:
      "Level up your programming skills with 67 languages, and insightful discussion with our dedicated team of welcoming mentors.",
    creator: "@exercism_io",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <I18nProvider>
            <PerformanceMonitor />
            <FlashMessages />
            <EmailVerificationBanner />
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
