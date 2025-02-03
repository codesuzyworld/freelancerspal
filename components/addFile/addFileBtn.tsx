'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

//From the button, get the projectID and pass to the adding Link Page
interface AddTaskBtnProps {
  projectID: string;  
}


export default function AddTaskBtn({ projectID }: AddTaskBtnProps) {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push(`/project/${projectID}/addFile`)}
    >
      <Plus className="h-4 w-4" />
      Add File
    </Button>
  );
}
