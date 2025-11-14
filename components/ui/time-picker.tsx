import * as React from "react"
import { format } from "date-fns"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
  interval?: number
}

export function TimePicker({
  value,
  onChange,
  className,
  disabled = false,
  placeholder = "Selecciona una hora",
  interval = 30, // minutes interval
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse the time string (HH:MM) into hours and minutes
  const [hours, minutes] = React.useMemo(() => {
    if (!value) return ["00", "00"]
    const [h = "00", m = "00"] = value.split(":")
    return [h, m]
  }, [value])

  // Generate time options based on interval
  const timeOptions = React.useMemo(() => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += interval) {
        const hour = h.toString().padStart(2, '0')
        const minute = m.toString().padStart(2, '0')
        options.push({
          value: `${hour}:${minute}`,
          label: `${hour}:${minute}`
        })
      }
    }
    return options
  }, [interval])

  const handleHourChange = (h: string) => {
    onChange(`${h}:${minutes}`)
  }

  const handleMinuteChange = (m: string) => {
    onChange(`${hours}:${m}`)
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Select
        value={hours}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select
        value={minutes}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px] overflow-y-auto">
          {Array.from({ length: 60 / interval }, (_, i) => (i * interval).toString().padStart(2, '0')).map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function TimePickerDemo() {
  const [time, setTime] = React.useState("")
  
  return (
    <div className="flex items-center space-x-2">
      <TimePicker value={time} onChange={setTime} />
      <div className="text-sm text-muted-foreground">
        {time || "No time selected"}
      </div>
    </div>
  )
}
