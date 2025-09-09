import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import Navigation from "@/components/Navigation";
import DramaticTeamHQ from "@/components/DramaticTeamHQ";
import type { Team } from '@shared/types/models';


// Dashboard now exclusively uses DramaticTeamHQ component

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useUnifiedAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-blue-600 rounded w-64 mb-4" />
          <div className="h-4 bg-blue-500 rounded w-48" />
        </div>
      </div>
    );
  }

  // Show login prompt when not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="p-4 text-center">
          <p className="text-white">Please log in to access the Team HQ.</p>
        </div>
      </div>
    );
  }

  // ALWAYS show DramaticTeamHQ when authenticated - no exceptions
  return <DramaticTeamHQ />;
}