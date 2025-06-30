import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// Input, Label, Select components are not used in the provided fixed version, so commented out.
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Zap, Users, TrendingUp, Calendar, DollarSign, Wrench, Star, Coins, ArrowUp, Shield, Home, Gauge } from "lucide-react";
import type { Stadium as SharedStadium, FacilityUpgrade as SharedFacilityUpgrade, StadiumEvent as SharedStadiumEvent, Team, TeamFinances } from "shared/schema";

// Define interfaces for the page data
interface ClientStadium extends SharedStadium {}
interface ClientFacilityUpgrade extends SharedFacilityUpgrade {}
interface ClientStadiumEvent extends SharedStadiumEvent {}

interface StadiumPageData {
  stadium: ClientStadium;
  availableUpgrades: ClientFacilityUpgrade[];
  events: ClientStadiumEvent[];
}

interface UpgradePayload {
  upgradeType: string;
  upgradeName: string;
}

interface UserCreditsData {
  credits: number;
}

export default function Stadium() {
  const { toast } = useToast();
  const [selectedUpgrade, setSelectedUpgrade] = useState<ClientFacilityUpgrade | null>(null);

  const stadiumPageQuery = useQuery({
    queryKey: ["stadiumPageData"],
    queryFn: (): Promise<StadiumPageData> => apiRequest("/api/stadium/my"),
  });
  const stadiumData = stadiumPageQuery.data as StadiumPageData | undefined;
  const isLoadingStadium = stadiumPageQuery.isLoading;

  const financesQuery = useQuery({
    queryKey: ["myTeamFinances"],
    queryFn: (): Promise<UserCreditsData> => apiRequest("/api/teams/my/finances"),
  });
  const finances = financesQuery.data as UserCreditsData | undefined;

  const teamQuery = useQuery({
    queryKey: ["myTeam"],
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
  });

  const upgradeMutation = useMutation({
    mutationFn: async (upgradeDetails: UpgradePayload): Promise<void> => {
      return apiRequest<void>("/api/stadium/upgrade", "POST", upgradeDetails);
    },
    onSuccess: () => {
      toast({
        title: "Stadium Upgraded",
        description: "Your stadium has been successfully upgraded!",
      });
      queryClient.invalidateQueries({ queryKey: ["stadiumPageData"] });
      queryClient.invalidateQueries({ queryKey: ["myTeamFinances"] });
      setSelectedUpgrade(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Could not upgrade stadium",
        variant: "destructive",
      });
    },
  });

  const formatCredits = (amount: number | null | undefined) => {
    return `${(amount ?? 0).toLocaleString()} 💰`;
  };

  if (isLoadingStadium) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading stadium data...</div>
        </div>
      </div>
    );
  }

  const stadium = stadiumData?.stadium;
  const availableUpgrades = stadiumData?.availableUpgrades || [];
  const events = stadiumData?.events || [];

  const getFieldSizeDescription = (size: string | null | undefined) => {
    switch (size) {
      case "regulation": return "Standard field size";
      case "extended": return "Larger field with strategic advantages";
      case "compact": return "Smaller field for faster gameplay";
      default: return size || "N/A";
    }
  };

  const getSurfaceDescription = (surface: string | null | undefined) => {
    switch (surface) {
      case "grass": return "Natural grass surface";
      case "synthetic": return "All-weather synthetic surface";
      case "hybrid": return "Weather-resistant hybrid surface";
      default: return surface || "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-orbitron text-3xl font-bold mb-2">Stadium Management</h1>
          <p className="text-gray-400">Manage your stadium facilities and field configurations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {stadium?.name ?? 'Your Stadium'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stadium?.level ?? 0}</div>
                    <div className="text-sm text-gray-400">Stadium Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{(stadium?.capacity ?? 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Capacity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stadium?.homeAdvantage ?? 0}%</div>
                    <div className="text-sm text-gray-400">Home Advantage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{stadium?.revenueMultiplier ?? 0}%</div>
                    <div className="text-sm text-gray-400">Revenue Boost</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Field Configuration</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Size:</span>
                        <Badge variant="outline">{getFieldSizeDescription(stadium?.fieldSize)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Surface:</span>
                        <Badge variant="outline">{getSurfaceDescription(stadium?.surface)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lighting:</span>
                        <Badge variant="outline" className="capitalize">{stadium?.lighting ?? 'N/A'}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Stadium Stats</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Weather Resistance</span>
                          <span>{stadium?.weatherResistance ?? 0}%</span>
                        </div>
                        <Progress value={stadium?.weatherResistance ?? 0} className="h-2" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Maintenance Cost:</span>
                        <span className="text-red-400">${(stadium?.maintenanceCost ?? 0).toLocaleString()}/season</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Available Upgrades
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableUpgrades.length === 0 ? (
                  <p className="text-gray-400">No upgrades available at this time.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableUpgrades.map((upgrade: ClientFacilityUpgrade) => (
                      <div key={upgrade.id} className="border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{upgrade.name}</h4>
                          <Badge className="capitalize">{upgrade.upgradeType}</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{upgrade.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-yellow-400">{formatCredits(upgrade.cost)}</span>
                          <Button
                            size="sm"
                            onClick={() => setSelectedUpgrade(upgrade)}
                            disabled={(finances?.credits ?? 0) < upgrade.cost || upgradeMutation.isPending}
                          >
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-gray-400">No events scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {events.slice(0, 5).map((event: ClientStadiumEvent) => (
                      <div key={event.id} className="border-l-4 border-blue-500 pl-3">
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-gray-400">{event.eventType}</div>
                        <div className="text-sm text-green-400">
                          Revenue: ${(event.revenue ?? 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Stadium Finances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available Credits:</span>
                    <span className="font-bold text-green-400">
                      {formatCredits(finances?.credits)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Maintenance Cost:</span>
                    <span className="text-red-400">
                      ${(stadium?.maintenanceCost ?? 0).toLocaleString()}/season
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue Boost:</span>
                    <span className="text-blue-400">{stadium?.revenueMultiplier ?? 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedUpgrade && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="bg-gray-800 border-gray-700 w-96">
              <CardHeader>
                <CardTitle>Confirm Upgrade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">{selectedUpgrade.name}</h4>
                    <p className="text-sm text-gray-400">{selectedUpgrade.description}</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-bold text-yellow-400">
                      {formatCredits(selectedUpgrade.cost)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedUpgrade(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        // Ensure upgradeType and name are present before mutating
                        if (selectedUpgrade.upgradeType && selectedUpgrade.name) {
                           upgradeMutation.mutate({ upgradeType: selectedUpgrade.upgradeType, upgradeName: selectedUpgrade.name })
                        } else {
                           toast({title: "Error", description: "Upgrade details are incomplete.", variant: "destructive"})
                        }
                      }}
                      disabled={upgradeMutation.isPending}
                    >
                      {upgradeMutation.isPending ? "Upgrading..." : "Confirm"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}