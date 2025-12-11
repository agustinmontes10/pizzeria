// 'use client'

// import { useState, useEffect } from 'react'
// import { format, addDays, parseISO, isToday, isBefore, isAfter } from 'date-fns'
// import { es } from 'date-fns/locale'
// import { Calendar as CalendarIcon, Loader2, Check, X, Plus, Trash2, Clock } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Calendar } from '@/components/ui/calendar'
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// import { cn } from '@/lib/utils'
// import { 
//   getDaySlots, 
//   generateDailySlots, 
//   reserveSlots,
//   initDaySchedule
// } from '@/lib/schedule-service'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { toast } from 'sonner'

// type TimeSlot = {
//   time: string
//   available: boolean
// }

// type DaySlots = {
//   [time: string]: boolean
// }

// export function ScheduleManager() {
//   const [date, setDate] = useState<Date>(new Date())
//   const [slots, setSlots] = useState<TimeSlot[]>([])
//   const [isLoading, setIsLoading] = useState(false)
//   const [isSaving, setIsSaving] = useState(false)
//   const [newSlotTime, setNewSlotTime] = useState('20:00')
//   const [isAddingSlot, setIsAddingSlot] = useState(false)
//   const [showPastDates, setShowPastDates] = useState(false)

//   // Format date to YYYY-MM-DD for the API
//   const formattedDate = format(date, 'yyyy-MM-dd')

//   // Fetch slots for the selected date
//   const fetchSlots = async () => {
//     if (!date) return
    
//     setIsLoading(true)
//     try {
//       // Initialize the day if it doesn't exist
//       await initDaySchedule(formattedDate)
      
//       // Get the slots for the day
//       const daySlots = await getDaySlots(formattedDate)
      
//       if (daySlots) {
//         const slotsArray = Object.entries(daySlots).map(([time, available]) => ({
//           time,
//           available: !available // Invert because in the DB true means reserved
//         }))
        
//         // Sort by time
//         slotsArray.sort((a, b) => a.time.localeCompare(b.time))
//         setSlots(slotsArray)
//       }
//     } catch (error) {
//       console.error('Error fetching slots:', error)
//       toast.error('Error al cargar los horarios')
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   // Toggle slot availability
//   const toggleSlot = async (slot: TimeSlot) => {
//     if (isSaving) return
    
//     setIsSaving(true)
//     try {
//       // In a real implementation, you would update this in the database
//       // For now, we'll just update the local state
//       setSlots(prevSlots => 
//         prevSlots.map(s => 
//           s.time === slot.time ? { ...s, available: !s.available } : s
//         )
//       )
      
//       // Here you would call an API to update the slot in the database
//       // await updateSlot(formattedDate, slot.time, !slot.available)
      
//       toast.success('Horario actualizado correctamente')
//     } catch (error) {
//       console.error('Error updating slot:', error)
//       toast.error('Error al actualizar el horario')
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   // Add a new time slot
//   const handleAddSlot = async () => {
//     if (!newSlotTime || isSaving) return
    
//     // Validate time format (HH:MM)
//     if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newSlotTime)) {
//       toast.error('Formato de hora inválido. Usa HH:MM')
//       return
//     }
    
//     // Check if slot already exists
//     if (slots.some(slot => slot.time === newSlotTime)) {
//       toast.error('Este horario ya existe')
//       return
//     }
    
//     setIsSaving(true)
//     try {
//       // In a real implementation, you would add this to the database
//       // For now, we'll just update the local state
//       const newSlot = { time: newSlotTime, available: true }
//       const updatedSlots = [...slots, newSlot]
//         .sort((a, b) => a.time.localeCompare(b.time))
      
//       setSlots(updatedSlots)
//       setNewSlotTime('20:00')
//       setIsAddingSlot(false)
      
//       toast.success('Horario agregado correctamente')
//     } catch (error) {
//       console.error('Error adding slot:', error)
//       toast.error('Error al agregar el horario')
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   // Delete a time slot
//   const deleteSlot = async (time: string) => {
//     if (isSaving) return
    
//     setIsSaving(true)
//     try {
//       // In a real implementation, you would remove this from the database
//       // For now, we'll just update the local state
//       setSlots(prevSlots => prevSlots.filter(slot => slot.time !== time))
      
//       toast.success('Horario eliminado correctamente')
//     } catch (error) {
//       console.error('Error deleting slot:', error)
//       toast.error('Error al eliminar el horario')
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   // Generate slots for the day
//   const generateSlots = async () => {
//     if (isSaving) return
    
//     if (!confirm('¿Estás seguro de que deseas generar horarios para este día? Esto sobrescribirá los horarios existentes.')) {
//       return
//     }
    
//     setIsSaving(true)
//     try {
//       // Generate default slots (20:00 - 23:00 with 5-minute intervals)
//       const generatedSlots = generateDailySlots()
//       const slotsArray = Object.entries(generatedSlots).map(([time, available]) => ({
//         time,
//         available: !available // Invert because in the DB true means reserved
//       }))
      
//       // Sort by time
//       slotsArray.sort((a, b) => a.time.localeCompare(b.time))
//       setSlots(slotsArray)
      
//       // Here you would call an API to update the slots in the database
//       // await updateDaySlots(formattedDate, generatedSlots)
      
//       toast.success('Horarios generados correctamente')
//     } catch (error) {
//       console.error('Error generating slots:', error)
//       toast.error('Error al generar los horarios')
//     } finally {
//       setIsSaving(false)
//     }
//   }

//   // Load slots when date changes
//   useEffect(() => {
//     fetchSlots()
//   }, [date])

