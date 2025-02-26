"use client"

//Tabs ShadCN imports


  
  // Data Table ShadCN imports
  // This ShadCN table allows users to search and filter items within the table, very handy ;D
  import { ColumnDef } from "@tanstack/react-table"
  import Link from "next/link"
  import { FolderSymlink } from "lucide-react"

  
  //Define the Link Table Columns
  //Code from shadCN docs https://ui.shadcn.com/docs/components/data-table#basic-table
  export type TaskDayTable = {
    taskID: string
    taskName: string
    taskDate: Date
    hourSpent: number
    taskDesc: string
    projectID: string
  }
  

  export const taskDayTableColumns: ColumnDef<TaskDayTable>[] = [

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
      accessorKey: "projectID",
      header: "Project",
      cell: ({ row }) => {
          const projectID = row.original.projectID
          return (
              <Link href={`/project/${projectID}`} className="text-primary">
                <FolderSymlink className="w-4 h-4" />
              </Link>
          )
      },
    },

  ]