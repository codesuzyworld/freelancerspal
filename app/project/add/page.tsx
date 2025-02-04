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

              <SidebarInset className="flex-grow min-w-20">

                  <header>
                    <div className="flex flex-row justify-between gap-5 mx-8 my-3 items-center font-semibold ">
                      <div className="flex items-center gap-2">
                        <Link href={"/project"}>Freelancer's Pal</Link>  
                        <ThemeSwitcher />
                      </div>
                      {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                    </div>
                  </header>

                  <main>
                    {children}
                  </main>


                {/* <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
                  <p>
                    Powered by{" "}
                    <a href="https://supabase.com/" target="_blank" className="font-bold hover:underline" rel="noreferrer">
                      Supabase and Next.js
                    </a>
                  </p>
                </footer> updates */}
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}


{/* 
  OLD HEADER:
  <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
<div className="flex gap-5 items-center font-semibold">
  <Link href={"/project"}>Freelancer's Pal</Link>
  <div className="flex items-center gap-2">
    {/* <DeployButton /> 
    <ThemeSwitcher />
  </div>
  {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
</div>
</div> */}