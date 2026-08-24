"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Calendar as CalendarIcon, Plus, Trash2, Edit2, ChevronLeft, ChevronRight,
  Clock, FileText, Folder, CalendarPlus, X, Apple, MapPin, Droplets
} from "lucide-react";
import { 
  getBookings, createBooking, updateBooking, deleteBooking, getCalendarEvents,
  getSriLankaHolidays, BookingData, CalendarEvent 
} from "../actions/bookings";

const statusStyles: Record<string, string> = {
  "confirmed": "bg-green-500/20 text-green-400 border-green-500/30",
  "pending": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "cancelled": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "completed": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "todo": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "in_progress": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

const formatLKR = (amount: number) => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [sriLankaHolidays, setSriLankaHolidays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [includeHolidays, setIncludeHolidays] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCalendarUrl(`${window.location.origin}/api/calendar/feed`);
    }
  }, []);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBookingDate, setFormBookingDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formStatus, setFormStatus] = useState<'confirmed' | 'pending' | 'cancelled' | 'completed' | 'todo' | 'in_progress'>("confirmed");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formLocation, setFormLocation] = useState("");
  const [formEventType, setFormEventType] = useState<'booking' | 'task_reminder'>("booking");

  // Location suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!formLocation.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/location/suggest?q=${encodeURIComponent(formLocation)}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Error fetching location suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [formLocation, showSuggestions]);

  // Calendar month/year navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [bookingForecasts, setBookingForecasts] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, eList, hList, weatherRes] = await Promise.all([
        getBookings(),
        getCalendarEvents(),
        getSriLankaHolidays().catch(() => ({})),
        fetch("/api/admin/weather").then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      setBookings(bList);
      setCalendarEvents(eList);
      setSriLankaHolidays(hList);
      if (weatherRes && weatherRes.bookingForecasts) {
        setBookingForecasts(weatherRes.bookingForecasts);
      }
    } catch (e) {
      console.error("Failed to load bookings data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [bList, eList, hList, weatherRes] = await Promise.all([
          getBookings(),
          getCalendarEvents(),
          getSriLankaHolidays().catch(() => ({})),
          fetch("/api/admin/weather").then(r => r.ok ? r.json() : null).catch(() => null)
        ]);
        if (!cancelled) {
          setBookings(bList);
          setCalendarEvents(eList);
          setSriLankaHolidays(hList);
          if (weatherRes && weatherRes.bookingForecasts) {
            setBookingForecasts(weatherRes.bookingForecasts);
          }
        }
      } catch (e) {
        console.error("Failed to load bookings data:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const openNewModal = (dateStr?: string) => {
    setEditingBooking(null);
    setFormTitle("");
    setFormDescription("");
    setFormBookingDate(dateStr || new Date().toISOString().split('T')[0]);
    setFormStartTime("");
    setFormEndTime("");
    setFormStatus("confirmed");
    setFormPrice(0);
    setFormLocation("");
    setFormEventType("booking");
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenSubscribe = () => setIsSubscribeModalOpen(true);
    const handleOpenNewEvent = () => openNewModal();

    window.addEventListener("bookings:open-subscribe", handleOpenSubscribe);
    window.addEventListener("bookings:open-new-event", handleOpenNewEvent);

    return () => {
      window.removeEventListener("bookings:open-subscribe", handleOpenSubscribe);
      window.removeEventListener("bookings:open-new-event", handleOpenNewEvent);
    };
  }, []);

  const openEditModal = (booking: BookingData) => {
    setEditingBooking(booking);
    setFormTitle(booking.title);
    setFormDescription(booking.description || "");
    setFormBookingDate(booking.booking_date);
    setFormStartTime(booking.start_time || "");
    setFormEndTime(booking.end_time || "");
    setFormStatus(booking.status);
    setFormPrice(booking.price);
    setFormLocation(booking.location || "");
    setFormEventType(booking.event_type || "booking");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isTask = formEventType === 'task_reminder';
    if (!formTitle || !formBookingDate) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload: BookingData = {
      client_id: null,
      title: formTitle,
      description: formDescription,
      customer_name: formTitle || 'Event',
      customer_email: null,
      customer_phone: null,
      booking_date: formBookingDate,
      start_time: formStartTime || null,
      end_time: formEndTime || null,
      status: formStatus,
      price: isTask ? 0 : Number(formPrice),
      location: isTask ? null : (formLocation || null),
      event_type: formEventType,
    };

    try {
      if (editingBooking && editingBooking.id) {
        await updateBooking(editingBooking.id, payload);
      } else {
        await createBooking(payload);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save booking:", err);
      alert("Error saving booking.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this booking?")) {
      try {
        await deleteBooking(id);
        await loadData();
      } catch (err) {
        console.error("Failed to delete booking:", err);
        alert("Failed to delete booking.");
      }
    }
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toISOString().split('T')[0];

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        {/* Calendar Side */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-white/10 rounded-full w-40" />
            <div className="h-8 bg-white/5 rounded-2xl w-32" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-4 bg-white/5 rounded-full w-12 mx-auto" />
            ))}
            {[...Array(35)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl h-20" />
            ))}
          </div>
        </div>
        
        {/* Upcoming Events Side */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="h-6 bg-white/10 rounded-full w-44" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 bg-white/10 rounded-full w-32" />
                  <div className="h-5 bg-white/5 rounded-full w-16" />
                </div>
                <div className="h-4 bg-white/5 rounded-full w-48" />
                <div className="h-4 bg-white/5 rounded-full w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Week starts Monday: Monday=0 ... Sunday=6
  // JS getDay(): Sunday=0, Monday=1, ... Saturday=6
  // Offset: (getDay() + 6) % 7  →  Mon=0, Tue=1 ... Sun=6
  const firstDayJS = new Date(year, month, 1).getDay();
  const firstDayOfMonth = (firstDayJS + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push(i);

  return (
    <div className="space-y-6">

      {/* Grid container for side-by-side calendar and bookings list */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Calendar Section - Column Span 8 */}
        <div className="xl:col-span-8 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 xl:min-h-[730px] flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-4 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                Event Calendar
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-full p-1">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-semibold text-white min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs bg-white/[0.02] border border-white/10 rounded-2xl p-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <span className="text-gray-300">Bookings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-300">Agreements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-300">Reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-gray-300">Expirations (Domain & Hosting)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-700" />
              <span className="text-gray-300">Public Holiday (LK)</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto flex-1 min-h-0 flex flex-col scrollbar-thin">
            <div className="min-w-[700px] flex-1 flex flex-col">
              {/* Week starts Monday */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 border-b border-white/10 pb-2 mb-2 flex-shrink-0">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-rose-400">Sat</div>
                <div className="text-rose-400">Sun</div>
              </div>

              <div className="grid grid-cols-7 auto-rows-fr gap-2 flex-1 min-h-0">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-neutral-950/20 border border-white/[0.03] rounded-2xl h-full min-h-[80px] opacity-30" />;
                  }

                  // Format cell date string: YYYY-MM-DD
                  const cellMonthStr = String(month + 1).padStart(2, '0');
                  const cellDayStr = String(day).padStart(2, '0');
                  const cellDateStr = `${year}-${cellMonthStr}-${cellDayStr}`;

                  // Day-of-week for this cell (Mon-first: Mon=0 … Sun=6)
                  const cellDOW = (new Date(year, month, day).getDay() + 6) % 7;
                  const isWeekend = cellDOW >= 5; // Sat=5, Sun=6
                  const isToday = cellDateStr === todayStr;
                  const holidayName = sriLankaHolidays[cellDateStr];

                  // Filter events for this day
                  const dayEvents = calendarEvents.filter(e => e.date === cellDateStr);

                  return (
                    <div 
                      key={`day-${day}`} 
                      onClick={() => {
                        setSelectedDate(cellDateStr);
                        setIsSummaryModalOpen(true);
                      }}
                      className={`border rounded-2xl p-2 h-full min-h-[80px] flex flex-col justify-between cursor-pointer transition-all group relative
                        ${ isToday
                          ? 'bg-brand-600/20 border-brand-500 ring-1 ring-brand-500/50'
                          : isWeekend
                            ? 'bg-rose-900/10 border-rose-500/20 hover:border-rose-500/40'
                            : 'bg-white/[0.02] border-white/10 hover:border-brand-500/50'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col items-start">
                          <span className={`text-xs font-bold ${
                            isToday ? 'text-brand-300' : isWeekend ? 'text-rose-400' : 'text-gray-300 group-hover:text-white'
                          }`}>{day}</span>
                          {holidayName && (
                            <span className="text-[8px] leading-tight text-red-400 font-semibold whitespace-normal break-words" title={holidayName}>
                              🇱🇰 {holidayName}
                            </span>
                          )}
                        </div>
                        <Plus className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-none pr-1">
                        {dayEvents.map(e => (
                          <div 
                            key={e.id}
                            title={`${e.title}\n${e.details || ""}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (e.type === 'booking') {
                                const bookingId = e.id.replace('booking-', '');
                                const originalObj = bookings.find(b => b.id?.toString() === bookingId);
                                if (originalObj) openEditModal(originalObj);
                              }
                            }}
                            className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight whitespace-normal break-words font-medium ${e.color}`}
                          >
                            {e.time ? `${e.time} ` : ""}{e.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Table / List Column - Column Span 4 */}
        <div className="xl:col-span-4 bg-black backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col xl:min-h-[730px]">
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Events</h2>
          {bookings.filter(b => b.booking_date >= todayStr).length === 0 ? (
            <div className="text-center py-10 text-gray-400">No upcoming events scheduled.</div>
          ) : (
            <div data-lenis-prevent className="flex-1 min-h-0 xl:max-h-[620px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {bookings
                .filter(b => b.booking_date >= todayStr)
                .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || (a.start_time || "").localeCompare(b.start_time || ""))
                .map(b => (
                  <div key={b.id} className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between gap-3 group">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-base leading-snug truncate">{b.title}</h3>
                      {b.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{b.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles[b.status] || ""}`}>
                        {b.status}
                      </span>
                      {(() => {
                        const forecast = bookingForecasts.find(bf => bf.title === b.title && bf.rawDate === b.booking_date);
                        if (forecast && forecast.weather) {
                          return (
                            <div className="flex flex-col items-end shrink-0 pl-2">
                              <div className="flex items-center gap-1 mt-0.5" title={forecast.weather.condition}>
                                <img src={forecast.weather.iconUrl} alt={forecast.weather.condition} className="w-6 h-6 object-contain" />
                                <span className="text-[10px] text-gray-400">{forecast.weather.tempMax}</span>
                              </div>
                              <div className="flex items-center gap-1 justify-end text-blue-400 mt-0.5">
                                <Droplets className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{forecast.weather.precipitation}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5 text-xs text-gray-300">
                    {b.event_type !== 'task_reminder' && b.location && (
                      <div className="flex items-start gap-1.5 text-brand-300 mt-1">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-400" />
                        <span className="font-medium text-left leading-normal break-words flex-1">{b.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Date:</span>
                      <span className="font-medium text-white">{b.booking_date}</span>
                    </div>
                    {b.start_time && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Time:</span>
                        <span className="font-medium text-white">
                          {b.start_time}{b.end_time ? ` - ${b.end_time}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-2 border-t border-white/5 pt-2 mt-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => b.id && handleDelete(b.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 hover:bg-rose-500/10 rounded-xl text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal - New / Edit Booking */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden backdrop-blur-xl flex flex-col h-[850px] max-h-[95vh]">
            <div className="border-b border-white/10 p-6 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-white">
                {editingBooking ? "Edit Event Details" : "Create New Event"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-sm">
                Cancel
              </button>
            </div>

            <form data-lenis-prevent onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Event Type Selector */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Event Type</label>
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setFormEventType("booking")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      formEventType === "booking"
                        ? "bg-white text-black shadow-lg"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEventType("task_reminder")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      formEventType === "task_reminder"
                        ? "bg-white text-black shadow-lg"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Reminder
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Event Name"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Description</label>
                <textarea
                  placeholder="Additional details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors h-20 resize-none"
                />
              </div>

              {formEventType === 'booking' && (
                <>
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="text-xs text-gray-400 font-semibold uppercase">Event Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Location Name / Address"
                        value={formLocation}
                        onChange={(e) => {
                          setFormLocation(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                      />
                      {loadingSuggestions && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-[#161618] p-1 shadow-2xl backdrop-blur-xl">
                        {suggestions.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setFormLocation(item.name || item.display_name);
                              setShowSuggestions(false);
                            }}
                            className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors focus:outline-none focus:bg-white/5 flex flex-col gap-0.5"
                          >
                            <span className="font-semibold text-white">{item.name || "Location"}</span>
                            {item.display_name && item.display_name !== item.name && (
                              <span className="text-xs text-gray-400 truncate w-full">{item.display_name}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}



              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Booking Date *</label>
                <input
                  type="date"
                  required
                  value={formBookingDate}
                  onChange={(e) => setFormBookingDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase">End Time</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold uppercase">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-colors appearance-none cursor-pointer"
                >
                  {formEventType === 'task_reminder' ? (
                    <>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>

              {editingBooking ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingBooking.id) {
                        handleDelete(editingBooking.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="flex-1 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400 font-semibold py-3.5 rounded-full active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    Delete Booking
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                  >
                    Update Booking
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-full active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                >
                  Create Booking
                </button>
              )}</form>
          </div>
        </div>
      )}

      {/* Day Summary Modal */}
      {isSummaryModalOpen && selectedDate && (() => {
        const dayEvents = calendarEvents.filter(e => e.date === selectedDate);
        const holidayName = sriLankaHolidays[selectedDate];
        // Parse date for clean heading
        const parsedDate = new Date(selectedDate);
        const dateHeading = parsedDate.toLocaleDateString("en-LK", {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-black border border-white/10 rounded-3xl w-full max-w-md overflow-hidden backdrop-blur-xl flex flex-col">
              <div className="border-b border-white/10 p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Day Summary</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{dateHeading}</p>
                </div>
                <button 
                  onClick={() => setIsSummaryModalOpen(false)} 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>

              <div data-lenis-prevent className="p-6 overflow-y-auto space-y-4 max-h-[50vh]">
                {/* Sri Lanka Holiday banner */}
                {holidayName && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-3 text-sm text-rose-400 flex items-center gap-2">
                    <span className="text-lg">🇱🇰</span>
                    <div>
                      <p className="font-semibold">Public Holiday</p>
                      <p className="text-xs text-rose-300/80">{holidayName}</p>
                    </div>
                  </div>
                )}

                {/* Event list */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Scheduled Events ({dayEvents.length})</p>
                  
                  {dayEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No business events or bookings for this day.</p>
                  ) : (
                    dayEvents.map(e => (
                      <div 
                        key={e.id}
                        onClick={() => {
                          if (e.type === 'booking') {
                            const bookingId = e.id.replace('booking-', '');
                            const originalObj = bookings.find(b => b.id?.toString() === bookingId);
                            if (originalObj) {
                              setIsSummaryModalOpen(false);
                              openEditModal(originalObj);
                            }
                          }
                        }}
                        className={`flex items-start gap-3 p-3 rounded-2xl border bg-neutral-950 border-white/5 hover:border-white/10 transition-colors ${
                          e.type === 'booking' ? 'cursor-pointer' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          e.type === 'booking' ? 'bg-brand-500' :
                          e.type === 'project' ? 'bg-blue-500' :
                          e.type === 'agreement' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{e.title}</p>
                          {(e.time || e.end_time) && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{e.time || 'N/A'}{e.end_time ? ` - ${e.end_time}` : ''}</span>
                            </p>
                          )}
                          {e.location && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <span className="text-gray-500">Location:</span>
                              <span className="text-brand-300 font-medium">{e.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-neutral-950/20 flex gap-3">
                <button
                  onClick={() => {
                    setIsSummaryModalOpen(false);
                    openNewModal(selectedDate);
                  }}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-full text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Booking
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Sync / Subscribe Calendar Modal */}
      {/* Sync / Subscribe Calendar Modal */}
      {isSubscribeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden backdrop-blur-xl flex flex-col max-h-[90vh]">
            <div className="border-b border-white/10 p-6 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-brand-500" />
                Add to Your Calendar
              </h3>
              <button 
                onClick={() => setIsSubscribeModalOpen(false)} 
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">    
              {/* Public Holiday Toggle Switch Option */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">Include Public Holidays</p>
                  <p className="text-xs text-gray-400">Sync Sri Lankan national holidays</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeHolidays(!includeHolidays)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeHolidays ? "bg-brand-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      includeHolidays ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Feed Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={`${calendarUrl ? calendarUrl.replace(/^https?:/, "webcal:") : ""}?noHolidays=${!includeHolidays}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-colors text-center cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="40" height="40" rx="8" fill="white" />
                    <path d="M4 4H44V16H4V4Z" fill="#FF2D55" />
                    <text x="24" y="38" fill="black" fontSize="22" fontWeight="bold" textAnchor="middle">17</text>
                  </svg>
                  Apple Calendar
                </a>

                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`${calendarUrl ? calendarUrl.replace(/^https?:/, "webcal:") : ""}?noHolidays=${!includeHolidays}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-colors text-center cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="40" height="40" rx="8" fill="#4285F4" />
                    <path d="M4 4L16 16H4V4Z" fill="#FFF" opacity="0.3" />
                    <text x="24" y="34" fill="white" fontSize="22" fontWeight="bold" textAnchor="middle">31</text>
                  </svg>
                  Google Calendar
                </a>
              </div>

              {/* Copy URL */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Feed URL (Manual copy)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={`${calendarUrl}?noHolidays=${!includeHolidays}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none select-all" 
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${calendarUrl}?noHolidays=${!includeHolidays}`);
                      alert("Calendar Feed URL copied to clipboard!");
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
