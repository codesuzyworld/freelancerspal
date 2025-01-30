import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: {
    id: string;
  };
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
    const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .eq("projectID", id)
    .eq("userID", user.id)
    .single();
    
    //Error Handling
    if (error) {
      console.error("Error fetching project:", error);
      return <div>Error loading project</div>;
      }


    return (
      <div>
        <div className="w-full flex justify-between items-center">
          <h1 className="text-2xl font-bold">Project Details</h1>
        </div>
        <div>
            <p>{projects.projectName}</p>
            <p>{projects.projectDate}</p>
            <p>{projects.projectDesc}</p>
            <p>{projects.projectTags}</p>       
        </div>
      </div>
    );
}