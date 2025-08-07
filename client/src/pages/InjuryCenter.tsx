import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import InjuryManagement from "@/components/InjuryManagement";
import { apiRequest } from "@/lib/queryClient"; // Import apiRequest
import type { Team } from "shared/schema"; // Import Team type

export default function InjuryCenter() {
  const { user } = useAuth();

  const teamQuery = useQuery({
    queryKey: ["myTeam"], // Consistent query key
    queryFn: (): Promise<Team> => apiRequest("/api/teams/my"),
    enabled: !!user,
  });
  const team = teamQuery.data as Team | undefined;
  const isLoadingTeam = teamQuery.isLoading;

  if (isLoadingTeam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-white mb-4">Injury Management</h1>
          <p className="text-gray-400">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-white mb-4">Injury Management</h1>
          <p className="text-gray-400">No team data found. Please create or select a team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Injury Management Center</h1>
        <p className="text-gray-400">Comprehensive injury tracking, treatment, and recovery system</p>
      </div>
      
      <InjuryManagement teamId={team.id} />
    </div>
  );
}