import Link from "next/link";
import { Button } from "../ui/button";

interface DeleteProjectBtnProps {
  projectID: string;
}

export default function DeleteProjectBtn({ projectID }: DeleteProjectBtnProps) {
  return (
    <>
      <Link
        href={`/project/${projectID}/deleteProject`}
      >
        <Button className="flex items-center gap-2" size={"sm"}>
          <span>Delete Project</span>
        </Button>
      </Link>
    </>
  );
}
