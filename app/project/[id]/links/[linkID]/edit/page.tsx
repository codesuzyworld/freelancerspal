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
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

//Creating a Zod form Schema for adding project
//This is for form validation, and will display the error message easily :D 
const formSchema = z.object({
    linkName: z.string().min(1, {message: "Name your link please!"}),
    link: z.string().min(1, {message: "Input an URL please!"}),
});

interface EditLinkProps {
  params: Promise<{ 
    id: string; 
    linkID: string; 
  }>
}



export default function AddLink({ params }: EditLinkProps) {
    const router = useRouter(); 
    const supabase = createClient(); 
    
    // Use React.use() to unwrap the params
    const { id } = use(params);
    const { linkID } = use(params);

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
            linkName: "",
            link: "",
        },
    });

    // Fetch the link data 
    useEffect(() => {
        async function fetchLink() {
            const { data: link, error } = await supabase
                .from('links')
                .select()
                .eq('linkID', linkID)
                .single();
            

            if (error) {
                toast({
                    title: "Error",
                    description: "Failed to fetch link",
                    variant: "destructive"
                });
                return;
            }

            // Only reset form if we have link data
            if (link) {
                form.reset({
                    linkName: link.linkName,
                    link: link.link,
                });
            }
        }

        fetchLink();
    }, [linkID, form]);

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
                .from('links')
                .update({
                    linkName: values.linkName,
                    link: values.link,
                })
                .eq('linkID', linkID)
                .eq('projectID', id);

            if (error) {
                toast({
                    title: "Error",
                    description: "Failed to edit link: " + error.message,
                    variant: "destructive"
                });
                return;
            }
        
            toast({
                title: "Success",
                description: "Link edited successfully",
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
                  <div>Add New Link</div>
                </BreadcrumbPage>
              </BreadcrumbItem>

            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
        <div className="flex flex-col p-10 items-center justify-center">
            <h1>Add Link</h1>
            <br></br>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-md w-full flex flex-col gap-6">
                    {/* Link Name */}
                    <FormField 
                        control={form.control} 
                        name="linkName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Link Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="My Cool Link" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Link URL */}
                    <FormField 
                        control={form.control} 
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full">Edit Link</Button>
                </form>
            </Form>
        </div>
        </>
    );
}

