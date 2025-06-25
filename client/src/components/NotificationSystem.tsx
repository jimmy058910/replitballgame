import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, X, Clock, Trophy, Users, Target, DollarSign, AlertCircle, CheckCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "match" | "auction" | "injury" | "league" | "system" | "achievement";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  metadata?: any;
}

export default function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Check for new notifications every 10 seconds
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}/read`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => 
      apiRequest("/api/notifications/mark-all-read", "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Trophy className="h-4 w-4" />;
      case "auction":
        return <DollarSign className="h-4 w-4" />;
      case "injury":
        return <AlertCircle className="h-4 w-4" />;
      case "league":
        return <Users className="h-4 w-4" />;
      case "achievement":
        return <Target className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-500 bg-red-50";
      case "high":
        return "border-orange-500 bg-orange-50";
      case "medium":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredNotifications = notifications?.filter((n: Notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.isRead;
    return n.type === filter;
  }) || [];

  // Real-time notification popup for urgent notifications
  useEffect(() => {
    if (notifications) {
      const newUrgentNotifications = notifications.filter(
        (n: Notification) => !n.isRead && n.priority === "urgent"
      );
      
      newUrgentNotifications.forEach((notification: Notification) => {
        toast({
          title: notification.title,
          description: notification.message,
          variant: "destructive",
          duration: 8000,
        });
      });
    }
  }, [notifications, toast]);

  return (
    <>
      {/* Notification Bell Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.div>
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
            </DialogTitle>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </DialogHeader>

          {/* Filter Tabs */}
          <div className="flex space-x-2 border-b pb-2">
            {["all", "unread", "match", "auction", "injury", "league"].map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="capitalize"
              >
                {filterType === "all" && "All"}
                {filterType === "unread" && "Unread"}
                {filterType === "match" && "Matches"}
                {filterType === "auction" && "Auctions"}
                {filterType === "injury" && "Injuries"}
                {filterType === "league" && "League"}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 p-2">
              <AnimatePresence>
                {filteredNotifications.map((notification: Notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                      notification.isRead 
                        ? "border-gray-200 bg-gray-50 opacity-75 text-gray-700" 
                        : getPriorityColor(notification.priority) + " text-gray-900"
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markReadMutation.mutate(notification.id);
                      }
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${
                        notification.type === "match" ? "bg-blue-600 text-white" :
                        notification.type === "auction" ? "bg-green-600 text-white" :
                        notification.type === "injury" ? "bg-red-600 text-white" :
                        notification.type === "league" ? "bg-purple-600 text-white" :
                        notification.type === "achievement" ? "bg-yellow-600 text-black" :
                        "bg-gray-600 text-white"
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`font-semibold ${
                            notification.isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            <div className="flex space-x-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markReadMutation.mutate(notification.id);
                                  }}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                title="Delete notification"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <p className={`text-sm mt-1 ${
                          notification.isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
                        }`}>
                          {notification.message}
                        </p>
                        
                        {notification.priority === "urgent" && (
                          <Badge variant="destructive" className="mt-2">
                            Urgent
                          </Badge>
                        )}
                        
                        {notification.actionUrl && (
                          <Badge variant="outline" className="mt-2">
                            Click to view
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!isLoading && filteredNotifications.length === 0 && (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Notifications</h3>
                  <p className="text-gray-500">
                    {filter === "unread" 
                      ? "All caught up! No unread notifications."
                      : "You'll see notifications about matches, auctions, and league events here."
                    }
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex space-x-3 p-4 bg-gray-100 rounded-lg">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}