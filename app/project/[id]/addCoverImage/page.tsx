"use client";
// This is client-side Supabase instance
import { createClient } from "@/utils/supabase/client"; 
import { useRouter } from "next/navigation"; 
import Link from "next/link";

// We cannot use direct access to param properties, now in the current nextjs version,
// we gotta unwrap the params object first with React.use()
import { use } from 'react'; 


// React Hook Form Imports
//ShadCn Imports, it's a library for UI components
//Here we will only use the shadCN input component for upload and submit button
import { Button } from "@/components/ui/button";
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


// we are passing the project id as a param here 
interface AddCoverImageProps {
    params: Promise<{ 
      id: string 
    }>
  }

export default function AddFile({ params }: AddCoverImageProps) {

  // react useState hook to manage file state 
  const [file, setFile] = useState<File | null>(null)

  //Create supabase client instance
  const supabase = createClient()
  const router = useRouter()

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
  
  // preventDefault prevents refresh after submitting form 
  // we need the toasts and async await for file upload 
  // react.formevent is typescript, specifies that its a form event 
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      // Get current user 
      const { data: { user } } = await supabase.auth.getUser()

      // If user is not authenticated, throw a toast error, yummy
      if (!user) {
        toast({
          title: "Error",
          description: "You are not authenticated",
          variant: "destructive"
        })
        return
      }

      // If no file is selected, throw a toast to tell the user to select file plzz, yummy
      if (!file) {
        toast({
          title: "Error",
          description: "Please select a file",
          variant: "destructive"
        })
        return
      }

      // Upload to storage with upsert option, this will replace existing file
      const { data, error } = await supabase.storage
        .from('coverPhoto')
        .upload(`${id}/${file.name}`, file, {
          upsert: true  
        })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to upload file: " + error.message,
          variant: "destructive"
        })
        return
      }

      // Get public URL and update project
      const { data: { publicUrl } } = supabase
        .storage
        .from('coverPhoto')
        .getPublicUrl(`${id}/${file.name}`)

      // Update project record
      const { error: fileError } = await supabase
        .from('projects')
        .update({
          projectPhoto: publicUrl,
        })
        .eq('projectID', id)

      if (fileError) {
        toast({
          title: "Error",
          description: "Failed to update project cover photo record: " + fileError.message,
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Success",
        description: "Project cover photo updated successfully",
      })

      // Redirect back to the project page
      router.push(`/project/${id}`)
      router.refresh()

    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
      console.error(error)
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
              <div>Upload Cover Imagee</div>
            </BreadcrumbPage>
          </BreadcrumbItem>

        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* onChange detects when input changes, 
          once changed, create a FileList object to handle file, then from that array,
        get the first file from the input, if no file is selected, set to null*/}

      <Input 
        type="file" 
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button type="submit">Upload File</Button>
    </form>
    </>
  )
}