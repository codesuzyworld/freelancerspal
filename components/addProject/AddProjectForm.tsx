"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";

const formSchema = z.object({
    projectName: z.string().min(1, {message: "Oops!Project Name is required"}),
    projectDescription: z.string().min(1, {message: "Hey!Project Description is required"}),
});

export default function AddProjectForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            projectName: "",
            projectDescription: "",
        },
    });

    const handleSubmit = () => {}

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField 
                    control={form.control} 
                    name="projectName"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <input {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
} 