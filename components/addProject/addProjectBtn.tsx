import Link from "next/link";
import { Button } from "../ui/button";

export default function AddProjectBtn() {
  return (
    <>
      <Link
        href="/project/addProject"
      >
        <Button className="flex items-center gap-2 bg-[#1B43B8] text-white hover:bg-[#238DF7] hover:text-white" size={"sm"}>
          <span>Add Project</span>
        </Button>
      </Link>
    </>
  );
}
