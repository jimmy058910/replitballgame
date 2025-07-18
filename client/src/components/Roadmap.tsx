import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Star, 
  Users, 
  Gamepad2, 
  Trophy, 
  MapPin, 
  Palette, 
  Settings,
  Target,
  Globe,
  Crown
} from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned" | "future";
  priority: "high" | "medium" | "low";
  category: "features" | "ui" | "backend" | "community";
  estimatedCompletion?: string;
  progress?: number;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Roadmap() {
  const roadmapItems: RoadmapItem[] = [
    {
      id: "naming-tokens",
      title: "Naming Tokens",
      description: "Allow players to customize team names, player names, and create unique identities",
      status: "planned",
      priority: "high",
      category: "features",
      estimatedCompletion: "Q4 2025",
      progress: 25,
      icon: Palette
    },
    {
      id: "player-customization",
      title: "Player Customization",
      description: "Visual customization options for players including appearance, equipment, and personal stats",
      status: "planned",
      priority: "medium",
      category: "features",
      estimatedCompletion: "Q1 2026",
      progress: 10,
      icon: Users
    },
    {
      id: "staff-features",
      title: "Enhanced Staff Features",
      description: "Expanded staff management with specialized roles, training programs, and staff interactions",
      status: "in-progress",
      priority: "medium",
      category: "features",
      estimatedCompletion: "Q3 2025",
      progress: 60,
      icon: Target
    },
    {
      id: "game-simulation-upgrades",
      title: "Game Simulation Upgrades",
      description: "Enhanced match simulation with more detailed events, better AI, and improved realism",
      status: "in-progress",
      priority: "high",
      category: "backend",
      estimatedCompletion: "Q4 2025",
      progress: 75,
      icon: Gamepad2
    },
    {
      id: "2d-visualization",
      title: "2D/2.5D Visualization",
      description: "Visual representation of matches with 2D field views and animated player movements",
      status: "future",
      priority: "high",
      category: "ui",
      estimatedCompletion: "Q2 2026",
      progress: 5,
      icon: MapPin
    },
    {
      id: "global-ranking",
      title: "Global Ranking System",
      description: "Comprehensive global leaderboards with seasonal rankings and achievements",
      status: "completed",
      priority: "medium",
      category: "features",
      estimatedCompletion: "Completed",
      progress: 100,
      icon: Trophy
    },
    {
      id: "hall-of-fame",
      title: "Hall of Fame",
      description: "Recognition system for legendary players, teams, and memorable moments",
      status: "completed",
      priority: "low",
      category: "community",
      estimatedCompletion: "Completed",
      progress: 100,
      icon: Crown
    },
    {
      id: "friends-list",
      title: "Friends List & Social Features",
      description: "Friend system with private messaging, friend matches, and social interactions",
      status: "planned",
      priority: "medium",
      category: "community",
      estimatedCompletion: "Q1 2026",
      progress: 15,
      icon: Users
    },
    {
      id: "mobile-optimization",
      title: "Mobile App Optimization",
      description: "Enhanced mobile experience with native app features and touch-optimized interface",
      status: "in-progress",
      priority: "high",
      category: "ui",
      estimatedCompletion: "Q4 2025",
      progress: 40,
      icon: Settings
    },
    {
      id: "advanced-analytics",
      title: "Advanced Analytics",
      description: "Detailed player and team analytics with performance insights and trend analysis",
      status: "planned",
      priority: "medium",
      category: "features",
      estimatedCompletion: "Q2 2026",
      progress: 20,
      icon: Star
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-600";
      case "in-progress": return "bg-blue-600";
      case "planned": return "bg-yellow-600";
      case "future": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "in-progress": return <Clock className="h-4 w-4" />;
      case "planned": return <Calendar className="h-4 w-4" />;
      case "future": return <Star className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-gray-400";
    }
  };

  const filterByCategory = (category: string) => {
    return roadmapItems.filter(item => item.category === category);
  };

  const filterByStatus = (status: string) => {
    return roadmapItems.filter(item => item.status === status);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Development Roadmap</h2>
        <p className="text-gray-400">
          Track our progress and upcoming features for Realm Rivalry
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="ui">UI/UX</TabsTrigger>
          <TabsTrigger value="backend">Backend</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmapItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-gray-700">
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`${getStatusColor(item.status)} text-white text-xs`}>
                              {getStatusIcon(item.status)}
                              <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                            </Badge>
                            <span className={`text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()} PRIORITY
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    
                    {item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                    
                    {item.estimatedCompletion && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                        <span className="text-sm text-gray-400">Target:</span>
                        <span className="text-sm font-medium text-white">{item.estimatedCompletion}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterByCategory("features").map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className={`${getStatusColor(item.status)} text-white text-xs mt-1`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    {item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterByCategory("ui").map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className={`${getStatusColor(item.status)} text-white text-xs mt-1`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    {item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="backend" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterByCategory("backend").map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className={`${getStatusColor(item.status)} text-white text-xs mt-1`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    {item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterByCategory("community").map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-gray-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className={`${getStatusColor(item.status)} text-white text-xs mt-1`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    {item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterByStatus("completed").map((item) => {
              const IconComponent = item.icon;
              return (
                <Card key={item.id} className="bg-gray-800 border-gray-700 opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-green-700">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <Badge className="bg-green-600 text-white text-xs mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4">
                      {item.description}
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-green-400 font-medium">100%</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}