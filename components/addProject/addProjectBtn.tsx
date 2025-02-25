import Link from "next/link";
import { Button } from "../ui/button";

export default function AddProjectBtn() {
  return (
    <>
      <Link
        href="/project/addProject"
      >
        <Button className="flex items-center gap-2 bg-accent text-white hover:bg-accent/50" size={"sm"}>
          <span>Add Project</span>
        </Button>
      </Link>
    </>
  );
}
