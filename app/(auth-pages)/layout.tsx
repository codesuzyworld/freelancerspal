import Link from "next/link";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeSwitcher } from "@/components/theme-switcher";


export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="w-full flex justify-center">
        <div className="w-full max-w-[1500px] flex flex-row justify-between gap-5 mx-8 my-3 items-center font-semibold">
          <div className="flex items-center gap-2">
            <img src="/img/freelancerPalLogo.svg" className="size-8" />
            <Link href={"/project"} className="text-s md:text-xl font-black">Freelancer's Pal</Link>
            <ThemeSwitcher />    
          </div>
          {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
        </div>
      </header>

      <main className="min-h-screen bg-muted">
        {children}
      </main>
    </>
  );
}
