'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Image } from "lucide-react";

//From the button, get the projectID and pass to the adding Link Page
interface AddCoverImageProps {
  projectID: string;  
}


export default function AddTaskBtn({ projectID }: AddCoverImageProps) {
  const router = useRouter();

  return (
    <Button
      className="bg-[#238DF7] text-white"
      onClick={() => router.push(`/project/${projectID}/addCoverImage`)}
    >
      <Image className="h-4 w-4" />
      <span className="hidden md:inline">Add Cover Image</span>
    </Button>
  );
}
