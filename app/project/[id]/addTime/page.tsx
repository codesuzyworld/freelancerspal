"use client";
// This is client-side Supabase instance
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation"; 
import Link from "next/link";

// We cannot use direct access to param properties, now in the current nextjs version,
// we gotta unwrap the params object first with React.use()
import { use } from 'react'; 


// Zod and React Hook Form Imports
//ShadCn Imports, it's a library for UI components
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";



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
import { useState, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";


const formSchema = z.object({
    taskName: z.string().min(1, {message: "Oops!Project Name is required"}),
    taskDate: z.date({required_error: "Choose a Task Date",}),
    hourSpent: z.coerce.number().min(1, {message: "Your time is valuable, don't waste it!"}),
    taskDesc: z.string().min(1, {message: "Tell us what you did for this task."}),
});


interface AddTaskProps {
    params: Promise<{ 
      id: string 
    }>
  }

export default function AddTaskForm({ params }: AddTaskProps) {

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

    //Form Schema setup
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            taskName: "",
            taskDate:  new Date(),
            hourSpent: 0,
            taskDesc: "",
        },
    });


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
  
              const { data, error } = await supabase
              .from('tasks')
              .insert([{
                  userID: user.id,
                  projectID: id,
                  taskName: values.taskName,
                  taskDate: values.taskDate,
                  hourSpent: values.hourSpent,
                  taskDesc: values.taskDesc,
              }])
              .select();
  

              if (error) {
                  toast({
                      title: "Error",
                      description: "Failed to add task: " + error.message,
                      variant: "destructive"
                  });
                  return;
              }
          
              toast({
                  title: "Success",
                  description: "Task added successfully",
              });
          
              // show timesheet tab
              router.push(`/project/${id}?tab=timesheet`);
              router.refresh();
  
          } catch (error) {
              toast({
                  title: "Error",
                  description: "An unexpected error occurred",
                  variant: "destructive"
              });
          }
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
                  {/* // One thing I'm learning here is that I have to use backticks to interpolate id here */}
                    <Link href={`/project/${id}`}>{projectName}</Link>
                  </BreadcrumbPage>
                </BreadcrumbItem>
                
                <BreadcrumbSeparator className="hidden md:block" />
  
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex flex-row justify-between items-center gap-10">
                    <div>Add New Task</div>
                  </BreadcrumbPage>
                </BreadcrumbItem>
  
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
          <div className="flex flex-col p-10 items-center justify-center">
              <h1>Add Task</h1>
              <br></br>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-md w-full flex flex-col gap-6">
                      {/* Link Name */}
                      <FormField 
                          control={form.control} 
                          name="taskName"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="My Task" {...field} />
                                </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Date picker */}
                <FormField
                control={form.control}
                name="taskDate"
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

                {/* hours spent */}
                <FormField 
                    control={form.control} 
                    name="hourSpent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hours Spent on Task</FormLabel>
                            <FormControl>
                                <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Project Description */}
                <FormField
                    control={form.control}
                    name="taskDesc"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Task Description</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Describe your task"
                            className="resize-none"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />      
    

                      <Button type="submit" className="w-full">Add Task</Button>
                  </form>
              </Form>
          </div>
          </>
      );
  }