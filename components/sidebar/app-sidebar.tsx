"use client"

import * as React from "react"
import {
  CalendarClock,
  Command,
  SquareTerminal,
  SquareUserRound,
} from "lucide-react"

import Fa6BrandsSquareXTwitter from '~icons/fa6-brands/square-x-twitter'
import Fa6BrandsGithub from '~icons/fa6-brands/github'

import { NavMain } from "@/components/sidebar/nav-main"
import { NavProjects } from "@/components/sidebar/nav-projects"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { useState } from "react"
import { createClient } from "@/utils/supabase/client"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [    
    {
      title: "My Projects",
      url: "/project",
      icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "TimeSheet Calendar",
      url: "/dashboard",
      icon: CalendarClock,
      isActive: true,
    }
  ],
  navSecondary: [
    {
      title: "Github",
      url: "https://github.com/codesuzyworld",
      icon: Fa6BrandsGithub,
    },
    {
      title: "@CodesSuzy19017",
      url: "https://x.com/CodesSuzy19017",
      icon: Fa6BrandsSquareXTwitter,
    },
  ],
  projects: [

  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [recentProjects, setRecentProjects] = useState([]);
  const supabase = createClient();
  
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                  <img src="/img/freelancerPalLogo.svg" className="size-4" />
                </div>

                <div className="flex flex-row justify-between items-center">
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-black">Freelancer's Pal</span>
                  </div>                  
                </div>

              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
