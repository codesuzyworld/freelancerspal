import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AddLinkBtn from "@/components/addLink/addLinkBtn";
import { DataTable } from "./linkTable/data-table";
import { LinkTable, columns } from "./linkTable/columns";

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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

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
    const { data: projects, error:projectError } = await supabase
    .from("projects")
    .select()
    .eq("projectID", id)
    .single();

    // Get links for this specific project
    const { data: links, error:linkError } = await supabase
    .from("links")
    .select()  
    .eq("projectID", id); 
    
    //Error Handling

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return <div>Error loading project</div>;
    }

    if (linkError) {
        console.error("Error fetching links:", linkError);
        return <div>Error loading links</div>;
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

          {/* Project Info*/}
            <div className="flex flex-col gap-4 bg-projectcard-primary rounded-2xl p-10">

              {/* Project Name*/}
              <div className="font-bold text-xl mb-2">{projects.projectName}</div>

              {/* Dates and Rate Per Hour*/}
              <div className="text-base text-projectcard-foreground flex flex-row gap-2">
                <p>Project Date:{new Date(projects.projectDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  </p>
                <p>Created At:{new Date(projects.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                </p>

                <p>
                  Rate Per Hour: ${projects.ratePerHour}
                </p>
              </div>

              {/* Tags */}
              <div className="pt-4 pb-2">
                {projects.projectTags
                  .split(',')
                  .map((tag: string, index: number) => (
                    <span key={index}
                          className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                      #{tag.trim()}
                    </span>
                ))}
              </div>  

              {/* Description*/}
              <p className="text-foreground text-base flex-1 overflow-y-auto">
                {projects.projectDesc}
              </p>

            </div>

            {/* Tabs */}
            <div className="flex flex-col gap-4 rounded-2xl p-10">
              <Tabs defaultValue="deliverables" className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="deliverables" >Deliverables</TabsTrigger>
                  <TabsTrigger value="timesheet" >TimeSheet</TabsTrigger>
                </TabsList>

                {/* Deliverables*/}
                <TabsContent value="deliverables">

                  <div className="flex flex-row justify-between items-center">
                      <div className="font-bold text-xl mb-2">Links</div>
                      <AddLinkBtn projectID={projects.projectID}/>
                    </div>
                  {/* Show array in its purest form, for testing purposes lol
                       <pre>{JSON.stringify(links, null, 2)}</pre>
                  */}

                  {/* Check if tehre's links, if not then show no links found msg */}        
                  {links.length > 0 ? (
                    <div className="p-2">
                      <DataTable columns={columns} data={links} />
                    </div>
                  ) : (
                    <div>
                      <div>No links found for this project. Add one!</div>
                      <AddLinkBtn projectID={projects.projectID} />
                    </div>
                  )}
                  <div className="font-bold text-xl mb-2">Files</div>


                </TabsContent>


                {/* TimeSheet*/}

                <TabsContent value="timesheet">
                  Change your password here.
                  </TabsContent>
              </Tabs>
            </div>

        </div>
      </div>

      </>
    );
}