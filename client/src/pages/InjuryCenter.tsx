import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import InjuryManagement from "@/components/InjuryManagement";

export default function InjuryCenter() {
  const { user } = useAuth();
  const { data: team } = useQuery({
    queryKey: ["/api/teams/my"],
    enabled: !!user,
  });

  if (!team) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-white mb-4">Injury Management</h1>
          <p className="text-gray-400">Loading team data...</p>
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