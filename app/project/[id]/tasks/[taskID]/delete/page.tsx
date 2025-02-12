"use client"
// This is client-side Supabase instance
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation"; 
import Link from "next/link";

// We cannot use direct access to param properties, now in the current nextjs version,
// we gotta unwrap the params object first with React.use()
import { use } from 'react'; 

//I learned how to do Shadcn Forms with NextJs through this video: 
// https://www.youtube.com/watch?v=oGq9o2BxlaI

// Zod and React Hook Form Imports
//ShadCn Imports, it's a library for UI components
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";

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

interface DeleteTaskProps {
  params: Promise<{ 
    id: string; 
    taskID: string; 
  }>
}

export default function DeleteTask({ params }: DeleteTaskProps) {
    const router = useRouter(); 
    const supabase = createClient(); 
    
    // Use React.use() to unwrap the params
    const { id } = use(params);
    const { taskID } = use(params);

    const [projectName, setProjectName] = useState<string>('');
    const [taskName, setTaskName] = useState<string>('');

    // Fetch project name
    useEffect(() => {
        async function getProject() {
            const { data: project } = await supabase
                .from("projects")
                .select()
                .eq("projectID", id)
                .single();          
            setProjectName(project.projectName);
        }
        getProject();
    }, [id]);

    // Fetch task name
    useEffect(() => {
        async function getTask() {
            const { data: task } = await supabase
                .from("tasks")
                .select()
                .eq("taskID", taskID)
                .single();          
            if (task) {
                setTaskName(task.taskName);
            }
        }
        getTask();
    }, [taskID]);

    const handleDelete = async () => {
        try {
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
            .delete()
            .eq('taskID', taskID);

            if (error) {
                toast({
                    title: "Error",
                    description: "Failed to delete task: " + error.message,
                    variant: "destructive"
                });
                return;
            }
        
            toast({
                title: "Success",
                description: "Task deleted successfully",
            });
        
            router.push(`/project/${id}`);
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
                  <div>Delete Task</div>
                </BreadcrumbPage>
              </BreadcrumbItem>

            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
        <div className="flex flex-col p-10 items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Delete Task</h1>
            <p className="text-center mb-4">
                Are you sure you want to delete "{taskName}"?<br/>
                This action cannot be undone.
            </p>
            <div className="flex gap-4">
                <Button variant="destructive" onClick={handleDelete}>
                    Delete Task
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
            </div>
        </div>
        </>
    );
}

