import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Eye, 
  EyeOff, 
  Trophy, 
  AlertTriangle, 
  Clock,
  Target,
  Heart,
  DollarSign,
  Award,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Define notification types for this component
interface NotificationType {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

export default function NotificationCenter() {
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationType[]>({ // Typed useQuery
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/mark-all-read", "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications-delete-all", "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications deleted",
      });
    },
  });

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === "urgent" ? "text-red-400" : 
                      priority === "high" ? "text-orange-400" :
                      priority === "medium" ? "text-yellow-400" : "text-blue-400";

    switch (type) {
      case "match":
        return <Trophy className={`w-5 h-5 ${iconClass}`} />;
      case "tournament":
        return <Award className={`w-5 h-5 ${iconClass}`} />;
      case "auction":
        return <DollarSign className={`w-5 h-5 ${iconClass}`} />;
      case "injury":
        return <Heart className={`w-5 h-5 ${iconClass}`} />;
      case "contract":
        return <Target className={`w-5 h-5 ${iconClass}`} />;
      case "achievement":
        return <Award className={`w-5 h-5 ${iconClass}`} />;
      default:
        return <Bell className={`w-5 h-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-600 text-white border-red-500";
      case "high":
        return "bg-orange-600 text-white border-orange-500";
      case "medium":
        return "bg-yellow-600 text-black border-yellow-500";
      default:
        return "bg-blue-600 text-white border-blue-500";
    }
  };

  const canRevealResult = (notification: NotificationType) => {
    // Safely access metadata and its properties
    const metadata = notification.metadata as { resultHidden?: boolean;[key: string]: any } | null | undefined;
    return metadata?.resultHidden &&
           (notification.type === "match" || notification.type === "tournament");
  };

  const getRevealedMessage = (notification: NotificationType) => {
    const metadata = notification.metadata as any; // Keep as any for flexibility or define specific metadata types per notification.type
    if (notification.type === "match" && metadata) {
      const { homeScore, awayScore } = metadata;
      return `Final Score: ${homeScore ?? '?' } - ${awayScore ?? '?'}`;
    }
    if (notification.type === "tournament" && metadata) {
      const { result } = metadata;
      if (result === "champion") {
        return "🏆 You won the tournament! Congratulations!";
      } else if (result === "eliminated") {
        return "You were eliminated from the tournament. Better luck next time!";
      }
    }
    return notification.message;
  };

  const handleRevealResult = (notificationId: string) => {
    setShowResults(prev => ({ ...prev, [notificationId]: true }));
  };

  const handleMarkAsRead = (notificationId: string) => {
    markReadMutation.mutate(notificationId);
  };

  const unreadCount = notifications.filter((n: NotificationType) => !n.isRead).length; // Use NotificationType

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
              >
                Delete All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {notifications.map((notification: NotificationType) => ( // Use NotificationType
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead 
                      ? "bg-gray-700 border-gray-600" 
                      : "bg-gray-600 border-gray-500"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(notification.type, notification.priority as string)} {/* Cast priority for now */}
                      <h4 className="font-semibold text-white">{notification.title}</h4>
                      <Badge className={`text-xs ${getPriorityColor(notification.priority as string)}`}> {/* Cast priority for now */}
                        {notification.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    {canRevealResult(notification) && !showResults[notification.id] ? (
                      <div className="space-y-2">
                        <p className="text-gray-300">{notification.message}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevealResult(notification.id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Reveal Result
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-300">
                        {showResults[notification.id] 
                          ? getRevealedMessage(notification)
                          : notification.message
                        }
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Date unknown'}</span>
                    {notification.actionUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.location.href = notification.actionUrl!}
                        className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}