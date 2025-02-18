'use client'

import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/utils/supabase/client"
import { toast } from "@/hooks/use-toast"

//Props Interface
interface ClientPortalToggleProps {
  projectID: string;
  initialState?: boolean;
}

export function ClientPortalToggle({ projectID, initialState = false }: ClientPortalToggleProps) {
  const [isPublic, setIsPublic] = React.useState(initialState)
  const supabase = createClient()

  // Fetch initial state when component mounts
  React.useEffect(() => {
    async function fetchInitialState() {
      const { data, error } = await supabase
        .from('projects')
        .select('clientPortal')
        .eq('projectID', projectID)
        .single()
      
      if (!error && data) {
        setIsPublic(data.clientPortal)
      }
    }
    
    fetchInitialState()
  }, [projectID])

  const handleToggle = async () => {
    // Toggle the state
    const projectVisibility = !isPublic

    // Update database
    const { error } = await supabase
      .from('projects')
      .update({ clientPortal: projectVisibility })
      .eq('projectID', projectID)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update client portal status",
        variant: "destructive"
      })
      return
    }

    setIsPublic(projectVisibility)
    toast({
      title: "Success",
      description: `Client portal ${projectVisibility ? 'public' : 'private'}`,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isPublic}
        onCheckedChange={handleToggle}
      />
      <span className="text-sm text-muted-foreground">
        {isPublic ? 'Public' : 'Private'}
      </span>
    </div>
  )
}
