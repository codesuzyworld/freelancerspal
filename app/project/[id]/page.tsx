import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectDetails({ params }: ProjectPageProps) {
  const supabase = await createClient();
  
  // Await the params object first
  const { id } = await params;

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

    // Fetch the userID and Project ID so that it shows the project details accordingly
    const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .eq("projectID", id)
    .eq("userID", user.id)
    .single();
    
    //Error Handling
    if (error) {
      console.error("Error fetching project:", error);
      return <div>Error loading project</div>;
      }


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
                <BreadcrumbPage className="flex flex-row justify-between items-center gap-10">
                  <Link href="/project">Projects</Link>
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex flex-row justify-between items-center gap-10">
                  <div>{projects.projectName}</div>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
        <div className="min-h-[100vh] w-full p-4">
            <div className="flex flex-col gap-4 bg-black">
            <p>{projects.projectName}</p>
            <p>{projects.projectDate}</p>
            <p>{projects.projectDesc}</p>
            <p>{projects.projectTags}</p>

            </div>

        </div>
      </div>
      </>
    );
}