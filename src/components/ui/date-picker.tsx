import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date | null
    setDate: (date: Date | undefined) => void
    label?: string
    className?: string
    fromYear?: number
    toYear?: number
    disabled?: boolean
}

export function DatePicker({
    date,
    setDate,
    label = "Pick a date",
    className,
    fromYear = 1960,
    toYear = new Date().getFullYear() + 10,
    disabled = false
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{label}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                    mode="single"
                    selected={date || undefined}
                    onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                    }}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={fromYear}
                    toYear={toYear}
                />
            </PopoverContent>
        </Popover>
    )
}
