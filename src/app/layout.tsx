import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeadHunter – Prospection automatique pour agences web et commerciaux",
  description:
    "Scannez votre zone, détectez les entreprises sans site web ou avec un site obsolète, et générez des leads qualifiés automatiquement. Essai gratuit sans CB.",
  keywords: [
    "prospection commerciale",
    "leads locaux",
    "agence web",
    "scanner entreprises",
    "CRM prospection",
    "prospection automatique",
    "trouver des clients",
    "entreprises sans site web",
    "site web obsolète",
    "leads qualifiés",
    "scoring automatique",
    "scanner de zone",
    "prospection locale",
    "commerciaux B2B",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans bg-canvas text-ink">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
