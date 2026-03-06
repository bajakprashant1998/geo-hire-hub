import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MonthYearPickerProps {
    value: string; // Format: YYYY-MM
    onChange: (value: string) => void;
    disabled?: boolean;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function MonthYearPicker({ value, onChange, disabled }: MonthYearPickerProps) {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i); // Last 50 years

    const [year, month] = value ? value.split("-") : ["", ""];

    const handleMonthChange = (newMonth: string) => {
        const formattedMonth = (MONTHS.indexOf(newMonth) + 1).toString().padStart(2, '0');
        if (year) {
            onChange(`${year}-${formattedMonth}`);
        } else {
            onChange(`${currentYear}-${formattedMonth}`);
        }
    };

    const handleYearChange = (newYear: string) => {
        if (month) {
            onChange(`${newYear}-${month}`);
        } else {
            onChange(`${newYear}-01`);
        }
    };

    const currentMonthName = month ? MONTHS[parseInt(month, 10) - 1] : "";

    return (
        <div className="flex gap-2 w-full">
            <Select value={currentMonthName} onValueChange={handleMonthChange} disabled={disabled}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {MONTHS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={year} onValueChange={handleYearChange} disabled={disabled}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
