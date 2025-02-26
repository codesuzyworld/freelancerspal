"use client";

import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/standaloneCalendar";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { DataTable } from '@/app/(main)/project/[id]/linkTable/data-table';
import { taskDayTableColumns } from '@/app/(main)/dashboard/taskDayTable/columns';

interface Task {
  taskID: string
  taskName: string
  taskDate: Date
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
      const { data } = await supabase
        .from("tasks")
        .select()
        .order('taskDate', { ascending: false });

      if (data) {
        setTasks(data);
        //Filter tasks for today's date so it shows immediately when page loads
        filterTasksForDate(new Date());
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
    // Convert selected date to UTC
    const utcDate = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ));

    // Convert the calendar date to UTC format because of Supabase using UTC -> format: 2025-01-02T15:00:00.000Z
    // toISOString, then split('T')[0] to get the date in the format of YYYY-MM-DD (2025-01-02) 
    const filteredTasks = tasks.filter(task => {
      const taskDate = new Date(task.taskDate);
      return taskDate.toISOString().split('T')[0] === utcDate.toISOString().split('T')[0];
    });
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
    const date = new Date(currentTask.taskDate).toISOString().split('T')[0];
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
            return tasksByDate[date.toDateString()] !== undefined;
          }
        }}
        components={{
          //This is a custom component for the calendar so that we can show task count
          //https://daypicker.dev/guides/custom-components
          // This component takes in the date from current day
          // Then it takes the tasksByDate object by date to get a tasks array
          // From there we can do tasks.length to get task count 
          DayContent: ({ date }) => {
            // Convert the calendar date to UTC format because of Supabase using UTC
            const utcDate = new Date(Date.UTC(
              date.getFullYear(),
              date.getMonth(),
              date.getDate()
            )).toISOString().split('T')[0];
            
            const tasks = tasksByDate[utcDate];
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
            <DataTable columns={taskDayTableColumns} data={selectedDateTasks} />
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