//   // Check if the selected date is in the past
//   const isPastDate = isBefore(date, new Date()) && !isToday(date)

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//         <div>
//           <h2 className="text-2xl font-bold">Gestión de Horarios</h2>
//           <p className="text-muted-foreground">
//             Gestiona los horarios disponibles para cada día
//           </p>
//         </div>
        
//         <div className="flex items-center gap-2">
//           <Button 
//             variant="outline" 
//             onClick={() => setShowPastDates(!showPastDates)}
//             className="text-sm"
//           >
//             {showPastDates ? 'Ocultar fechas pasadas' : 'Mostrar fechas pasadas'}
//           </Button>
          
//           <Popover>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="outline"
//                 className={cn(
//                   'w-[240px] justify-start text-left font-normal',
//                   !date && 'text-muted-foreground'
//                 )}
//               >
//                 <CalendarIcon className="mr-2 h-4 w-4" />
//                 {date ? format(date, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-auto p-0" align="start">
//               <Calendar
//                 mode="single"
//                 selected={date}
//                 onSelect={(newDate) => newDate && setDate(newDate)}
//                 initialFocus
//                 disabled={(date) => {
//                   // Disable past dates if showPastDates is false
//                   if (!showPastDates) {
//                     return isBefore(date, new Date()) && !isToday(date)
//                   }
//                   return false
//                 }}
//                 locale={es}
//               />
//             </PopoverContent>
//           </Popover>
//         </div>
//       </div>

//       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
//           <div>
//             <h3 className="text-lg font-medium">
//               Horarios para {format(date, 'EEEE d \'de\' MMMM', { locale: es })}
//             </h3>
//             <p className="text-sm text-muted-foreground">
//               {isPastDate ? 'Vista de horarios pasados' : 'Haz clic en un horario para habilitar/deshabilitar'}
//             </p>
//           </div>
          
//           <div className="flex gap-2 w-full sm:w-auto">
//             <Button 
//               variant="outline" 
//               onClick={generateSlots}
//               disabled={isSaving || isPastDate}
//               className="w-full sm:w-auto"
//             >
//               {isSaving ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : (
//                 <Clock className="mr-2 h-4 w-4" />
//               )}
//               Generar horarios
//             </Button>
            
//             <Button 
//               onClick={() => setIsAddingSlot(true)}
//               disabled={isAddingSlot || isPastDate}
//               className="w-full sm:w-auto"
//             >
//               <Plus className="mr-2 h-4 w-4" />
//               Agregar horario
//             </Button>
//           </div>
//         </div>

//         {isLoading ? (
//           <div className="flex justify-center py-8">
//             <Loader2 className="h-8 w-8 animate-spin text-primary" />
//           </div>
//         ) : (
//           <>
//             {isAddingSlot && (
//               <div className="mb-6 p-4 border rounded-lg bg-muted/20">
//                 <h4 className="font-medium mb-3">Agregar nuevo horario</h4>
//                 <div className="flex flex-col sm:flex-row gap-3">
//                   <div className="flex-1">
//                     <Label htmlFor="newSlotTime" className="sr-only">Hora</Label>
//                     <Input
//                       id="newSlotTime"
//                       type="time"
//                       value={newSlotTime}
//                       onChange={(e) => setNewSlotTime(e.target.value)}
//                       className="w-full"
//                       step="300" // 5 minutes
//                     />
//                   </div>
//                   <div className="flex gap-2">
//                     <Button 
//                       onClick={handleAddSlot}
//                       disabled={isSaving}
//                       className="flex-1 sm:flex-none"
//                     >
//                       {isSaving ? (
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                       ) : (
//                         <Check className="mr-2 h-4 w-4" />
//                       )}
//                       Guardar
//                     </Button>
//                     <Button 
//                       variant="outline" 
//                       onClick={() => setIsAddingSlot(false)}
//                       disabled={isSaving}
//                     >
//                       <X className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {slots.length === 0 ? (
//               <div className="text-center py-8 text-muted-foreground">
//                 <p>No hay horarios configurados para este día.</p>
//                 <p className="mt-2">
//                   <Button 
//                     variant="link" 
//                     className="p-0 h-auto" 
//                     onClick={generateSlots}
//                     disabled={isSaving || isPastDate}
//                   >
//                     Haz clic aquí para generar horarios automáticamente
//                   </Button>
//                 </p>
//               </div>
//             ) : (
//               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
//                 {slots.map((slot) => (
//                   <div 
//                     key={slot.time}
//                     className={cn(
//                       'relative p-4 border rounded-lg text-center cursor-pointer transition-colors',
//                       slot.available 
//                         ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-800/50' 
//                         : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-800/30',
//                       isPastDate && 'opacity-70 cursor-not-allowed',
//                       isSaving && 'opacity-70 cursor-wait'
//                     )}
//                     onClick={() => !isPastDate && toggleSlot(slot)}
//                   >
//                     {!isPastDate && (
//                       <button 
//                         className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
//                         onClick={(e) => {
//                           e.stopPropagation()
//                           if (confirm('¿Estás seguro de que deseas eliminar este horario?')) {
//                             deleteSlot(slot.time)
//                           }
//                         }}
//                         disabled={isSaving}
//                       >
//                         <Trash2 className="h-3 w-3" />
//                       </button>
//                     )}
//                     <div className="text-lg font-medium">
//                       {slot.time}
//                     </div>
//                     <div className="text-xs mt-1">
//                       {slot.available ? (
//                         <span className="text-green-600 dark:text-green-400">Disponible</span>
//                       ) : (
//                         <span className="text-red-600 dark:text-red-400">Ocupado</span>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   )
// }
