import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, AlertTriangle, HeartPulse, FileText, 
  Play, Users, Zap, Target, ExternalLink 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Team } from '@shared/types/models';


interface CriticalAlerts {
  injuries: number;
  lowStamina: number;
  expiringContracts: number;
  totalIssues: number;
  nextMatch?: {
    opponent: string;
    timeUntil: number;
    isHome: boolean;
  };
}

interface NextMatch {
  opponent: string;
  timeUntil: number;
  isHome: boolean;
  gameDate: string;
}

export default function PriorityActionsPanel() {
  const { data: alerts } = useQuery<CriticalAlerts>({
    queryKey: ['/api/alerts/critical'],
    queryFn: () => apiRequest('/api/alerts/critical'),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for live alerts
  });

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getUrgencyLevel = (totalIssues: number) => {
    if (totalIssues >= 5) return { color: 'text-red-400', level: 'Critical' };
    if (totalIssues >= 3) return { color: 'text-yellow-400', level: 'High' };
    if (totalIssues >= 1) return { color: 'text-orange-400', level: 'Medium' };
    return { color: 'text-green-400', level: 'Good' };
  };

  if (!alerts) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-8 bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-600 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgency = getUrgencyLevel(alerts.totalIssues);

  return (
    <div className="space-y-4">
      {/* Next Match Card */}
      {alerts.nextMatch && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-950/20 border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-200">
              <Play className="w-5 h-5" />
              Next Match
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  vs {alerts.nextMatch.opponent}
                </p>
                <p className="text-sm text-blue-300">
                  {alerts.nextMatch.isHome ? '🏠 Home' : '✈️ Away'} • {formatTimeRemaining(alerts.nextMatch.timeUntil)}
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-blue-500 text-blue-200 hover:bg-blue-900">
                <Target className="w-4 h-4 mr-1" />
                Tactics
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts Card */}
      <Card className={`border-l-4 ${
        alerts.totalIssues > 0 
          ? 'border-l-orange-500 bg-orange-950/20 border-orange-800' 
          : 'border-l-green-500 bg-green-950/20 border-green-800'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${urgency.color}`} />
              <span className="text-white">Team Status</span>
            </div>
            <Badge 
              variant={alerts.totalIssues > 0 ? "destructive" : "secondary"}
              className={alerts.totalIssues === 0 ? "bg-green-800 text-green-100" : ""}
            >
              {urgency.level}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {alerts.totalIssues === 0 ? (
            <p className="text-green-300 text-sm">All systems operational. Team ready for action!</p>
          ) : (
            <>
              {alerts.injuries > 0 && (
                <Alert className="border-red-600 bg-red-950/20">
                  <HeartPulse className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    <strong>{alerts.injuries}</strong> player{alerts.injuries > 1 ? 's' : ''} injured - 
                    <Button variant="link" className="p-0 h-auto text-red-300 underline ml-1">
                      View Medical Bay
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {alerts.lowStamina > 0 && (
                <Alert className="border-yellow-600 bg-yellow-950/20">
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-yellow-200">
                    <strong>{alerts.lowStamina}</strong> player{alerts.lowStamina > 1 ? 's' : ''} with low stamina (&lt;50%) - 
                    <Button variant="link" className="p-0 h-auto text-yellow-300 underline ml-1">
                      Manage Rest
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {alerts.expiringContracts > 0 && (
                <Alert className="border-blue-600 bg-blue-950/20">
                  <FileText className="h-4 w-4" />
                  <AlertDescription className="text-blue-200">
                    <strong>{alerts.expiringContracts}</strong> contract{alerts.expiringContracts > 1 ? 's' : ''} expiring soon - 
                    <Button variant="link" className="p-0 h-auto text-blue-300 underline ml-1">
                      Review Contracts
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-auto py-3 border-gray-600 hover:bg-gray-800"
        >
          <Users className="w-4 h-4" />
          <div className="text-left">
            <div className="font-medium">Roster HQ</div>
            <div className="text-xs text-gray-400">Manage players</div>
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex items-center gap-2 h-auto py-3 border-gray-600 hover:bg-gray-800"
        >
          <Target className="w-4 h-4" />
          <div className="text-left">
            <div className="font-medium">Tactics</div>
            <div className="text-xs text-gray-400">Set formation</div>
          </div>
        </Button>
      </div>
    </div>
  );
}