'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientPortalProps {
  projectID: string;
  token: string | null;
}

export default function ClientPortalBtn({ projectID, token }: ClientPortalProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!token) {
      toast({
        title: "Client portal is private",
        description: "Enable the client portal to get a shareable link.",
        variant: "destructive",
      });
      return;
    }
    router.push(`/clientPortal/${projectID}?token=${token}`);
  };

  return (
    <Button
      className="bg-secondary text-white hover:bg-accent/50"
      onClick={handleClick}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden md:inline">Client Portal</span>
    </Button>
  );
}
