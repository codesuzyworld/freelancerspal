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
      className="bg-[#1B43B8] text-white hover:bg-[#238DF7] hover:text-white"
      onClick={() => router.push(`/project/${projectID}/editProject`)}
    >
      <Pencil className="h-4 w-2" />
      <span className="hidden md:inline">Edit</span>
    </Button>
  );
}
