import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/projectCard";
import AddProjectBtn from "@/components/addProject/addProjectBtn";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

    //Check if user is admin
    const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

    // Get projects based on admin status
    const { data: projects, error } = await supabase
        .from("projects")
        .select();
        
    // If the user is not an admin, filter to only show user's projects
    if (!adminCheck) {
        const { data: userProjects } = await supabase
            .from("projects")
            .select()
            .eq("userID", user.id);
            
        return (
            <div className="flex justify-center w-full">
                <div className="p-1 md:p-10 w-full max-w-[1500px]">
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
                                   <Link href="/test-auth">
                                       <Button variant="outline">
                                         Test Auth
                                       </Button>
                                     </Link>                       
                                </BreadcrumbPage>
                              </BreadcrumbItem>
                            </BreadcrumbList>
                          </Breadcrumb>
                        </div>
                      </header>
                      <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
                        <div className="min-h-[100vh] w-full p-4">
                            <ProjectCard projects={userProjects || []} />
                        </div>
                      </div>
                </div>
            </div>
        );
    }

    //Note to self:Code to show all projects in JSON form
    // return <pre>{JSON.stringify(projects, null, 2)}</pre>

    return (
        <div className="flex justify-center w-full">
            <div className="p-1 md:p-10 w-full max-w-[1500px]">
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
                               <Link href="/test-auth">
                                   <Button variant="outline">
                                     Test Auth
                                   </Button>
                                 </Link>                       
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
            </div>
        </div>
    );
}