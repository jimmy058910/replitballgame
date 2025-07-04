import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, Users } from "lucide-react";
import { Link } from "wouter";

interface ScheduledMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string;
  awayTeamName?: string;
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
  const { data: schedule, isLoading } = useQuery<DailySchedule>({
    queryKey: ["/api/league/daily-schedule"],
    refetchInterval: 30000, // Update every 30 seconds for live status
  });

  if (isLoading) {
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

  if (!schedule || !schedule.schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            League Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No league schedule available</p>
        </CardContent>
      </Card>
    );
  }

  const formatGameTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Detroit',
      timeZoneName: 'short'
    });
  };

  const getStatusBadge = (match: ScheduledMatch) => {
    if (match.isLive) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          LIVE
        </Badge>
      );
    }
    
    switch (match.status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{match.status}</Badge>;
    }
  };

  // Sort days in descending order (current day first)
  const sortedDays = Object.keys(schedule.schedule)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          League Schedule
          <Badge variant="outline" className="ml-auto">
            Day {schedule.currentDay} of {schedule.totalDays}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedDays.map(day => {
          const dayMatches = schedule.schedule[day.toString()];
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
                <span className="text-sm text-gray-500">
                  {dayMatches.length} games
                </span>
              </div>

              <div className="space-y-2">
                {dayMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      match.isLive ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[60px]">
                        <div className="text-sm font-mono">
                          {formatGameTime(match.scheduledTimeFormatted)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Game {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {match.homeTeamName || `Team ${match.homeTeamId.slice(0, 8)}`}
                        </span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-sm">
                          {match.awayTeamName || `Team ${match.awayTeamId.slice(0, 8)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(match)}
                      
                      {match.canWatch && match.isLive && (
                        <Link href={`/match/${match.id}`}>
                          <Button size="sm" variant="default" className="gap-1">
                            <Eye className="w-3 h-3" />
                            Watch Live
                          </Button>
                        </Link>
                      )}
                      
                      {match.status === 'completed' && (
                        <Link href={`/match/${match.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Eye className="w-3 h-3" />
                            View Result
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {sortedDays.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No league games scheduled yet</p>
            <p className="text-sm">Games will appear here once the season begins</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}