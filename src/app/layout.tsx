import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

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
    <html lang="fr">
      <body className="antialiased font-sans">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-60 -left-40 w-[700px] h-[700px] rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-amber-300/10 blur-3xl" />
        </div>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
