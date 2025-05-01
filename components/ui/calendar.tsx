"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function CustomCaption({ displayMonth, onMonthChange }: CaptionProps) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const years = Array.from({ length: 10 }, (_, i) => displayMonth.getFullYear() - 5 + i)

  return (
    <div className="flex justify-center gap-2 items-center">
      <Select
        value={months[displayMonth.getMonth()]}
        onValueChange={(value) => {
          const newMonth = months.indexOf(value)
          const newDate = new Date(displayMonth.setMonth(newMonth))
          onMonthChange(newDate)
        }}
      >
        <SelectTrigger className="h-8 w-[120px] bg-black/20 border-white/10 text-sm">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month} className="text-sm">
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={displayMonth.getFullYear().toString()}
        onValueChange={(value) => {
          const newDate = new Date(displayMonth.setFullYear(parseInt(value)))
          onMonthChange(newDate)
        }}
      >
        <SelectTrigger className="h-8 w-[90px] bg-black/20 border-white/10 text-sm">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()} className="text-sm">
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-black/20 rounded-lg border border-white/10", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-center relative items-center",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
          "hover:bg-white/10 rounded-lg"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-zinc-400 w-9 font-normal text-[0.8rem] py-2",
        row: "flex w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          "h-8 w-8 p-0 font-normal",
          "hover:bg-white/10 rounded-md transition-colors",
          "aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: 
          "bg-yellow-500 text-black hover:bg-yellow-400 hover:text-black focus:bg-yellow-500 focus:text-black rounded-md",
        day_today: "bg-white/10 text-white rounded-md",
        day_outside: "text-zinc-400 opacity-50 aria-selected:bg-zinc-800/50",
        day_disabled: "text-zinc-400 opacity-50",
        day_range_middle:
          "aria-selected:bg-zinc-800 aria-selected:text-white rounded-md",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Caption: CustomCaption
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
