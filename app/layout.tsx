import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link";
import "./globals.css";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AddProjectBtn  from "@/components/addProject/addProjectBtn";


import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"


const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Freelancer's Pal",
  description: "Manage your projects and invoices with ease",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col h-screen">
            <SidebarProvider>
              <AppSidebar className="flex-shrink-0"/>

              <SidebarInset className="flex-grow min-w-5">

                  <header className="w-full flex justify-center">
                    <div className="w-full max-w-[1500px] flex flex-row justify-between gap-5 mx-8 my-3 items-center font-semibold">
                      <div className="flex items-center gap-2">
                        <Link href={"/project"} className="text-s md:text-xl">Freelancer's Pal</Link>  
                      </div>
                      {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                    </div>
                  </header>

                  <main>
                    {children}
                  </main>

              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

