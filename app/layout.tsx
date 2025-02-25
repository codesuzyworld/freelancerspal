import { Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster"
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Freelancer's Pal",
  description: "Manage your projects and invoices with ease",
};

const nunitoSans = Nunito({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunitoSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="freelancer-theme"
          themes={["light", "dark", "coffee", "system"]}
          value={{
            light: "light",
            dark: "dark",
            coffee: "coffee",
            system: "system"
          }}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

