import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link";
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AddProjectBtn from "@/components/addProject/addProjectBtn";



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

export default function AddProjectPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/project">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Add Project</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="flex-1 space-y-4">
        <AddProjectBtn />
      </div>
    </div>
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