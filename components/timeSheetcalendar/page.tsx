"use client";

import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/standaloneCalendar";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { DataTable } from '@/app/(main)/project/[id]/linkTable/data-table';
import { taskDayTableColumns, type TaskDayTable as TaskDayTableRow } from '@/app/(main)/dashboard/taskDayTable/columns';
import { redirect } from 'next/navigation';
import { formatLocalDate } from "@/lib/date";

interface Task {
  taskID: string
  taskName: string
  taskDate: string   // YYYY-MM-DD (column type: date), or YYYY-MM-DDTHH:MM:SS for legacy rows
  hourSpent: number
  taskDesc: string
  projectID: string
}

export default function TimeSheetCalendar() {

  // State code from shadCN to allow users to select date
  const [date, setDate] = useState<Date | undefined>(new Date())

  // State to store tasks for calendar display
  const [tasks, setTasks] = useState<Task[]>([])
  // State to store tasks for the user selected date
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([])

  // Fetch tasks from supabase
  useEffect(() => {
    const fetchTasks = async () => {
      const supabase = createClient();
      
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

      // If user is admin (adminCheck exists and has admin role), fetch all tasks
      if (adminCheck?.role === 'admin') {
        const { data } = await supabase
          .from("tasks")
          .select()
          .order('taskDate', { ascending: false });
          
        if (data) {
          setTasks(data);
          filterTasksForDate(new Date());
        }
      } else {
        const { data } = await supabase
          .from("tasks")
          .select()
          .eq("userID", user.id)
          .order('taskDate', { ascending: false });
          
        if (data) {
          setTasks(data);
          filterTasksForDate(new Date());
        }
      }
    };

    fetchTasks();
  }, []);

  // Function to filter tasks for a specific date
  // This exports an array of tasks in the format of 
  // The output example:
  // const filteredTasks = [
  //   { taskName: "Task 1", taskDate: "2025-02-25" },
  //   { taskName: "Task 2", taskDate: "2025-02-25" }
  // ];
  const filterTasksForDate = (selectedDate: Date) => {
    // Compare YYYY-MM-DD strings directly. taskDate is stored as a
    // local-calendar date string; the leading 10 chars cover both
    // pure-date and legacy timestamp formats.
    const selectedYmd = formatLocalDate(selectedDate);
    const filteredTasks = tasks.filter(task => task.taskDate.slice(0, 10) === selectedYmd);
    setSelectedDateTasks(filteredTasks);
  };

  //This groups tasks by date using .reduce
  // The output example:
    // "Mon Feb 25 2025": ["Task 1", "Task 2"],
    // "Tue Feb 26 2025": ["Task 3"],
  //First time learning what an accumulator is, it starts with an empty object
  //Then it iterates over the tasks array, matches the currenttask date to the accumulator task date
  //If date doesnt match, then make a new array and push task name to it 
  //If date matches, then push task name to accumulator
  const tasksByDate = tasks.reduce((accumulator, currentTask) => {
    const date = currentTask.taskDate.slice(0, 10);
    if (!accumulator[date]) {
      accumulator[date] = [];
    }
    accumulator[date].push(currentTask.taskName);
    return accumulator;
  }, {} as Record<string, string[]>);
  // ^^ accumulator will be empty initially, and its type is string, string array, type script stuff 

  return (
    <Card className="p-4">
      <Calendar     
        mode="single"
        selected={date}
        onSelect={(newDate) => {
          setDate(newDate);
          if (newDate) {
            filterTasksForDate(newDate);
          }
        }}
        className="rounded-md border w-full h-auto"
        showOutsideDays={true}
        fixedWeeks={true}
        ISOWeek={true}
        modifiers={{
          //Custom Modifiers for React Daypicker: https://daypicker.dev/guides/custom-modifiers 
          // Check if there are any tasks for the day
          hasTask: (date) => {
            return tasksByDate[formatLocalDate(date)] !== undefined;
          }
        }}
        components={{
          //This is a custom component for the calendar so that we can show task count
          //https://daypicker.dev/guides/custom-components
          // This component takes in the date from current day
          // Then it takes the tasksByDate object by date to get a tasks array
          // From there we can do tasks.length to get task count 
          DayContent: ({ date }) => {
            const ymd = formatLocalDate(date);
            const tasks = tasksByDate[ymd];
            return (
              <div className="flex flex-col items-center">
                <div>{date.getDate()}</div>
                {tasks && (
                  <div className="text-[0.6rem] text-primary font-medium">
                    {tasks.length} tasks
                  </div>
                )}
              </div>
            );
          }
        }}
        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
      />

      {/* Show tasks for selected date
          Just shadCN table stuff */}
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">
          Tasks for {date?.toLocaleDateString()}
        </h3>
        {selectedDateTasks.length > 0 ? (
          <div className="p-2">
            {/*
              Cast: TaskDayTable type declares taskDate: Date but the runtime
              value from Supabase is a string. Plan 007 corrects the local
              Task type; the dashboard columns module is out of scope.
            */}
            <DataTable columns={taskDayTableColumns} data={selectedDateTasks as unknown as TaskDayTableRow[]} />
          </div>
        ) : (
          <div>
            <div>No Tasks found for this date!</div>
          </div>
        )}
      </div>
    </Card>
  );
}