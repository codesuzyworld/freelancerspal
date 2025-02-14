'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Trash2 } from "lucide-react";

interface DeleteProjectBtnProps {
  projectID: string;
}

export default function DeleteProjectBtn({ projectID }: DeleteProjectBtnProps) {

  const router = useRouter();
  return (
      <Button
      onClick={() => router.push(`/project/${projectID}/deleteProject`)}
    >
      <Trash2 className="h-4 w-2" />
      Delete Project
    </Button>

  );
}
