
import Link from "next/link";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";


export default function ClientPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <header className="w-full flex justify-center">
    <div className="w-full max-w-[1500px] flex flex-row justify-between gap-5 mx-8 my-3 items-center font-semibold">
      <div className="flex items-center gap-2">
        <Link href={"/project"} className="text-s md:text-xl">Freelancer's Pal</Link>  
      </div>
      {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
    </div>
  </header>

    <main className="h-screen mt-10">
    {children}
    </main>


    </>
  );
} 