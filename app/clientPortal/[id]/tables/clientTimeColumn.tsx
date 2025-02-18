"use client"

//Tabs ShadCN imports


  
  // Data Table ShadCN imports
  // This ShadCN table allows users to search and filter items within the table, very handy ;D
  import { ColumnDef } from "@tanstack/react-table"
  import { MoreHorizontal} from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { toast } from "@/hooks/use-toast"
  import Link from "next/link"

  
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
  

  export const clientTimeColumns: ColumnDef<TimeTable>[] = [

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
    }
  ]