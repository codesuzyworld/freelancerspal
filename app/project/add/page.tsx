'use client';

//I learned how to do Shadcn Forms with NextJs through this video: 
// https://www.youtube.com/watch?v=oGq9o2BxlaI

// Zod and React Hook Form Imports
//ShadCn Stuff lol
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

//Creating a Zod form Schema for adding project
//This is for form validation, and will display the error message easily :D 
const formSchema = z.object({
    projectName: z.string().min(1, {message: "Oops!Project Name is required"}),
    projectDate: z.date({required_error: "Choose a Project Date",}),
    //Apparently here, I gotta use coerce method to turn string to number, as input only outputs string
    ratePerHour: z.coerce.number().min(1, {message: "Gotta get paid, right?"}),
    projectTags: z.string().min(1, {message: "Input at least one tag please!"}),
    projectDescription: z.string().min(1, {message: "Describe your project please!"}),
});

export default function AddProject() {


    //Shadcn Form Schema

    //This will map the formSchema object to the form 
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectName: "",
            projectDate: new Date(),
            ratePerHour: undefined,
            projectTags: "",
            projectDescription: "",          
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
      
    }

    return (
        <div>
            <h1>Create New Project</h1>
            <br></br>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-md w-full flex flex-col gap-6">

                {/* Project Name */}
                <FormField control={form.control} name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Project"  type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date picker */}
                <FormField
                  control={form.control}
                  name="projectDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Project Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate Per Hour */} 
                <FormField control={form.control} name="ratePerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Per Hour</FormLabel>
                      <FormControl>
                        <Input placeholder="30" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />               

                {/* Project Tags */}
                <FormField control={form.control} name="projectTags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="Web Development, Mobile Development, etc."  type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>Input Tags seperated by commas</FormDescription>
                    </FormItem>
                  )}
                />   

                {/* Project Description */}
                <FormField
                control={form.control}
                name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your project"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                </FormItem>
                )}
              />                

              <Button type="submit" className="w-full">Create Project</Button>
              </form>
            </Form>
        </div>
    );
}

