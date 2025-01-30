import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default async function ProjectDetails() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }


}