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
interface EditFileProps {
    params: Promise<{ 
      id: string;
      fileID: string;
    }>
  }

export default function AddFile({ params }: EditFileProps) {

  // react useState hook to manage file state 
  const [file, setFile] = useState<File | null>(null)

  //Create supabase client instance
  const supabase = createClient()
  const router = useRouter()

  // Unwrap the params Promise using React.use()
    const { id } = use(params);
    const { fileID } = use(params);

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
  
  // Add state for filename
  const [fileName, setFileName] = useState<string>('');

  // Add to existing useEffect or create a new one
  useEffect(() => {
    async function getCurrentFile() {
      const { data: currentFile } = await supabase
        .from('files')
        .select('fileName')
        .eq('fileID', fileID)
        .single();
      
      if (currentFile) {
        setFileName(currentFile.fileName);
      }
    }
    getCurrentFile();
  }, [fileID]);
  
  // preventDefault prevents refresh after submitting form 
  // we need the toasts and async await for file upload 
  // react.formevent is typescript, specifies that its a form event 
  const handleDelete = async (event: React.FormEvent) => {
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

      // Get the current file information
      const { data: currentFile } = await supabase
        .from('files')
        .select('fileName')
        .eq('fileID', fileID)
        .single()
      
      if (!currentFile) {
        toast({
          title: "Error",
          description: "Current file not found",
          variant: "destructive"
        })
        return
      }

      // Delete file from storage
      const { data, error } = await supabase.storage
        .from('projectFiles')
        .remove([`${id}/${currentFile.fileName}`])

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete file: " + error.message,
          variant: "destructive"
        })
        return
      }

      // After we upload the file, we gotta update the files table so it can be linked with info
      // First we will try and get the public URL of the file
      const { data: { publicUrl } } = supabase
        .storage
        .from('projectFiles')
        .getPublicUrl(`${id}/${currentFile.fileName}`)

      // Update the files table
      const { error: fileError } = await supabase
        .from('files')
        .delete()
        .eq('fileID', fileID);

      if (fileError) {
        toast({
          title: "Error",
          description: "Failed to delete file table: " + fileError.message,
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
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
              <div>Delete File</div>
            </BreadcrumbPage>
          </BreadcrumbItem>

        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
  <div className="flex flex-col p-10 items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Delete File</h1>
        <p className="text-center mb-4">
            Are you sure you want to delete "{fileName}"?<br/>
            This action cannot be undone.
        </p>
        <div className="flex gap-4">
            <Button variant="destructive" onClick={handleDelete}>
                Delete File
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
                Cancel
            </Button>
        </div>
    </div>
    </>
  )
}