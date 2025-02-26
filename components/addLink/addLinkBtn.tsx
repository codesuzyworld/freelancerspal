'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

//From the button, get the projectID and pass to the adding Link Page
interface AddLinkBtnProps {
  projectID: string;  
}


export default function AddLinkBtn({ projectID }: AddLinkBtnProps) {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push(`/project/${projectID}/addlink`)}
      className="bg-accent text-white hover:bg-accent/50"
    >
      <Plus className="h-4 w-4" />
      Add Link
    </Button>
  );
}
