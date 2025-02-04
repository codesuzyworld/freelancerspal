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
interface UpdateProjectProps {
  params: Promise<{ 
    id: string 
  }>
}



export default function UpdateProject({ params }: UpdateProjectProps) {

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

    
    //Shadcn Form Schema
    //This will map the formSchema object to the form 
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectName: "",
            projectDate: new Date(),
            ratePerHour: 0,
            projectTags: "",
            projectDesc: "", 
        },
    });

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

            // Fill the form with the existing project deets
            form.reset({
                projectName: project.projectName,
                projectDate: new Date(project.projectDate),
                ratePerHour: project.ratePerHour,
                projectTags: project.projectTags,
                projectDesc: project.projectDesc,
            });
        }
        
        fetchProject();
    }, [id, form]);

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
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

            // Update the existing project
            const { data, error } = await supabase
                .from('projects')
                .update({
                    projectName: values.projectName,
                    projectDate: values.projectDate,
                    ratePerHour: values.ratePerHour,
                    projectTags: values.projectTags,
                    projectDesc: values.projectDesc,
                })
                .eq('projectID', id) 
                .select();

            if (error) {
                toast({
                    title: "Error",
                    description: "Failed to update project: " + error.message,
                    variant: "destructive"
                });
                return;
            }

            toast({
                title: "Success",
                description: "Project updated successfully",
            });

            router.push(`/project/${id}`); // Return to project details
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
            <Form {...form}>

              <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-md w-full flex flex-col gap-6">

                {/* Project Name */}
                <FormField control={form.control} name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Project"  type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date picker */}
                <FormField
                  control={form.control}
                  name="projectDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Project Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate Per Hour */} 
                <FormField control={form.control} name="ratePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Per Hour</FormLabel>
                      <FormControl>
                        <Input placeholder="30" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />               

                {/* Project Tags */}
                <FormField control={form.control} name="projectTags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="Web Development, Mobile Development, etc."  type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>Input Tags seperated by commas</FormDescription>
                    </FormItem>
                  )}
                />   

                {/* Project Description */}
                <FormField
                control={form.control}
                name="projectDesc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your project"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                </FormItem>
                )}
              />                

              <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </Form>
        </div>
      </>
    );
}

