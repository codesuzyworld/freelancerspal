import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AddLinkBtn from "@/components/addLink/addLinkBtn";
import AddTimeBtn from "@/components/addTime/addTimeBtn";
import AddFileBtn from "@/components/addFile/addFileBtn";
import EditProjectBtn from "@/components/editProject/editProjectBtn";
import DeleteProjectBtn from "@/components/deleteProject/deleteProjectBtn";

//Importing Datatable and columns
import { DataTable } from "./linkTable/data-table";
import { linkcolumns } from "./linkTable/columns";
import { timecolumns } from "./timeTable/columns";
import { filecolumns } from "./fileTable/columns";

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


//the search params will show the tab that the user is currently on
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

    
    // Get tasks for this specific project
    const { data: tasks, error:taskError } = await supabase
    .from("tasks")
    .select()  
    .eq("projectID", id); 
    
    // Get files for this specific project
    const { data: files, error:fileError } = await supabase
    .from("files")
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

    if (taskError) {
        console.error("Error fetching tasks:", taskError);
        return <div>Error loading tasks</div>;
    }

    if (fileError) {
        console.error("Error fetching files:", fileError);
        return <div>Error loading files</div>;
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
              <div className="flex flex-row justify-between items-center gap-7">
                <div className="font-bold text-xl mb-2">{projects.projectName}</div>
                <EditProjectBtn projectID={projects.projectID}/> 
                <DeleteProjectBtn projectID={projects.projectID}/>                
              </div>

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
              <Tabs defaultValue={"deliverables"} className="w-[1000px]">
                <TabsList>
                  <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                  <TabsTrigger value="timesheet">TimeSheet</TabsTrigger>
                </TabsList>

                {/* Deliverables*/}
                <TabsContent value="deliverables">

                  <div className="flex flex-row justify-between items-center gap-7">
                      <div className="font-bold text-xl mb-2">Links</div>
                      <AddLinkBtn projectID={projects.projectID}/>
                  </div>
                  {/* Show array in its purest form, for testing purposes lol
                       <pre>{JSON.stringify(links, null, 2)}</pre>
                  */}

                  {/* Check if tehre's links, if not then show no links found msg */}        
                  {links.length > 0 ? (
                    <div className="p-2">
                      <DataTable columns={linkcolumns} data={links} />
                    </div>
                  ) : (
                    <div>
                      <div>No links found for this project. Add one!</div>
                      <AddLinkBtn projectID={projects.projectID} />
                    </div>
                  )}

                  <div className="flex flex-row justify-between items-center gap-7">
                      <div className="font-bold text-xl mb-2">Files</div>
                      <AddFileBtn projectID={projects.projectID}/>
                  </div>


                  {/* Check if there's files, if not then show no files found msg */}        
                  
                  {files.length > 0 ? (
                    <div className="p-2">
                      <DataTable columns={filecolumns} data={files} />
                    </div>
                  ) : (
                    <div>
                      <div>No files found for this project. Add one!</div>
                      <AddFileBtn projectID={projects.projectID} />
                    </div>
                  )}
                </TabsContent>


                {/* TimeSheet*/}

                <TabsContent value="timesheet">
                <div className="flex flex-row justify-between items-center">
                      <div className="font-bold text-xl mb-2">TimeSheet</div>
                      <AddTimeBtn projectID={projects.projectID}/>
                  </div>
                {tasks.length > 0 ? (
                    <div className="p-2">
                      <DataTable columns={timecolumns} data={tasks} />
                    </div>
                  ) : (
                    <div>
                      <div>No Tasks found for this Timesheet. Add one!</div>
                      <AddTimeBtn projectID={projects.projectID} />
                    </div>
                  )}
                  </TabsContent>
              </Tabs>
            </div>

        </div>
      </div>

      </>
    );
}