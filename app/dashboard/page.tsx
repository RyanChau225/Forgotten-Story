"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Book, Calendar as CalendarIconUI, Hash, Smile, TrendingUp, Sparkles, Palette } from "lucide-react" // Updated Calendar import, Added Palette
import CenteredLayout from "@/components/CenteredLayout"
import { Entry, getEntries } from "@/lib/api" // Assuming getEntries can be adapted for monthly fetching
import { format, startOfMonth, endOfMonth, eachDayOfInterval, set } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar" // Shadcn Calendar
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button" // Assuming Button component is used
import { Loader2 } from "lucide-react" // Added Loader2 for loading spinner
import { cn } from "@/lib/utils" // Assuming cn function is imported
import { moodLabels } from "@/lib/moods"; // Import shared moodLabels
import Link from "next/link"; // Ensure Link is imported

const gradientOptions = [
  { name: "Classic Contrast", low: "#36454F", high: "#F5F5F5" },
  { name: "Cool & Calm", low: "#2E3A48", high: "#87CEEB" }, // Using the alternative for a clearer distinction
  { name: "Earthy & Revitalized", low: "#556B2F", high: "#90EE90" },
  { name: "Warm Dawn", low: "#6A0DAD", high: "#FFD700" }, // Using purple variant for diversity
  { name: "Modern & Serene", low: "#708090", high: "#40E0D0" },
  { name: "Fiery & Passionate", low: "#A0522D", high: "#FF7F50" },
  { name: "Twilight to Daylight", low: "#191970", high: "#FFDAB9" },
  { name: "Deep Ocean to Shallows", low: "#005050", high: "#AFEEEE" },
  { name: "Subtle & Gentle", low: "#BDB5D0", high: "#FFE4E1" },
  { name: "Monochromatic Cool", low: "#2F4F4F", high: "#B0E0E6" },
];

interface DailyMoodData {
  date: Date;
  averageMood?: number; // 1-10 scale
  color?: string;
  entriesCount: number;
}

