"use client"

//Tabs ShadCN imports


  
  // Data Table ShadCN imports
  // This ShadCN table allows users to search and filter items within the table, very handy ;D
  import { ColumnDef } from "@tanstack/react-table"
  import { MoreHorizontal, Download } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { toast } from "@/hooks/use-toast"
  import { format } from 'date-fns'
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
  export type FileTable = {
    fileID: string
    created_at: Date
    fileName: string
    fileType: string
    filePath: string
    projectID: string
  }
  


  export const filecolumns: ColumnDef<FileTable>[] = [

    {
      accessorKey: "fileName",
      header: "File Name",
    },
    {
      accessorKey: "created_at",
      header: "Upload Date",
      cell: ({ row }) => {
        return format(new Date(row.original.created_at), 'yyyy-MM-dd')
      }
    },
    {
      accessorKey: "fileType",
      header: "File Type",
    },
    {
      accessorKey: "filePath",
      header: "File Path",
      cell: ({ row }) => {
        const filePath = row.original.filePath

        return (
            <Button 
              variant="ghost" 
              size="sm"
              asChild
            >
              <a 
                href={filePath} 
                target="_blank"
                download
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>

        )
    },
    },
      {
        id: "actions",
        cell: ({ row }) => {
          const filePath = row.original.filePath
     
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
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(filePath)
                    toast({
                      description: "File URL copied to clipboard",
                    })
                  }}
                >
                  Copy File URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/files/${row.original.fileID}/edit`} className="w-full">
                      Edit File
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/files/${row.original.fileID}/delete`} className="w-full">
                    Delete File
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },

  ]