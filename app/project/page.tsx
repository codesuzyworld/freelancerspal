import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/projectCard";
import AddProjectBtn from "@/components/addProject/addProjectBtn";

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

  SidebarTrigger,
} from "@/components/ui/sidebar"


export default async function Projects() {
    const supabase = await createClient();

    // Get auth in this page, if user isnt logged in, redirect to sign in page
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return redirect("/sign-in");
    }

    // Fetch the userID so that it shows the projects accordingly
    const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .eq("userID", user.id);
    
    if (error) {
        console.error("Error fetching projects:", error);
      }

    //Note to self:Code to show all projects in JSON form
    // return <pre>{JSON.stringify(projects, null, 2)}</pre>

    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">

                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex flex-row justify-between items-center gap-10 ">
                     <div className="font-bold text-2xl">Projects</div>
                     <AddProjectBtn />
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
          <div className="min-h-[100vh] w-full p-4">

            <ProjectCard projects={projects || []} />
          </div>
        </div>
      </>
    );
}