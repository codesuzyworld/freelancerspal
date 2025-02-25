import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

//Importing Datatable and columns
import { DataTable } from "../../(main)/project/[id]/linkTable/data-table";
import { clientFileColumns } from "./tables/clientFileColumn";
import { clientTimeColumns } from "./tables/clientTimeColumn";


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



    // Fetch the userID and Project ID so that it shows the project details accordingly
    const { data: projects, error:projectError } = await supabase
    .from("projects")
    .select()
    .eq("projectID", id)
    .eq("clientPortal", true)  // Clients can only see projects that are toggled for public view
    .single();

    // If client portal is not toggled, then just show message
    if (projectError || !projects) {
        return redirect("/sign-in");
    }

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

    // Calculate total hours

    let totalHours = 0;  
    // Only calculate if tasks exists
    if (tasks) {
      // Loop through each task
      for (let task of tasks) {
        // Add each task's hours to the total (use 0 if hours not set)
        if (task.hourSpent) {
          totalHours += task.hourSpent;
        }
      }
    }

    const totalAmount = totalHours * projects.ratePerHour;

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
<div>
          {/* Project Info*/}
          <div className="flex flex-col justify-center items-center w-full">
                {/* Project Name and Actions - Moved outside */}
                <div className="w-full max-w-[1000px] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="font-bold text-xl">{projects.projectName}</div>
                  <div className="flex flex-row flex-wrap gap-2">
                  </div>
                </div>

                {/* Project Details Card */}
                <div className="w-full max-w-[1000px] flex flex-col md:flex-row gap-4 bg-projectcard-primary rounded-2xl p-4 md:p-10">
                  {/* Cover Image */}
                  <div className="w-full md:w-1/3 h-[200px] md:[300px] rounded-3xl overflow-hidden">
                    {projects.projectPhoto ? (
                      <img 
                        src={projects.projectPhoto} 
                        alt={`${projects.projectName} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center text-white">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Right side - Project Details */}
                  <div className="flex flex-col flex-1 gap-4">
                    {/* Dates and Rate Per Hour*/}
                    <div className="text-base text-projectcard-foreground flex flex-col md:flex-row gap-2">
                      <p className="flex flex-col gap-2">
                        <span className="font-bold">Project Date:</span> 
                        <span className="text-accent font-bold">
                          {new Date(projects.projectDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                          </span>
                      </p>
                      <p className="flex flex-col gap-2 border-2 rounded-lg"><span className="font-bold">Created On:</span> 
                      <span className="text-accent font-bold">{new Date(projects.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      </span>
                      </p>
                      <p className="flex flex-col gap-2">
                        <span className="font-bold">Rate Per Hour:</span> 
                        <span className="text-accent font-bold">
                          ${projects.ratePerHour}
                        </span>
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="pt-4 pb-2">
                      {projects.projectTags
                        .split(',')
                        .map((tag: string, index: number) => (
                          <span key={index}
                                className="inline-block bg-accent rounded-full px-3 py-1 text-sm font-semibold text-white mr-2 mb-2">
                            #{tag.trim()}
                          </span>
                      ))}
                    </div>  

                    {/* Description*/}
                    <p className="text-foreground text-base flex-1 overflow-y-auto">
                      {projects.projectDesc}
                    </p>
                  </div>
                </div>
              </div>


          {/* Tabs */}
          
          <div className="flex flex-col justify-center items-center w-full gap-4 rounded-2xl p-2 md:p-10">
            <Tabs defaultValue={"deliverables"} className="w-full">
              <div className="flex justify-center w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                  <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                  <TabsTrigger value="timesheet">TimeSheet</TabsTrigger>
                </TabsList>
              </div>

              {/* Deliverables*/}
              <TabsContent value="deliverables" className="w-full">
                <div className="flex flex-col w-full max-w-[1000px] mx-auto">
                  <div className="flex flex-row justify-between items-center gap-7">
                    <div className="font-bold text-xl mb-2">Links</div>
                  </div>
                  {/* Show array in its purest form, for testing purposes lol
                       <pre>{JSON.stringify(links, null, 2)}</pre>
                  */}

                  {/* Check if tehre's links, if not then show no links found msg */}        
                  {links.length > 0 ? (
                    <div className="w-full flex flex-row flex-wrap gap-2">
                      {links.map((link) => (
                        <div 
                          key={link.linkID}
                          className="flex flex-row justify-center items-center bg-projectcard-primary rounded-full p-4 min-w-[150px]"
                        >
                          <a 
                            href={link.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline flex items-center gap-2 cursor-pointer"
                          >
                            <div className="text-l font-bold text-foreground">
                              {link.linkName}
                            </div>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No links found for this project.</div>
                  )}

                  <div className="flex flex-row justify-between items-center gap-7">
                    <div className="font-bold text-xl mb-2">Files</div>
                  </div>

                  {/* Check if there's files, if not then show no files found msg */}        
                  
                  {files.length > 0 ? (
                    <div className="p-2">
                      <DataTable columns={clientFileColumns} data={files} />
                    </div>
                  ) : (
                    <div>
                      <div>No files found for this project. Add one!</div>
                    </div>
                  )}
                </div>
              </TabsContent>


              {/* TimeSheet*/}

              <TabsContent value="timesheet" className="w-full">
                <div className="flex flex-col w-full max-w-[1000px] mx-auto gap-5">
                  <div className="flex flex-row justify-between items-center">
                    <div className="font-bold text-xl mb-2">TimeSheet</div>
                  </div>

                  <div className="flex flex-row justify-between items-center gap-5">
                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base text-left">Total Hours Worked</div>
                      <div className="font-bold text-xl text-left">{totalHours} Hours</div>                                            
                    </div>

                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base text-left">Rate Per Hour</div>
                      <div className="font-bold text-xl text-left">${projects.ratePerHour}</div>                                            
                    </div>

                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base text-left">Total Amount</div>
                      <div className="font-bold text-xl text-left">${totalAmount}</div>                                            
                    </div>

                  </div>
                  {tasks.length > 0 ? (
                    <div className="p-2">
                      <DataTable 
                        columns={clientTimeColumns} 
                        data={tasks} 
                      />
                    </div>
                  ) : (
                    <div>
                      <div>No Tasks found for this Timesheet. Add one!</div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

      </div>




  );
}