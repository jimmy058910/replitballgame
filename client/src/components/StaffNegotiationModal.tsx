import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface Staff {
  id: string;
  teamId: string;
  name: string;
  type: string;
  level: number;
  age: number;
  motivation: number;
  development: number;
  teaching: number;
  physiology: number;
}

interface StaffNegotiationModalProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffNegotiationModal({ staff, isOpen, onClose }: StaffNegotiationModalProps) {
  const [offerSalary, setOfferSalary] = useState(0);
  const [contractValue, setContractValue] = useState<any>(null);
  const [negotiationResult, setNegotiationResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contract value when staff is selected
  const { mutate: fetchContractValue, isPending: fetchingValue } = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await fetch(`/api/staff/${staffId}/contract-value`);
      if (!response.ok) throw new Error('Failed to fetch contract value');
      return response.json();
    },
    onSuccess: (data) => {
      setContractValue(data.data);
      setOfferSalary(data.data.marketValue);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch contract value",
        variant: "destructive"
      });
    }
  });

  // Submit negotiation
  const { mutate: submitNegotiation, isPending: negotiating } = useMutation({
    mutationFn: async ({ staffId, salary }: { staffId: string; salary: number }) => {
      const response = await fetch(`/api/staff/${staffId}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary })
      });
      if (!response.ok) throw new Error('Failed to negotiate contract');
      return response.json();
    },
    onSuccess: (data) => {
      setNegotiationResult(data.negotiationResult);
      if (data.success) {
        toast({
          title: "Negotiation Successful!",
          description: `${staff?.name} accepted the contract offer.`,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${staff?.teamId}/staff`] });
        setTimeout(() => onClose(), 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "Negotiation Failed",
        description: "Failed to submit contract offer",
        variant: "destructive"
      });
    }
  });

  // Initialize contract value when modal opens
  useEffect(() => {
    if (staff && isOpen) {
      fetchContractValue(staff.id);
      setNegotiationResult(null);
    }
  }, [staff, isOpen]);

  const handleSubmit = () => {
    if (!staff || !offerSalary) return;
    submitNegotiation({ staffId: staff.id, salary: offerSalary });
  };

  const adjustSalary = (amount: number) => {
    setOfferSalary(Math.max(1000, offerSalary + amount));
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

  if (!staff) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-green-900 to-green-800 border-2 border-green-400 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-green-300">
            <UserPlus className="w-6 h-6" />
            Contract Negotiation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Info */}
          <div className="bg-black/30 p-3 rounded border border-green-500">
            <h3 className="font-bold text-lg text-white">{staff.name}</h3>
            <p className="text-green-300">{getStaffTypeName(staff.type)}</p>
            <p className="text-gray-300 text-sm">Age {staff.age} • Level {staff.level}</p>
          </div>

          {/* Contract Value Info */}
          {contractValue && (
            <div className="bg-black/30 p-3 rounded border border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="font-semibold text-green-300">Market Value</span>
              </div>
              <p className="text-xl font-bold text-white">
                {contractValue.marketValue.toLocaleString()}₡/season
              </p>
              <p className="text-xs text-gray-400">
                Based on level and staff type
              </p>
            </div>
          )}

          {/* Salary Offer */}
          <div className="space-y-2">
            <Label className="text-green-300">Your Offer (₡/season)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={offerSalary}
                onChange={(e) => setOfferSalary(parseInt(e.target.value) || 0)}
                className="bg-black/50 border-green-500 text-white"
                min="1000"
                max="50000000"
              />
            </div>
            
            {/* Quick Adjust Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => adjustSalary(-1000)} className="flex-1 text-xs">
                  -1K
                </Button>
                <Button size="sm" variant="outline" onClick={() => adjustSalary(-100)} className="flex-1 text-xs">
                  -100
                </Button>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => adjustSalary(100)} className="flex-1 text-xs">
                  +100
                </Button>
                <Button size="sm" variant="outline" onClick={() => adjustSalary(1000)} className="flex-1 text-xs">
                  +1K
                </Button>
              </div>
            </div>
          </div>

          {/* Negotiation Result */}
          {negotiationResult && (
            <Alert className={`border-2 ${negotiationResult.accepted ? 'border-green-400 bg-green-900/30' : 'border-red-400 bg-red-900/30'}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-white">
                <strong>{negotiationResult.response}:</strong> {negotiationResult.message}
              </AlertDescription>
            </Alert>
          )}

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
              onClick={handleSubmit}
              disabled={negotiating || fetchingValue || !contractValue}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {negotiating ? 'Negotiating...' : 'Submit Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}