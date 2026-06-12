"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { setClientPortalAccess } from "@/app/(main)/project/[id]/actions";

interface ClientPortalToggleProps {
  projectID: string;
  initialState?: boolean;
  initialToken?: string | null;
}

export function ClientPortalToggle({
  projectID,
  initialState = false,
  initialToken = null,
}: ClientPortalToggleProps) {
  const [isPublic, setIsPublic] = React.useState(initialState);
  const [token, setToken] = React.useState<string | null>(initialToken);
  const [isPending, startTransition] = React.useTransition();
  const supabase = createClient();

  // Keep an initial fetch in case the parent didn't pass props (back-compat).
  React.useEffect(() => {
    if (initialToken !== null || initialState) return;
    let cancelled = false;
    async function fetchInitialState() {
      const { data, error } = await supabase
        .from("projects")
        .select("clientPortal, clientPortalToken")
        .eq("projectID", projectID)
        .single();
      if (cancelled) return;
      if (!error && data) {
        setIsPublic(!!data.clientPortal);
        setToken(data.clientPortalToken ?? null);
      }
    }
    fetchInitialState();
    return () => { cancelled = true; };
  }, [projectID]);

  const callAction = (enabled: boolean) => {
    startTransition(async () => {
      const result = await setClientPortalAccess(projectID, enabled);
      if (!result.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      setIsPublic(result.clientPortal);
      setToken(result.token);
      toast({
        title: "Success",
        description: result.clientPortal
          ? "Client portal enabled with a fresh link"
          : "Client portal disabled",
      });
    });
  };

  const handleToggle = () => callAction(!isPublic);
  const handleRegenerate = () => callAction(true);

  const shareUrl =
    typeof window !== "undefined" && isPublic && token
      ? `${window.location.origin}/clientPortal/${projectID}?token=${token}`
      : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Copied", description: "Client portal link copied to clipboard" });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch checked={isPublic} onCheckedChange={handleToggle} disabled={isPending} />
        <span className="text-sm text-muted-foreground">
          {isPublic ? "Public" : "Private"}
        </span>
      </div>

      {isPublic && token && (
        <div className="flex flex-col gap-1 max-w-full">
          <div className="text-xs text-muted-foreground">Shareable link</div>
          <div className="flex items-center gap-2 max-w-full">
            <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1" title={shareUrl ?? ""}>
              {shareUrl ?? "Loading..."}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              disabled={!shareUrl || isPending}
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRegenerate}
              disabled={isPending}
              title="Regenerate link (invalidates the current URL)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
