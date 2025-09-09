import InjurySystem from "@/components/InjurySystem";
import type { Player } from '@shared/types/models';


export default function Injuries() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Player Health Center</h1>
          <p className="text-gray-300">Manage player injuries, recovery treatments, and medical staff</p>
        </div>
        <InjurySystem />
      </div>
    </div>
  );
}