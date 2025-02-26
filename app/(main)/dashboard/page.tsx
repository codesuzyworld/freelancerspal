import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TimeSheetCalendar from "@/components/timeSheetcalendar/page";
import { DataTable } from "../project/[id]/linkTable/data-table";
import { taskDayTableColumns } from "./taskDayTable/columns";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {

  SidebarTrigger,
} from "@/components/ui/sidebar"


export default async function Dashboard() {
    const supabase = await createClient();

    // Get auth in this page, if user isnt logged in, redirect to sign in page
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return redirect("/sign-in");
    }

    //Check if user is admin
    const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

    // Get projects based on admin status and search query
    let query = supabase
        .from("tasks")
        .select();



    query = query.order('taskDate', { ascending: false });

    const { data: tasks, error } = await query;

    // If the user is not an admin, filter to only show user's projects
    if (!adminCheck) {
        const { data: userTasks } = await supabase
            .from("tasks")
            .select()
            .eq("userID", user.id)
            .order('taskDate', { ascending: false });

        return (
            <div className="flex justify-center w-full">
                <div className="p-1 md:p-10 w-full max-w-[1500px]">
                    <header className="flex h-16 shrink-0 items-center gap-2">
                        <div className="flex items-center gap-2 px-4 w-full">
                          <SidebarTrigger className="-ml-1" />
                          <Separator orientation="vertical" className="mr-2 h-4" />
                          <Breadcrumb>
                            <BreadcrumbList>
                              <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">

                                </BreadcrumbLink>
                              </BreadcrumbItem>
                              <BreadcrumbSeparator className="hidden md:block" />
                              <BreadcrumbItem>
                                <BreadcrumbPage className="flex flex-row justify-between items-center gap-10 ">
                                   <div className="font-bold text-2xl">Dashboard</div>
                                </BreadcrumbPage>
                              </BreadcrumbItem>
                            </BreadcrumbList>
                          </Breadcrumb>
                        </div>
                      </header>
                      <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
                        <div className="min-h-[100vh] w-full p-4">

                        <div>
                          <TimeSheetCalendar />
                        </div>
                        </div>
                      </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center w-full">
            <div className="p-1 md:p-10 w-full max-w-[1500px]">
                <header className="flex h-16 shrink-0 items-center gap-2">
                    <div className="flex items-center gap-2 px-4 w-full">
                      <SidebarTrigger className="-ml-1" />
                      <Separator orientation="vertical" className="mr-2 h-4" />
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="#">
                            </BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator className="hidden md:block" />
                          <BreadcrumbItem>
                            <BreadcrumbPage className="flex flex-row justify-between items-center gap-10 ">
                               <div className="font-bold text-2xl">Timesheet Dashboard</div>
                            </BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>
                  </header>
                  <div className="flex flex-1 flex-row flex-wrap gap-4 p-4 pt-0">
                    <div className="min-h-[100vh] w-full p-4">
                      <div>
                        <TimeSheetCalendar />
                      </div>

                    </div>
                  </div>
            </div>
        </div>
    );
}