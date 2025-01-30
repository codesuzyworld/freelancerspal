import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/projectCard";
import AddProjectBtn from "@/components/addProject/addProjectBtn";


export default async function Projects() {
    const supabase = await createClient();

    // Get auth in this page, if user isnt logged in, redirect to sign in page
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return redirect("/sign-in");
    }

    // Fetch the userID so that it shows the projects accordingly
    const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .eq("userID", user.id);
    
    if (error) {
        console.error("Error fetching projects:", error);
      }

    //Note to self:Code to show all projects in JSON form
    // return <pre>{JSON.stringify(projects, null, 2)}</pre>

    return (
        <div>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Projects</h1>
          <AddProjectBtn />
        </div>
        {/* Project Card as Component */}
        <ProjectCard projects={projects || []} />
      </div>
    );
}