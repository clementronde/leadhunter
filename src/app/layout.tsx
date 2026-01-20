import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout";

export const metadata: Metadata = {
  title: "LeadHunter - Trouvez vos prochains clients",
  description: "Outil de prospection pour agences web - Détectez les entreprises sans site ou avec un site obsolète",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-zinc-50 font-sans">
        <Sidebar />
        <main className="ml-64 min-h-screen transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}
