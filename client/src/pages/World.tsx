import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, TrendingUp, Users, Search } from "lucide-react";
import LeagueStandings from "@/components/LeagueStandings";

function DivisionsView() {
  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Divisions Overview</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View standings for all divisions across the game world
          </p>
        </CardHeader>
        <CardContent>
          <LeagueStandings division={team?.division || 8} />
        </CardContent>
      </Card>
    </div>
  );
}

function Leaderboards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Player Stats Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Top performers across all divisions will be shown here. 
              This will include scoring leaders, passing leaders, defensive leaders, etc.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Stats Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Best performing teams across the game world.
              Win percentages, offensive/defensive rankings, etc.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Lookup() {
  const [searchType, setSearchType] = useState("player");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Global Search
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search for any player or team in the game world
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setSearchType("player")}
                className={`px-4 py-2 rounded ${
                  searchType === "player"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Search Players
              </button>
              <button
                onClick={() => setSearchType("team")}
                className={`px-4 py-2 rounded ${
                  searchType === "team"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Search Teams
              </button>
            </div>
            
            <input
              type="text"
              placeholder={`Search for ${searchType}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            />
            
            <div className="text-gray-600 dark:text-gray-400">
              {searchType === "player" 
                ? "Search functionality for players will allow you to view any player's public profile and stats."
                : "Search functionality for teams will show team records, rosters, and public information."
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function World() {
  const [activeTab, setActiveTab] = useState("divisions");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Globe className="h-8 w-8" />
            World Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The global view of all divisions, leaderboards, and player/team lookup
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="divisions">Divisions</TabsTrigger>
            <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
            <TabsTrigger value="lookup">Lookup</TabsTrigger>
          </TabsList>

          <TabsContent value="divisions">
            <DivisionsView />
          </TabsContent>

          <TabsContent value="leaderboards">
            <Leaderboards />
          </TabsContent>

          <TabsContent value="lookup">
            <Lookup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}