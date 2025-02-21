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

interface DeleteLinkProps {
  params: Promise<{ 
    id: string; 
    linkID: string; 
  }>
}

export default function DeleteTask({ params }: DeleteLinkProps) {
    const router = useRouter(); 
    const supabase = createClient(); 
    
    // Use React.use() to unwrap the params
    const { id } = use(params);
    const { linkID } = use(params);

    const [projectName, setProjectName] = useState<string>('');
    const [linkName, setLinkName] = useState<string>('');

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
        async function getLink() {
            const { data: link } = await supabase
                .from("links")
                .select()
                .eq("linkID", linkID)
                .single();          
            if (link) {
                setLinkName(link.linkName);
            }
        }
        getLink();
    }, [linkID]);

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
            .from('links')
            .delete()
            .eq('linkID', linkID);

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
                  <div>Delete Link</div>
                </BreadcrumbPage>
              </BreadcrumbItem>

            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
        <div className="flex flex-col p-10 items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Delete Task</h1>
            <p className="text-center mb-4">
                Are you sure you want to delete "{linkName}"?<br/>
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