// Helper function to get mood emoji from shared moodLabels
const getMoodEmoji = (moodValue: number): string => {
  const mood = moodLabels.find(m => m.value === moodValue);
  return mood ? mood.label : '🤔'; // Fallback emoji
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [entries, setEntries] = useState<Entry[]>([]) // This will now store entries for the currentDisplayMonth
  const [allTimeEntryCount, setAllTimeEntryCount] = useState(0); // New state for all-time entry count
  const [loading, setLoading] = useState(true)
  const [generatingAi, setGeneratingAi] = useState<string | null>(null);
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [monthlyMoods, setMonthlyMoods] = useState<Record<string, DailyMoodData>>({});
  const [selectedMoodColors, setSelectedMoodColors] = useState(() => {
    // Initialize from localStorage or default
    if (typeof window !== 'undefined') {
      const savedGradientName = localStorage.getItem("selectedMoodGradient");
      if (savedGradientName) {
        const savedGradient = gradientOptions.find(g => g.name === savedGradientName);
        if (savedGradient) {
          return savedGradient;
        }
      }
    }
    return gradientOptions[0]; // Default to Classic Contrast
  }); // Default to Classic Contrast

  // State for the "Recent Entries" list, separate from calendar entries
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [recentEntriesPage, setRecentEntriesPage] = useState(1);
  const [hasMoreRecentEntries, setHasMoreRecentEntries] = useState(true);
  const [loadingRecentEntries, setLoadingRecentEntries] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } = {} } = await supabase.auth.getSession() // Added default empty object
      setUser(session?.user ?? null)

      if (!session?.user) {
        router.push('/sign-in')
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        router.push('/sign-in')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  // Effect to load selected gradient from localStorage on mount
  useEffect(() => {
    const savedGradientName = localStorage.getItem("selectedMoodGradient");
    if (savedGradientName) {
      const savedGradient = gradientOptions.find(g => g.name === savedGradientName);
      if (savedGradient) {
        setSelectedMoodColors(savedGradient);
      }
    }
  }, []);

  // Fetch entries for the currentDisplayMonth
  useEffect(() => {
    async function fetchMonthlyEntries() {
      if (!user) return;
      setLoading(true);
      try {
        const startDate = startOfMonth(currentDisplayMonth);
        const endDate = endOfMonth(currentDisplayMonth);
        
        // TODO: Adapt getEntries or create a new API to fetch entries by date range
        // For now, we'll assume getEntries can be modified or a new function is created
        // This is a placeholder call, actual API will need to support date range
        const { entries: fetchedEntries } = await getEntries(1, 100, startDate.toISOString(), endDate.toISOString()) // Placeholder limit & page
        
        setEntries(fetchedEntries || []);
      } catch (error) {
        console.error('Error fetching monthly entries:', error)
        toast({
          title: "Error",
          description: "Failed to load entries for the month. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false);
      }
    }

    fetchMonthlyEntries()
  }, [user, currentDisplayMonth, toast])

  // Fetch initial batch of recent entries (for the list below calendar)
  useEffect(() => {
    async function fetchInitialRecentEntries() {
      if (!user) return;
      setLoadingRecentEntries(true);
      try {
        // Fetch the first page of all entries, ordered by most recent
        const { entries: fetchedEntries, hasMore } = await getEntries(1, 5); // Show 5 initially
        setRecentEntries(fetchedEntries || []);
        setHasMoreRecentEntries(hasMore);
        setRecentEntriesPage(1);
      } catch (error) {
        console.error('Error fetching initial recent entries:', error);
        toast({
          title: "Error",
          description: "Failed to load recent entries list.",
          variant: "destructive",
        });
      } finally {
        setLoadingRecentEntries(false);
      }
    }
    fetchInitialRecentEntries();
  }, [user, toast]);

  // New useEffect to fetch all-time total entries
  useEffect(() => {
    async function fetchAllTimeEntryCount() {
      if (!user) return;
      try {
        // Assuming getEntries can return total count with limit 0 or specific param
        // Or use a dedicated count endpoint if available
        const { total } = await getEntries(1, 1); // Fetch with limit 1 just to get the total count
        setAllTimeEntryCount(total || 0);
      } catch (error) {
        console.error('Error fetching all-time entry count:', error);
        // Optionally, show a toast message for this error
      }
    }
    fetchAllTimeEntryCount();
  }, [user]);

  const loadMoreRecentEntries = async () => {
    if (!user || !hasMoreRecentEntries || loadingRecentEntries) return;
    setLoadingRecentEntries(true);
    try {
      const nextPage = recentEntriesPage + 1;
      const { entries: newEntries, hasMore } = await getEntries(nextPage, 5);
      setRecentEntries(prev => [...prev, ...(newEntries || [])]);
      setHasMoreRecentEntries(hasMore);
      setRecentEntriesPage(nextPage);
    } catch (error) {
      console.error('Error loading more recent entries:', error);
      toast({
        title: "Error",
        description: "Failed to load more recent entries.",
        variant: "destructive",
      });
    } finally {
      setLoadingRecentEntries(false);
    }
  };
  
  // Process entries to calculate daily average moods and colors
  useEffect(() => {
    if (!entries.length && !loading) { // only process if entries are loaded or if loading is done and entries are empty
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDisplayMonth),
        end: endOfMonth(currentDisplayMonth),
      });
      const newMoodData: Record<string, DailyMoodData> = {};
      daysInMonth.forEach(day => {
        newMoodData[format(day, "yyyy-MM-dd")] = { date: day, entriesCount: 0 };
      });
      setMonthlyMoods(newMoodData); // Initialize with all days
      return;
    }

    const newMoodData: Record<string, DailyMoodData> = {};
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentDisplayMonth),
      end: endOfMonth(currentDisplayMonth),
    });

    daysInMonth.forEach(day => {
      const dayKey = format(day, "yyyy-MM-dd");
      const entriesForDay = entries.filter(entry => format(new Date(entry.date), "yyyy-MM-dd") === dayKey);
      
      if (entriesForDay.length > 0) {
        const totalMood = entriesForDay.reduce((sum, entry) => sum + entry.mood, 0);
        const averageMood = totalMood / entriesForDay.length; // This average is now on a 1-10 scale if entries are consistent
        newMoodData[dayKey] = {
          date: day,
          averageMood: averageMood, 
          // Apply (mood - 1) / 9 to normalize 1-10 scale to 0-1 factor for color interpolation
          color: interpolateColor(selectedMoodColors.low, selectedMoodColors.high, (averageMood - 1) / 9),
          entriesCount: entriesForDay.length,
        };
      } else {
        newMoodData[dayKey] = { date: day, entriesCount: 0 };
      }
    });
    setMonthlyMoods(newMoodData);
  }, [entries, currentDisplayMonth, selectedMoodColors, loading]);


  // Helper function to interpolate color
  // Factor is 0 (low mood) to 1 (high mood)
  function interpolateColor(color1: string, color2: string, factor: number): string {
    if (factor <= 0) return color1;
    if (factor >= 1) return color2;
    // Ensure colors are valid hex codes
    const validHex = /^#[0-9A-F]{6}$/i;
    if (!validHex.test(color1) || !validHex.test(color2)) {
        // console.warn("Invalid color format for interpolation. Using defaults.");
        color1 = selectedMoodColors.low; // Fallback to default
        color2 = selectedMoodColors.high;
    }

    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  const handleMonthChange = (month: Date) => {
    setCurrentDisplayMonth(month);
  };

  const handleGradientChange = (gradientName: string) => {
    const selectedGradient = gradientOptions.find(g => g.name === gradientName);
    if (selectedGradient) {
      setSelectedMoodColors(selectedGradient);
      if (typeof window !== 'undefined') {
        localStorage.setItem("selectedMoodGradient", selectedGradient.name);
      }
    }
  };

  // Handle AI generation
  const handleGenerateAi = async (entryId: string) => {
    if (generatingAi === entryId) return; // Prevent multiple clicks

    setGeneratingAi(entryId);
    try {
      const response = await fetch('/api/entries/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate AI content');
      }

      const { summary, affirmations } = await response.json();

      // Update the specific entry in the `entries` state (for calendar month view)
      setEntries(prevEntries =>
        prevEntries.map(e =>
          e.id === entryId ? { ...e, ai_summary: summary, positive_affirmation: affirmations } : e
        )
      );

      // ALSO Update the specific entry in the `recentEntries` state (for the list view)
      setRecentEntries(prevRecentEntries =>
        prevRecentEntries.map(e =>
          e.id === entryId ? { ...e, ai_summary: summary, positive_affirmation: affirmations } : e
        )
      );

      toast({
        title: "A.I. Insight Generated",
        description: "Summary and affirmations are now available for this entry.",
      });

    } catch (error: any) { // Use any for now, can refine error type later
      console.error('Error generating AI content:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAi(null);
    }
  };

  // Corrected average mood calculation for the stat display
  // Assumes entry.mood in the `entries` state (for the current month) is now 1-10
  const averageMoodForStat = entries.length > 0
    ? entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length
    : 0;

  const stats = {
    entriesThisMonth: entries.length,
    // Use the directly calculated 1-10 average, then format to one decimal place
    averageMoodForDisplay: entries.length > 0 ? parseFloat(averageMoodForStat.toFixed(1)) : 0
  }

  // Custom DayButton component for the calendar
  const CustomDayButton = (props: any) => {
    const date = props.day?.date;
    const displayMonth = currentDisplayMonth;
    
    // If date is invalid, return default behavior
    if (!(date instanceof Date && !isNaN(date.getTime()))) {
      return <span>{props.children}</span>;
    }
    
    const dayKey = format(date, "yyyy-MM-dd");
    const moodData = monthlyMoods[dayKey];
    const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
    
    let dayStyle = {};
    let moodEmoji = "";
    let hasEntries = false;

    if (moodData?.averageMood !== undefined && isCurrentMonth) {
      hasEntries = true;
      dayStyle = { 
        backgroundColor: moodData.color,
        color: moodData.averageMood > 6 ? '#000' : '#FFF',
      };
      const mood = moodData.averageMood;
      if (mood !== undefined) {
        moodEmoji = getMoodEmoji(Math.round(mood));
      }
    }

    const handleDateClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isCurrentMonth) return;
      const formattedDate = format(date, "yyyy-MM-dd");
      router.push(`/search?date=${formattedDate}`);
    };

    return (
      <button
        {...props}
        type="button"
        onClick={handleDateClick}
        disabled={!isCurrentMonth}
        style={dayStyle}
        className={cn(
          props.className,
          "relative w-full h-full min-h-[48px] flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 rounded-lg border",
          // Base styling
          isCurrentMonth ? "text-white" : "text-zinc-600",
          // Border styling
          isToday ? "border-yellow-400/60 shadow-lg shadow-yellow-400/20" : "border-transparent",
          // Background and hover states
          !hasEntries && isCurrentMonth && "hover:bg-white/10 active:bg-white/15",
          hasEntries && isCurrentMonth && "hover:brightness-110 active:scale-95",
          !isCurrentMonth && "cursor-not-allowed opacity-40",
          // Focus states
          "focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:ring-offset-2 focus:ring-offset-transparent"
        )}
        aria-label={`${hasEntries ? 'View' : 'Search'} entries for ${format(date, "MMMM d, yyyy")}`}
      >
        <span className={cn("leading-none", hasEntries && "mb-1")}>
          {format(date, "d")}
        </span>
        {moodEmoji && (
          <span className="text-xs leading-none opacity-90">
            {moodEmoji}
          </span>
        )}
        {moodData && moodData.entriesCount > 1 && isCurrentMonth && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] bg-yellow-500 text-black font-bold rounded-full flex items-center justify-center shadow-lg">
            {moodData.entriesCount}
          </span>
        )}
        {hasEntries && isCurrentMonth && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-current rounded-full opacity-60" />
        )}
        </button>
    );
  };

  // Log currentDisplayMonth before rendering Calendar
  // console.log("[DashboardPage] Rendering Calendar with currentDisplayMonth:", currentDisplayMonth, "Is valid Date object:", currentDisplayMonth instanceof Date && !isNaN(currentDisplayMonth.getTime()));

  return (
    <div className="min-h-screen w-full bg-[url('/mountains.jpg')] bg-cover bg-center">
      <div className="min-h-screen w-full">
    <CenteredLayout>
          <div className="w-full max-w-6xl space-y-6 pt-24 px-4">
            {/* Main Container Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg overflow-hidden">
              {/* Header Section */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Journal Dashboard</h1>
                    <p className="text-gray-300 mt-1">Visualize your monthly mood patterns</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* All-Time Entries Card - Moved to first position */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Book className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-300 font-medium">All-Time Entries</p>
                        <p className="text-3xl font-bold text-white mt-1">{allTimeEntryCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Entries This Month Card - Moved to second position & adjusted for width */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <CalendarIconUI className="w-6 h-6 text-gray-300" />
                      </div>
                      <div className="flex-shrink min-w-0"> {/* Added flex-shrink and min-w-0 here */}
                        <p className="text-lg text-gray-300 font-medium truncate">Month's Entries</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.entriesThisMonth}</p>
                      </div>
                    </div>
                  </div>

                  {/* Average Mood Card - Remains in third position */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Smile className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-300 font-medium">Average Mood</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.averageMoodForDisplay}/10</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mood Trends and Activity -> Changed to Monthly Mood Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Monthly Mood Calendar */}
                  <div className="lg:col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10"> {/* Changed to lg:col-span-3 */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-white">Monthly Mood Calendar</h2>
                        <p className="text-gray-300 mt-1">Click a day to see entries (future enhancement)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-gray-400" />
                        <Select 
                          value={selectedMoodColors.name} 
                          onValueChange={handleGradientChange}
                        >
                          <SelectTrigger className="w-[200px] h-9 text-xs bg-black/20 border-white/10">
                            <SelectValue placeholder="Select Gradient" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradientOptions.map(gradient => (
                              <SelectItem key={gradient.name} value={gradient.name} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1 overflow-hidden">
                                    <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: gradient.low }} />
                                    <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: gradient.high }} />
                                  </div>
                                  {gradient.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {loading ? (
                      <div className="h-[350px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    ) : (
                      <div className="w-full [&_table]:grid [&_table]:grid-cols-7 [&_table]:gap-2 [&_thead]:contents [&_tbody]:contents [&_tr]:contents">
                      <Calendar
                        mode="single"
                        onMonthChange={handleMonthChange}
                        month={currentDisplayMonth}
                          components={{ DayButton: CustomDayButton }}
                          className="w-full p-0 bg-transparent border-0"
                        classNames={{
                            months: "w-full",
                            month: "space-y-4 w-full",
                            caption: "flex justify-center relative items-center h-16 mb-4",
                            caption_label: "hidden",
                          nav: "space-x-1 flex items-center",
                            nav_button: "h-10 w-10 bg-white/10 hover:bg-white/20 p-0 opacity-75 hover:opacity-100 transition-all rounded-lg border border-white/10 flex items-center justify-center",
                            nav_button_previous: "absolute left-2",
                            nav_button_next: "absolute right-2",
                            table: "w-full",
                            head_row: "",
                            head_cell: "text-zinc-300 font-medium text-center py-2 text-sm uppercase tracking-wide min-h-[40px] flex items-center justify-center",
                            row: "",
                            cell: "relative aspect-square",
                            day: "w-full h-full p-0 font-normal focus:outline-none transition-all rounded-lg",
                            day_selected: "bg-yellow-500 text-black hover:bg-yellow-400",
                            day_today: "ring-2 ring-yellow-400/50 ring-inset",
                            day_outside: "text-zinc-600 opacity-40",
                            day_disabled: "text-zinc-600 opacity-40",
                        }}
                      />
                      </div>
                    )}
                  </div>

                  {/* Recent Activity - REMOVED */}
                </div>

                {/* Recent Entries - This section will be removed or re-thought. For now, I'll keep the structure but comment out the mapping part */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-6">Recent Entries</h2>
                  {loadingRecentEntries && !recentEntries.length ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
                    </div>
                  ) : recentEntries.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {recentEntries.map((entry) => (
                        <Link key={entry.id} href={`/search?entryId=${entry.id}`} passHref className="block mb-4 last:mb-0">
                          <div className="block bg-black/20 rounded-lg p-4 hover:bg-black/30 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-white">{entry.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                  {format(new Date(entry.date), 'MMMM d, yyyy')}
                                </p>
                              </div>
                              <span className="text-2xl">
                                {/* Updated emoji logic for 1-10 scale */}
                                {/* {entry.mood >= 9 ? '🥳' :
                                 entry.mood >= 7 ? '😊' :
                                 entry.mood >= 5 ? '😐' :
                                 entry.mood >= 3 ? '😔' :
                                 entry.mood >= 1 ? '😢' : '🤔'} */}
                                {getMoodEmoji(entry.mood)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 mt-2 line-clamp-2">{entry.content}</p>

                            {/* Display AI Summary and Affirmation if they exist */}
                            {(entry.ai_summary || entry.positive_affirmation) && (
                              <div className="mt-4 p-3 bg-white/10 rounded-md">
                                {entry.ai_summary && (
                                  <p className="text-sm text-gray-200">
                                    <span className="font-semibold">Summary:</span> {entry.ai_summary}
                                  </p>
                                )}
                                {entry.positive_affirmation && (
                                  <div className="mt-1">
                                    <span className="font-semibold text-sm text-gray-200">Affirmations:</span>
                                    {(() => {
                                      let affirmationsToDisplay: { text: string; based_on?: string }[] = [];
                                      if (typeof entry.positive_affirmation === 'string') {
                                        try {
                                          const parsed = JSON.parse(entry.positive_affirmation);
                                          if (Array.isArray(parsed)) {
                                            affirmationsToDisplay = parsed.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                                          } else if (entry.positive_affirmation && entry.positive_affirmation !== "Could not generate affirmations.") {
                                            // If it's a string but not the error message, display as single affirmation
                                            return <p className="text-sm text-gray-300 ml-2">- {entry.positive_affirmation}</p>;
                                          }
                                        } catch (e) {
                                          // If JSON.parse fails, and it's not the error string, treat as single old affirmation
                                          if (entry.positive_affirmation && entry.positive_affirmation !== "Could not generate affirmations.") {
                                            return <p className="text-sm text-gray-300 ml-2">- {entry.positive_affirmation}</p>;
                                          }
                                        }
                                      } else if (Array.isArray(entry.positive_affirmation)) {
                                        affirmationsToDisplay = entry.positive_affirmation.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                                      }

                                      if (affirmationsToDisplay.length > 0) {
                                        return (
                                          <ul className="list-disc list-inside ml-2 space-y-1">
                                            {affirmationsToDisplay.map((aff, index) => (
                                              <li key={index} className="text-sm text-gray-300">
                                                {aff.text}
                                                {aff.based_on && aff.based_on !== "N/A" && (
                                                  <span className="text-xs text-gray-400 italic"> (Based on: "{aff.based_on}")</span>
                                                )}
              </li>
            ))}
          </ul>
                                        );
                                      } else if (entry.ai_summary && entry.ai_summary !== "Could not generate summary." && entry.positive_affirmation === "Could not generate affirmations.") {
                                         return <p className="text-sm text-gray-400 ml-2">The AI analyzed this entry but couldn't find enough information to generate affirmations.</p>;
                                      } else if (entry.positive_affirmation) {
                                         // Fallback for any other string case, including "Could not generate affirmations."
                                         return <p className="text-sm text-gray-400 ml-2">{entry.positive_affirmation || "No affirmations available."}</p>;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AI Generation Button - Conditionally render if summary OR affirmation is missing */}
                            {(!entry.ai_summary || entry.ai_summary === "Could not generate summary." || !entry.positive_affirmation || entry.positive_affirmation === "Could not generate affirmations." || (Array.isArray(entry.positive_affirmation) && entry.positive_affirmation.length === 0) ) && (
                              <div className="mt-4 text-right">
                                <Button
                                  onClick={() => handleGenerateAi(entry.id)}
                                  disabled={generatingAi === entry.id || generatingAi !== null}
                                  size="sm"
                                  className="bg-white/10 hover:bg-white/20 text-white"
                                >
                                  {generatingAi === entry.id ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Generating...
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Generate A.I. Insight
                                    </div>
                                  )}
                                </Button>
                              </div>
                            )}

                            {entry.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {entry.hashtags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300"
                                  >
                                    #{tag}
                                  </span>
                                ))}
        </div>
          )}
        </div>
              </Link>
                      ))}
                      {hasMoreRecentEntries && (
                        <button
                          onClick={loadMoreRecentEntries}
                          disabled={loadingRecentEntries}
                          className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white disabled:opacity-50"
                        >
                          {loadingRecentEntries ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            "Load More Recent Entries"
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No recent entries found.
                    </div>
                  )}
        </div>
          </div>
        </div>
      </div>
    </CenteredLayout>
      </div>
    </div>
  )
}
