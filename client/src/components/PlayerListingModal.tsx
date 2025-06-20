import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PlayerListingModalProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerListingModal({ player, isOpen, onClose }: PlayerListingModalProps) {
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("24");
  const { toast } = useToast();

  const listPlayerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/marketplace/list-player", {
        method: "POST",
        body: JSON.stringify({
          playerId: player.id,
          price: parseInt(price),
          duration: parseInt(duration)
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Player Listed",
        description: `${player.name} has been listed on the marketplace successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Listing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || parseInt(price) < 1000) {
      toast({
        title: "Invalid Price",
        description: "Minimum listing price is 1,000 credits",
        variant: "destructive",
      });
      return;
    }
    listPlayerMutation.mutate();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      Passer: "bg-blue-500",
      Runner: "bg-green-500",
      Interceptor: "bg-red-500",
      Defender: "bg-purple-500",
      Kicker: "bg-orange-500",
    };
    return colors[role as keyof typeof colors] || "bg-gray-500";
  };

  const listingFee = price ? Math.floor(parseInt(price) * 0.02) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>List Player for Sale</DialogTitle>
        </DialogHeader>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {player.race === "Human" && "👤"}
                {player.race === "Elf" && "🧝"}
                {player.race === "Dwarf" && "🧔"}
                {player.race === "Orc" && "👹"}
              </div>
              <div>
                <CardTitle className="text-lg">{player.name}</CardTitle>
                <CardDescription>
                  {player.race} • Age {player.age}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge className={`${getRoleColor(player.role)} text-white`}>
              {player.role}
            </Badge>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Leadership: {player.leadership}</div>
              <div>Throwing: {player.throwing}</div>
              <div>Speed: {player.speed}</div>
              <div>Agility: {player.agility}</div>
              <div>Power: {player.power}</div>
              <div>Stamina: {player.stamina}</div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="price">Listing Price (Credits)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Minimum 1,000 credits"
              min="1000"
              required
            />
            {listingFee > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Listing fee: {listingFee.toLocaleString()}₡ (2% of price)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="duration">Listing Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="48">48 Hours</SelectItem>
                <SelectItem value="72">72 Hours</SelectItem>
                <SelectItem value="168">1 Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-800 p-3 rounded-lg space-y-2 text-sm">
            <h4 className="font-semibold">Marketplace Rules:</h4>
            <ul className="space-y-1 text-gray-300">
              <li>• 2% listing fee charged upfront</li>
              <li>• 5% transaction fee from sale price</li>
              <li>• 1% penalty for early removal</li>
              <li>• Maximum 3 players listed at once</li>
              <li>• Team must have 10+ players to list</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={listPlayerMutation.isPending || !price}
              className="flex-1"
            >
              {listPlayerMutation.isPending ? "Listing..." : "List Player"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}