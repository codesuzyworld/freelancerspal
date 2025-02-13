//Use Client make this file a client component instead of a server component
'use client';

// This is client-side Supabase instance
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation"; 
import { useEffect } from "react";

//I learned how to do Shadcn Forms with NextJs through this video: 
// https://www.youtube.com/watch?v=oGq9o2BxlaI

// Zod and React Hook Form Imports
//ShadCn Imports, it's a library for UI components
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

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
import { use, useState } from "react";

//Creating a Zod form Schema for adding project
//This is for form validation, and will display the error message easily :D 
const formSchema = z.object({
    projectName: z.string().min(1, {message: "Oops!Project Name is required"}),
    projectDate: z.date({required_error: "Choose a Project Date",}),
    //Apparently here, I gotta use coerce method to turn string to number, as input only outputs string
    ratePerHour: z.coerce.number().min(1, {message: "Gotta get paid, right?"}),
    projectTags: z.string().min(1, {message: "Input at least one tag please!"}),
    projectDesc: z.string().min(1, {message: "Describe your project please!"}),
});


// we are passing the project id as a param here 
interface DeleteProjectProps {
  params: Promise<{ 
    id: string 
  }>
}



export default function UpdateProject({ params }: DeleteProjectProps) {

    //Hooks for client component and supabase instance
    const router = useRouter(); 
    const supabase = createClient(); 

    // Unwrap the params Promise using React.use()
    const { id } = use(params);

    const [projectName, setProjectName] = useState<string>('');
    // Since this is a client side component, we gotta use useEffect to fetch the project name after component mounts, cuz we cant use async await
    useEffect(() => {
        async function getProject() {
            const { data: project } = await supabase
                .from("projects")
                .select()
                .eq("projectID", id)
                .single();
            
            // Let's set the project name after getting it from supabase
            setProjectName(project.projectName);
            
        }
        // call the function
        getProject();
    }, [id]);

    

    useEffect(() => {
        async function fetchProject() {

            //Fetch project details 
            const { data: project, error } = await supabase
                .from("projects")
                .select()
                .eq("projectID", id)
                .single();
            
            if (error) {
                toast({
                    title: "Error",
                    description: "Failed to fetch project details",
                    variant: "destructive"
                });
                return;
            }
        }
        fetchProject();
    }, [id]);

    const handleDelete = async () => {
      // try catch block for error handling within handlesubmit
      try{
        // Get current user 
        const { data: { user } } = await supabase.auth.getUser();
        // If user is not authenticated, throw a toast error, yummy
        if (!user) {
          toast({
            title: "Error",
            description: "You are not authenticated",
            variant: "destructive"
          });
          return;
        }

        // First get all files associated with this project
        const { data: files } = await supabase
          .from('files')
          .select('fileName')
          .eq('projectID', id);

        // If there are files, delete them from storage
        if (files && files.length > 0) {
          const filePaths = files.map(file => `${id}/${file.fileName}`);
          
          const { error: storageError } = await supabase.storage
            .from('projectFiles')
            .remove(filePaths);

          if (storageError) {
            toast({
              title: "Error",
              description: "Failed to delete files from storage: " + storageError.message,
              variant: "destructive"
            });
            return;
          }
        }

        // Delete the project (this will cascade delete all related records)
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('projectID', id);

        if (error) {
          toast({
            title: "Error",
            description: "Failed to delete project: " + error.message,
            variant: "destructive"
          });
          return;
        }

        toast({
            title: "Success",
            description: "Project deleted successfully",
        });

        router.push('/project');
        router.refresh();

      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    };

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
                {/* // One thing I'm learning here is that I have to use backticks to interpolate id here */}
                  <Link href={`/project/${id}`}>{projectName}</Link>
                </BreadcrumbPage>
              </BreadcrumbItem>
              
              <BreadcrumbSeparator className="hidden md:block" />

              <BreadcrumbItem>
                <BreadcrumbPage className="flex flex-row justify-between items-center gap-10">
                  <div>Edit Project</div>
                </BreadcrumbPage>
              </BreadcrumbItem>

            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
        <div className="flex flex-col p-10 items-center justify-center">
            <h1>Edit {projectName}</h1>
            <br></br>
            <div className="flex flex-col p-10 items-center justify-center gap-4">
              <h1 className="text-2xl font-bold">Delete File</h1>
              <p className="text-center mb-4">
                  Are you sure you want to delete "{projectName}"?<br/>
                  This action cannot be undone.
              </p>
              <div className="flex gap-4">
                  <Button variant="destructive" onClick={handleDelete}>
                      Delete Project
                  </Button>
                  <Button variant="outline" onClick={() => router.back()}>
                      Cancel
                  </Button>
              </div>
            </div>
        </div>
      </>
    );
}

