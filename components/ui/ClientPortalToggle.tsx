"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, RefreshCw, Share2 } from "lucide-react";
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
  const [origin, setOrigin] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const supabase = createClient();

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
    origin && isPublic && token
      ? `${origin}/clientPortal/${projectID}?token=${token}`
      : null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Copied", description: "Client portal link copied to clipboard" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="bg-accent text-white hover:bg-accent/50">
          <Share2 className="h-4 w-4" />
          <span className="hidden md:inline">Share</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium">Client portal access</div>
            <div className="text-xs text-muted-foreground">
              Make this project public to generate a shareable link.
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-2">
            <span className="text-sm">{isPublic ? "Public" : "Private"}</span>
            <Switch
              checked={isPublic}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>

          {isPublic && token && (
            <>
              <div className="flex items-center gap-2">
                <code
                  className="text-xs bg-muted px-2 py-2 rounded truncate flex-1"
                  title={shareUrl ?? ""}
                >
                  {shareUrl ?? "Loading…"}
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
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={isPending}
                className="gap-2 self-start"
                title="Regenerate link (invalidates the current URL)"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate link
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
