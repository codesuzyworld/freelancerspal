"use client"

//Tabs ShadCN imports

  // Data Table ShadCN imports
  // This ShadCN table allows users to search and filter items within the table, very handy ;D
  import { ColumnDef } from "@tanstack/react-table"
  import { MoreHorizontal, Copy } from "lucide-react"
  import { Button } from "@/components/ui/button"

  import Link from "next/link";

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
  export type LinkTable = {
    linkID: string
    linkName: string
    link: string
    projectID: string
  }
  
  export const linkcolumns: ColumnDef<LinkTable>[] = [

    {
      accessorKey: "linkName",
      header: "Link",
    },
    {
      accessorKey: "link",
      header: "URL",
    },
      {
        accessorKey: "copy",
        header: "",
        cell: ({ row }) => {
            const link = row.original.link
            return (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(link)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
            )
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const link = row.original
     
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
                    navigator.clipboard.writeText(link.link)

                  }}
                >
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/links/${row.original.linkID}/edit`} className="w-full">
                    Edit Link
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/project/${row.original.projectID}/links/${row.original.linkID}/delete`} className="w-full">
                    Delete Link
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },

  ]