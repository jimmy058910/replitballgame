import { useAuth } from "@/hooks/useAuth";
import MobileRosterHQ from "@/components/MobileRosterHQ";

export default function RosterHQ() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('RosterHQ Debug:', { isAuthenticated, isLoading });

  // Show mobile-first redesigned Roster HQ when authenticated
  if (isAuthenticated && !isLoading) {
    console.log('Rendering MobileRosterHQ component');
    return <MobileRosterHQ />;
  }

  if (isLoading) {
    console.log('Auth is still loading...');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Authentication...</div>
      </div>
    );
  }

  console.log('User not authenticated, showing login prompt');
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-3xl font-bold mb-6">Access Roster HQ</h1>
        <p className="text-gray-300 mb-8">Please log in to manage your team roster.</p>
      </div>
    </div>
  );
}