import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserX, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  type: string;
  level: number;
  age: number;
  motivation: number;
  development: number;
  teaching: number;
  physiology: number;
}

interface StaffReleaseConfirmationProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffReleaseConfirmation({ staff, isOpen, onClose }: StaffReleaseConfirmationProps) {
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current team finances to show remaining credits
  const { data: teamData } = useQuery({
    queryKey: ["/api/teams/my"],
    enabled: isOpen && !!staff,
  });

  // Release staff member
  const { mutate: releaseStaff, isPending: releasing } = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await fetch(`/api/staff/${staffId}/release`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to release staff member');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Staff Released",
        description: data.message,
      });
      // @ts-expect-error TS2339
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${staff?.teamId}/staff`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Release Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRelease = () => {
    if (!staff || !confirmed) return;
    releaseStaff(staff.id);
  };

  const getStaffTypeName = (type: string) => {
    const staffTypeMap: Record<string, string> = {
      'HEAD_COACH': 'Head Coach',
      'PASSER_TRAINER': 'Technical Trainer',
      'RUNNER_TRAINER': 'Speed Trainer',
      'BLOCKER_TRAINER': 'Strength Trainer',
      'RECOVERY_SPECIALIST': 'Recovery Specialist',
      'SCOUT': 'Scout'
    };
    return staffTypeMap[type] || type;
  };

  // Calculate estimated release fee (50% of market value)
  const estimatedReleaseFee = staff ? Math.round(staff.level * 1000 * 0.5) : 0;

  if (!staff) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-400 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-red-300">
            <UserX className="w-6 h-6" />
            Release Staff Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Info */}
          <div className="bg-black/30 p-3 rounded border border-red-500">
            <h3 className="font-bold text-lg text-white">{staff.name}</h3>
            <p className="text-red-300">{getStaffTypeName(staff.type)}</p>
            <p className="text-gray-300 text-sm">Age {staff.age} • Level {staff.level}</p>
          </div>

          {/* Release Fee Warning */}
          <Alert className="border-2 border-yellow-400 bg-yellow-900/30">
            <DollarSign className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-white">
              <strong>Release Fee:</strong> Approximately {estimatedReleaseFee.toLocaleString()}₡
              <br />
              <span className="text-yellow-300 text-sm">
                (50% of current market value will be deducted from team credits)
              </span>
            </AlertDescription>
          </Alert>

          {/* Current Credits */}
          {teamData && (
            <div className="bg-black/30 p-3 rounded border border-gray-500">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Current Credits:</span>
                <span className="text-white font-bold">
                  {(teamData as any)?.credits?.toLocaleString() || 0}₡
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">After Release:</span>
                <span className={`font-semibold ${((teamData as any)?.credits || 0) >= estimatedReleaseFee ? 'text-green-400' : 'text-red-400'}`}>
                  {(((teamData as any)?.credits || 0) - estimatedReleaseFee).toLocaleString()}₡
                </span>
              </div>
            </div>
          )}

          {/* Consequences Warning */}
          <Alert className="border-2 border-red-400 bg-red-900/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-white">
              <strong>Warning:</strong> This action cannot be undone. You will lose all benefits this staff member provides to your team.
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-black/30 rounded border border-gray-500">
            <input
              type="checkbox"
              id="confirm-release"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="confirm-release" className="text-sm text-white cursor-pointer">
              I understand the consequences and want to release {staff.name}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-500 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRelease}
              // @ts-expect-error TS2322
              disabled={!confirmed || releasing || (teamData && (teamData.credits || 0) < estimatedReleaseFee)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {releasing ? 'Releasing...' : 'Release Staff'}
            </Button>
          </div>

          {/*
           // @ts-expect-error TS2339 */}
          {teamData && (teamData.credits || 0) < estimatedReleaseFee && (
            <Alert className="border-2 border-red-400 bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-white">
                <strong>Insufficient Credits:</strong> You need {estimatedReleaseFee.toLocaleString()}₡ to release this staff member.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}