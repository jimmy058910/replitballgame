import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Eye, Users, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

interface ScheduledMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  scheduledTime: Date;
  scheduledTimeFormatted: string;
  isLive: boolean;
  canWatch: boolean;
  status: string;
  gameDay: number;
}

interface DailySchedule {
  schedule: Record<string, ScheduledMatch[]>;
  totalDays: number;
  currentDay: number;
}

export default function LeagueSchedule() {
  // State for accordion sections
  const [isRemainingOpen, setIsRemainingOpen] = useState(true); // Open by default
  const [isCompletedOpen, setIsCompletedOpen] = useState(false); // Minimized by default

  useEffect(() => {
    console.log("✅ LeagueSchedule component mounted successfully");
  }, []);
  
  const { data: schedule, isLoading, error } = useQuery<DailySchedule>({
    queryKey: ["/api/leagues/daily-schedule"],
    refetchInterval: 5 * 1000, // Update every 5 seconds for immediate testing
    staleTime: 0, // Force fresh data every time
    enabled: true,
  });
  
  // Debug query state
  console.log("LeagueSchedule Query:", { isLoading, hasError: !!error, hasData: !!schedule });

  const { data: userTeam } = useQuery<any>({
    queryKey: ["/api/teams/my"],
    refetchInterval: 5 * 60 * 1000, // Update every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  });

  // Debug logging
  console.log("LeagueSchedule render:", { 
    schedule: schedule ? {
      totalDays: Object.keys(schedule.schedule || {}).length,
      currentDay: schedule.currentDay,
      scheduleKeys: Object.keys(schedule.schedule || {}),
      firstFewEntries: Object.entries(schedule.schedule || {}).slice(0, 3)
    } : null, 
    isLoading, 
    error 
  });

  if (isLoading) {
    console.log("🔄 LeagueSchedule: Loading state - API call in progress");
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            League Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error("League schedule error:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            League Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">Error loading schedule: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!schedule || !schedule.schedule || Object.keys(schedule.schedule).length === 0) {
    console.log("No schedule data:", schedule);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            League Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">No league schedule available</p>
        </CardContent>
      </Card>
    );
  }

  const formatGameTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York', // Fixed: Use proper EDT timezone
      timeZoneName: 'short'
    });
  };

  const isUserTeamMatch = (match: ScheduledMatch) => {
    if (!userTeam) return false;
    // Convert both to numbers for comparison
    const homeTeamId = typeof match.homeTeamId === 'string' ? parseInt(match.homeTeamId) : match.homeTeamId;
    const awayTeamId = typeof match.awayTeamId === 'string' ? parseInt(match.awayTeamId) : match.awayTeamId;
    const userId = typeof userTeam.id === 'string' ? parseInt(userTeam.id) : userTeam.id;
    
    return homeTeamId === userId || awayTeamId === userId;
  };

  const getStatusBadge = (match: ScheduledMatch) => {
    if (match.isLive) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          LIVE
        </Badge>
      );
    }
    
    switch (match.status.toUpperCase()) {
      case 'SCHEDULED':
        return <Badge variant="secondary">SCHEDULED</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline">FINAL</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>;
      default:
        return <Badge variant="secondary">{match.status}</Badge>;
    }
  };

  const getScoreDisplay = (match: ScheduledMatch, gameIndex: number) => {
    if (match.status.toUpperCase() === 'COMPLETED') {
      return (
        <div className="text-sm font-mono text-center min-w-[60px]">
          <div className="font-bold text-gray-900 dark:text-white">
            {match.homeScore || 0} - {match.awayScore || 0}
          </div>
          <div 
            className="text-xs px-2 py-1 rounded-sm text-white font-bold"
            style={{ 
              backgroundColor: '#059669',
              color: '#ffffff !important',
              fontWeight: 'bold',
              fontSize: '11px',
              textAlign: 'center',
              display: 'inline-block'
            }}
          >
            FINAL
          </div>
        </div>
      );
    }
    
    if (match.status.toUpperCase() === 'IN_PROGRESS' || match.isLive) {
      return (
        <div className="text-sm font-mono text-center min-w-[60px]">
          <div className="font-bold text-red-600">
            {match.homeScore || 0} - {match.awayScore || 0}
          </div>
          <div className="text-xs text-red-500">LIVE</div>
        </div>
      );
    }
    
    return (
      <div className="text-center min-w-[60px]">
        <div className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">
          {match.scheduledTimeFormatted || "TBD"}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Game {gameIndex + 1}
        </div>
      </div>
    );
  };

  // Separate completed and upcoming games
  const allMatches: ScheduledMatch[] = [];
  Object.entries(schedule.schedule).forEach(([day, dayMatches]) => {
    if (dayMatches && dayMatches.length > 0) {
      dayMatches.forEach(match => {
        allMatches.push({ ...match, gameDay: parseInt(day) });
      });
    }
  });

  // Split matches into completed and upcoming
  const completedMatches = allMatches
    .filter(match => match.status.toUpperCase() === 'COMPLETED')
    .sort((a, b) => b.gameDay - a.gameDay); // Most recent first

  const upcomingMatches = allMatches
    .filter(match => {
      const status = match.status.toUpperCase();
      // Keep SCHEDULED and IN_PROGRESS in upcoming section
      return status === 'SCHEDULED' || status === 'IN_PROGRESS';
    })
    .sort((a, b) => a.gameDay - b.gameDay); // Chronological order

  // Group upcoming matches by day
  const upcomingByDay: Record<number, ScheduledMatch[]> = {};
  upcomingMatches.forEach(match => {
    if (!upcomingByDay[match.gameDay]) {
      upcomingByDay[match.gameDay] = [];
    }
    upcomingByDay[match.gameDay].push(match);
  });

  // Group completed matches by day
  const completedByDay: Record<number, ScheduledMatch[]> = {};
  completedMatches.forEach(match => {
    if (!completedByDay[match.gameDay]) {
      completedByDay[match.gameDay] = [];
    }
    completedByDay[match.gameDay].push(match);
  });

  const upcomingDays = Object.keys(upcomingByDay).map(Number).sort((a, b) => a - b);
  const completedDays = Object.keys(completedByDay).map(Number).sort((a, b) => b - a);

  const renderAccordionSection = (
    title: string, 
    daysList: number[], 
    matchesByDay: Record<number, ScheduledMatch[]>, 
    isCompleted = false,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gray-800/90 border border-gray-600">
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-gray-700/50 transition-colors cursor-pointer">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {title}
              {!isCompleted && (
                <Badge variant="outline" className="ml-auto mr-2">
                  Day {schedule.currentDay} of {schedule.totalDays}
                </Badge>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isCompleted ? 'ml-auto' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 max-h-none">
            {daysList.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No {isCompleted ? 'completed' : 'upcoming'} games</p>
              </div>
            ) : (
              daysList.map(day => {
                const dayMatches = matchesByDay[day];
                if (!dayMatches || dayMatches.length === 0) return null;

                const isCurrentDay = day === schedule.currentDay;

                return (
                  <div key={day} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        Day {day}
                        {isCurrentDay && (
                          <Badge variant="default" className="ml-2">
                            Current
                          </Badge>
                        )}
                      </h3>
                      <div className="flex-1">
                        <Separator />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {dayMatches.length} games
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayMatches.map((match, index) => {
                        const isUserMatch = isUserTeamMatch(match);
                        return (
                          <div
                            key={match.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              match.isLive || match.status.toUpperCase() === 'IN_PROGRESS'
                                ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/30' 
                                : isUserMatch 
                                  ? 'border-blue-400 bg-blue-100 text-blue-900 dark:border-blue-500 dark:bg-blue-800/30 dark:text-blue-100' 
                                  : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {getScoreDisplay(match, index)}
                              
                              <div className="flex items-center gap-2">
                                <Users className={`w-4 h-4 ${isUserMatch ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`} />
                                <span className={`text-sm ${isUserMatch ? 'font-semibold text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-100'}`}>
                                  {match.homeTeamName || `Team ${match.homeTeamId.slice(0, 8)}`}
                                </span>
                                <span className={`${isUserMatch ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-200'}`}>vs</span>
                                <span className={`text-sm ${isUserMatch ? 'font-semibold text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-100'}`}>
                                  {match.awayTeamName || `Team ${match.awayTeamId.slice(0, 8)}`}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {getStatusBadge(match)}
                              
                              {(match.canWatch && (match.isLive || match.status.toUpperCase() === 'IN_PROGRESS')) && (
                                <Link href={`/live-match/${match.id}`}>
                                  <Button size="sm" variant="default" className="gap-1">
                                    <Eye className="w-3 h-3" />
                                    Watch Live
                                  </Button>
                                </Link>
                              )}
                              
                              {match.status.toUpperCase() === 'COMPLETED' && (
                                <Link href={`/live-match/${match.id}`}>
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <Eye className="w-3 h-3" />
                                    View Result
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      {/* Remaining League Schedule Section */}
      {renderAccordionSection(
        "Remaining League Schedule", 
        upcomingDays, 
        upcomingByDay, 
        false, 
        isRemainingOpen, 
        setIsRemainingOpen
      )}
      
      {/* Completed League Games Section */}
      {renderAccordionSection(
        "Completed League Games", 
        completedDays, 
        completedByDay, 
        true, 
        isCompletedOpen, 
        setIsCompletedOpen
      )}
    </div>
  );
}