import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import TacticsLineupHub from "@/components/TacticsLineupHub";
import type { Team } from '@shared/types/models';


type Team = {
  id: string;
  name: string;
};

export default function TacticsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Fetch user's team
  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/user/team"],
    enabled: isAuthenticated && !isLoading,
  });

  if (isLoading || teamLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 flex items-center justify-center">
        <div className="text-white text-xl">Loading Tactics...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-6">Access Tactics</h1>
          <p className="text-gray-300 mb-8">Please log in to manage your team tactics.</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-6">No Team Found</h1>
          <p className="text-gray-300 mb-8">You need a team to access tactics management.</p>
        </div>
      </div>
    );
  }

  return <TacticsLineupHub teamId={team.id} />;
}