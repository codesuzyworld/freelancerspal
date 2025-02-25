'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Pencil } from "lucide-react";

//From the button, get the projectID and pass to the adding Link Page
interface EditProjectBtnProps {
  projectID: string;  
}


export default function EditProjectBtn({ projectID }: EditProjectBtnProps) {
  const router = useRouter();

  return (
    <Button
      className="bg-accent text-white hover:bg-accent/50"
      onClick={() => router.push(`/project/${projectID}/editProject`)}
    >
      <Pencil className="h-4 w-2" />
      <span className="hidden md:inline">Edit</span>
    </Button>
  );
}
