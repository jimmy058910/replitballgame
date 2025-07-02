import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";

interface ServerTimeInfo {
  currentTime: string;
  formattedTime: string;
  timezone: string;
  isSchedulingWindow: boolean;
  schedulingWindow: string;
  timeUntilNextWindow: {
    hours: number;
    minutes: number;
  };
}

export default function ServerTimeDisplay() {
  const { data: serverTime, isLoading } = useQuery<ServerTimeInfo>({
    queryKey: ["/api/server/time"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Server Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!serverTime) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Server Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Unable to load server time</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Detroit',
      timeZoneName: 'short'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Detroit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Server Time (Eastern)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="text-lg font-mono font-semibold">
            {formatTime(serverTime.currentTime)}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(serverTime.currentTime)}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">League Games</span>
            <Badge 
              variant={serverTime.isSchedulingWindow ? "default" : "secondary"}
              className="text-xs"
            >
              {serverTime.isSchedulingWindow ? "OPEN" : "CLOSED"}
            </Badge>
          </div>
          
          <div className="text-xs text-gray-600">
            Window: {serverTime.schedulingWindow}
          </div>
          
          {!serverTime.isSchedulingWindow && serverTime.timeUntilNextWindow && (
            <div className="text-xs text-gray-500">
              Next window opens in: {serverTime.timeUntilNextWindow.hours}h {serverTime.timeUntilNextWindow.minutes}m
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}