'use client'
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

//This search bar's code was written with the help of this youtube tutorial
// https://www.youtube.com/watch?v=HQbaiDgH0EA

export default function ProjectSearchBar({ placeholder}: { placeholder: string }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    function handleSearch(keyword: string) {
        const params = new URLSearchParams(searchParams);
        if (keyword) {
            params.set('query', keyword);
        } else {
            params.delete('query');
        }
        //Pathname = current path, and it will add ?$ then the keyword in the URL
        replace(`${pathname}?${params.toString()}`);
    }
    
    // Clear the URL params
    function handleClear() {
        const params = new URLSearchParams(searchParams);
        params.delete('query');
        replace(`${pathname}?${params.toString()}`);
    }

    // Search Bar that will log any changes in input 
    return (
    <form className="flex w-full p-4 items-center space-x-2" onReset={(e) => handleSearch('')}>
    <Input 
    type="text" 
    placeholder= {placeholder}
    onChange={(e) =>{
        handleSearch(e.target.value);
    }}
    defaultValue={searchParams.get('query')?.toString() || ''} />

    <Button type="submit">
        <Search />
        Search
    </Button>

    <Button 
        type="reset"
        onClick={handleClear}
        variant="outline"
    >
        Clear
    </Button>
    </form>
    )
}
