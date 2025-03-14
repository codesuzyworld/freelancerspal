import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AddLinkBtn from "@/components/addLink/addLinkBtn";
import AddTimeBtn from "@/components/addTime/addTimeBtn";
import AddFileBtn from "@/components/addFile/addFileBtn";
import EditProjectBtn from "@/components/editProject/editProjectBtn";
import DeleteProjectBtn from "@/components/deleteProject/deleteProjectBtn";
import AddCoverImageBtn from "@/components/addCoverImage/addCoverImageBtn";
import ClientPortalBtn from "@/components/clientPortal/clientPortalBtn";
import { ClientPortalToggle } from "@/components/ui/ClientPortalToggle";
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

import { Switch } from "@/components/ui/switch"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import Fa6BrandsGithub from '~icons/fa6-brands/github'
import Fa6BrandsSquareXTwitter from '~icons/fa6-brands/square-x-twitter'

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

    // Add authorization check
    const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

    // Check if user has access to this project
    const hasAccess = projects.userID === user.id || adminCheck;

    if (!hasAccess) {
        return redirect("/project");
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
      <div className="p-1 md:p-10">
      <header className="flex h-16 shrink-0 items-center gap-2 w-full">
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-[1000px] flex items-center gap-2 px-4">
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
                  <BreadcrumbPage>
                    <Link href="/project">Projects</Link>
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    <div>{projects.projectName}</div>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
        <div className="min-h-[100vh] w-full p-4">

          {/* Project Info*/}


              <div className="flex flex-col justify-center items-center w-full gap-10">
                {/* Project Name and Actions - Moved outside */}
                <div className="w-full max-w-[1000px] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="w-full font-bold text-xl text-center md:text-left">{projects.projectName}</div>
                  <div className="w-full flex flex-row gap-2 justify-end">
                    <EditProjectBtn projectID={projects.projectID}/> 
                    <DeleteProjectBtn projectID={projects.projectID}/>
                    <AddCoverImageBtn projectID={projects.projectID}/>                                                  
                    <ClientPortalBtn projectID={projects.projectID}/>
                    <ClientPortalToggle projectID={projects.projectID}/>
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
                    <div className="w-full text-base text-projectcard-foreground flex flex-col justify-start md:flex-row gap-5 ">
                      <p className="flex flex-row md:flex-col items-center md:items-start gap-1 text-left">
                        <span className="font-bold text-[0.8rem]">Project Date:</span> 
                        <span className="text-accent-foreground font-bold">
                          {new Date(projects.projectDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                          </span>
                      </p>
                      <p className="flex flex-row md:flex-col items-center md:items-start gap-1 text-left">
                        <span className="font-bold text-[0.8rem]">Created On:</span> 
                        <span className="text-accent-foreground font-bold">{new Date(projects.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      </span>
                      </p>
                      <p className="flex flex-row md:flex-col items-center md:items-start gap-1 text-left">
                        <span className="font-bold text-[0.8rem]">Rate Per Hour:</span> 
                        <span className="text-accent-foreground font-bold">
                          ${projects.ratePerHour}
                        </span>
                      </p>
                      <p className="flex flex-row md:flex-col items-center md:items-start gap-1 text-left">
                        <span className="font-bold text-[0.8rem]">Total Hours:</span> 
                        <span className="text-accent-foreground font-bold">
                          {totalHours} Hours
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
                <div className="flex flex-col w-full max-w-[1000px] mx-auto gap-5">

                  {/* This is the links Table */}
                  <div>
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
                      <div className="flex flex-col items-center justify-center gap-5 p-10 mt-3 bg-projectcard-primary rounded-lg">
                        <div className="text-center">No links found for this project. Add one!</div>
                        <AddLinkBtn projectID={projects.projectID} />
                      </div>
                    )}                    
                  </div>

                  {/* This is the files Table */}
                  <div>
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
                    <div className="flex flex-col items-center justify-center gap-5 p-10 mt-3 bg-projectcard-primary rounded-lg">
                      <div className="text-center">No files found for this project. Add one!</div>
                      <AddFileBtn projectID={projects.projectID} />
                    </div>
                  )}
                </div>                    
                  </div>

              </TabsContent>


              {/* TimeSheet*/}

              <TabsContent value="timesheet" className="w-full">
                <div className="flex flex-col w-full max-w-[1000px] mx-auto gap-5">
                  <div className="flex flex-row justify-between items-center">
                    <div className="font-bold text-xl mb-2">TimeSheet</div>
                    <AddTimeBtn projectID={projects.projectID}/>
                  </div>

                  <div className="flex flex-col md:flex-row flex-wrap md:flex-nowrap items-center gap-5">
                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base md:text-left text-center whitespace-nowrap">Total Hours Worked</div>
                      <div className="font-bold text-xl md:text-left text-center whitespace-nowrap">{totalHours} Hours</div>                                            
                    </div>

                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base md:text-left text-center whitespace-nowrap">Rate Per Hour</div>
                      <div className="font-bold text-xl md:text-left text-center">${projects.ratePerHour}</div>                                            
                    </div>

                    <div className="w-full flex flex-col bg-projectcard-primary px-10 py-3 rounded-lg">
                      <div className="font-bold text-base md:text-left text-center whitespace-nowrap">Total Amount</div>
                      <div className="font-bold text-xl md:text-left text-center">${totalAmount}</div>                                            
                    </div>

                  </div>
                  {tasks.length > 0 ? (
                    <div className="p-2">
                      <DataTable 
                        columns={timecolumns} 
                        data={tasks} 
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-5 p-10 mt-3 bg-projectcard-primary rounded-lg">
                      <div className="text-center">No Tasks found for this Timesheet. Add one!</div>
                      <AddTimeBtn projectID={projects.projectID} />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

      </div>
    </div>

    </div>
  );
}