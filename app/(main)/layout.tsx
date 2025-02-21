import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar";
import Link from "next/link";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar className="flex-shrink-0"/>
        <SidebarInset className="flex-grow min-w-5">
          <header className="w-full flex justify-center">
            <div className="w-full max-w-[1500px] flex flex-row justify-between gap-5 mx-8 my-3 items-center font-semibold">
              <div className="flex items-center gap-2">
                <Link href={"/project"} className="text-s md:text-xl">Freelancer's Pal</Link>  
                <ThemeSwitcher />
              </div>
              <div className="flex flex-row justify-between">
              {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}                
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
} 