"use client"

//Tabs ShadCN imports


  
  // Data Table ShadCN imports
  // This ShadCN table allows users to search and filter items within the table, very handy ;D
  import { ColumnDef } from "@tanstack/react-table"
  import { ArrowUpDown, ChevronDown, MoreHorizontal, Copy, LinkIcon } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { toast } from "@/hooks/use-toast"
  import Link from "next/link"

  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu"


  
  //Define the Link Table Columns
  //Code from shadCN docs https://ui.shadcn.com/docs/components/data-table#basic-table
  export type TimeTable = {
    taskID: string
    taskName: string
    taskDate: Date
    hourSpent: number
    taskDesc: string
    projectID: string
  }
  

  export const timecolumns: ColumnDef<TimeTable>[] = [

    {
      accessorKey: "taskName",
      header: "Task",
    },
    {
      accessorKey: "taskDate",
      header: "Date",
    },
    {
      accessorKey: "hourSpent",
      header: "Hours Spent",
    },
    {
      accessorKey: "taskDesc",
      header: "Description",
    },
      {
        id: "actions",
        cell: ({ row }) => {
          const task = row.original
     
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/tasks/${row.original.taskID}/edit`} className="w-full">
                    Edit Task
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/tasks/${row.original.taskID}/delete`} className="w-full">
                    Delete Task
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },

  ]