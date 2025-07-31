import { useAuth } from "@/providers/AuthProvider";
import NotificationCenter from "@/components/NotificationCenter";

export default function Notifications() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-white mb-4">Notifications</h1>
          <p className="text-gray-400">Please log in to view notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
        <p className="text-gray-400">Stay updated with league events, match results, and important alerts</p>
      </div>
      
      <NotificationCenter />
    </div>
  );
}