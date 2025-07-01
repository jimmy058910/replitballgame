import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Search, Store as StoreIcon } from "lucide-react";
import TryoutSystem from "@/components/TryoutSystem";
import DynamicMarketplaceManager from "@/components/DynamicMarketplaceManager";
import EnhancedGameEconomyManager from "@/components/EnhancedGameEconomyManager";

// Type interface for API response
interface Team {
  id: string;
  name: string;
  credits: number;
}

// Import existing components that will be moved here
// For now, using placeholders until we reorganize the content

// Placeholder components are no longer needed - using comprehensive system components

export default function Market() {
  const [activeTab, setActiveTab] = useState("marketplace");

  const { data: rawTeam } = useQuery<Team>({
    queryKey: ["/api/teams/my"],
  });

  // Type assertion to fix property access issue
  const team = (rawTeam || {}) as Team;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="h-8 w-8" />
            Market Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            All transactions - buy, sell, trade players and items
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="marketplace">Player Marketplace</TabsTrigger>
            <TabsTrigger value="recruiting">Recruiting</TabsTrigger>
            <TabsTrigger value="store">Store</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <DynamicMarketplaceManager teamId={team?.id} />
          </TabsContent>

          <TabsContent value="recruiting">
            <Card>
              <CardHeader>
                <CardTitle>Player Recruiting</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate new rookie players for your team
                </p>
              </CardHeader>
              <CardContent>
                <TryoutSystem teamId={team?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <EnhancedGameEconomyManager teamId={team?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}