'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

//From the button, get the projectID and pass to the adding Link Page
interface ClientPortalProps {
  projectID: string;  
}


export default function AddTaskBtn({ projectID }: ClientPortalProps) {
  const router = useRouter();

  return (
    <Button
      className="bg-secondary text-white hover:bg-accent/50"
      onClick={() => router.push(`/clientPortal/${projectID}`)}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden md:inline">Client Portal</span>
    </Button>
  );
}
