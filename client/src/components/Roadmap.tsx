import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Calendar, Star } from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  status: "completed" | "in-progress" | "planned";
}

export default function Roadmap() {
  const roadmapItems: RoadmapItem[] = [
    {
      id: "naming-tokens",
      title: "Naming Tokens",
      status: "planned"
    },
    {
      id: "player-customization",
      title: "Player Customization",
      status: "planned"
    },
    {
      id: "staff-features",
      title: "Enhanced Staff Features",
      status: "in-progress"
    },
    {
      id: "game-simulation-upgrades",
      title: "Game Simulation Upgrades",
      status: "in-progress"
    },
    {
      id: "2d-visualization",
      title: "2D/2.5D Visualization",
      status: "planned"
    },
    {
      id: "global-ranking",
      title: "Global Ranking System",
      status: "completed"
    },
    {
      id: "hall-of-fame",
      title: "Hall of Fame",
      status: "completed"
    },
    {
      id: "friends-list",
      title: "Friends List & Social Features",
      status: "planned"
    },
    {
      id: "mobile-optimization",
      title: "Mobile App Optimization",
      status: "in-progress"
    },
    {
      id: "advanced-analytics",
      title: "Advanced Analytics",
      status: "planned"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "in-progress": return <Clock className="h-4 w-4 text-blue-400" />;
      case "planned": return <Calendar className="h-4 w-4 text-gray-400" />;
      default: return <Star className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Development Roadmap</h2>
        <p className="text-gray-400">What's coming to Realm Rivalry</p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Upcoming Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roadmapItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700/50">
                {getStatusIcon(item.status)}
                <span className="text-white font-medium">{item.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}