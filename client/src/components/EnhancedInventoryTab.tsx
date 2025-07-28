import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Shield, 
  Zap, 
  Trophy,
  Ticket,
  Plus,
  X,
  Search,
  Filter,
  ChevronDown,
  Sparkles,
  Star
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface InventoryItem {
  id: string;
  itemType: 'equipment' | 'consumable' | 'boost' | 'trophy' | 'tournament_entry';
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  metadata: any;
  effect?: string;
  slot?: string;
}

interface TeamBoost {
  id: string;
  slotNumber: 1 | 2 | 3;
  itemId?: string;
  item?: InventoryItem;
}

interface EnhancedInventoryTabProps {
  teamId: string;
}

export function EnhancedInventoryTab({ teamId }: EnhancedInventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rarity');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory data
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['/api/inventory', teamId],
    queryFn: () => apiRequest(`/api/inventory/${teamId}`),
    enabled: !!teamId
  });

  // Fetch team boost slots
  const { data: teamBoosts } = useQuery({
    queryKey: ['/api/inventory/team-boosts', teamId],
    queryFn: () => apiRequest(`/api/inventory/${teamId}/team-boosts`),
    enabled: !!teamId
  });

  const inventoryItems = inventory as InventoryItem[] || [];
  const boostSlots = teamBoosts as TeamBoost[] || [
    { id: '1', slotNumber: 1 },
    { id: '2', slotNumber: 2 },
    { id: '3', slotNumber: 3 }
  ];

  // Assign boost mutation
  const assignBoostMutation = useMutation({
    mutationFn: ({ slotNumber, itemId }: { slotNumber: number; itemId: string }) =>
      apiRequest(`/api/inventory/${teamId}/team-boosts/${slotNumber}`, 'POST', { itemId }),
    onSuccess: () => {
      toast({
        title: "Boost Assigned",
        description: "Team boost has been assigned to slot successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/team-boosts', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Could not assign boost to slot.",
        variant: "destructive",
      });
    }
  });

  // Remove boost mutation
  const removeBoostMutation = useMutation({
    mutationFn: (slotNumber: number) =>
      apiRequest(`/api/inventory/${teamId}/team-boosts/${slotNumber}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Boost Removed",
        description: "Team boost has been removed from slot.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/team-boosts', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
    }
  });

  // Use item mutation
  const useItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/api/inventory/${teamId}/use/${itemId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Item Used",
        description: "Item has been used successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
      setIsDetailsOpen(false);
    },
    onError: () => {
      toast({
        title: "Usage Failed",
        description: "Could not use this item.",
        variant: "destructive",
      });
    }
  });

  // Filter options
  const categoryFilters = [
    { id: 'all', name: 'All', icon: Package },
    { id: 'equipment', name: 'Equipment', icon: Shield },
    { id: 'consumable', name: 'Consumables', icon: Zap },
    { id: 'boost', name: 'Boosts', icon: Sparkles },
    { id: 'trophy', name: 'Trophies', icon: Trophy },
    { id: 'tournament_entry', name: 'Entries', icon: Ticket }
  ];

  const sortOptions = [
    { value: 'rarity', label: 'Rarity' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'alphabetical', label: 'Alphabetical' }
  ];

  // Utility functions
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500 bg-yellow-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      case 'uncommon': return 'border-green-500 bg-green-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500 text-black';
      case 'epic': return 'bg-purple-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      case 'uncommon': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'equipment': return Shield;
      case 'consumable': return Zap;
      case 'boost': return Sparkles;
      case 'trophy': return Trophy;
      case 'tournament_entry': return Ticket;
      default: return Package;
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = inventoryItems
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.itemType === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rarity':
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const openItemDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const assignBoostToSlot = (slotNumber: number, itemId: string) => {
    assignBoostMutation.mutate({ slotNumber, itemId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Inventory</h2>
          <p className="text-gray-400">Manage your items and team boosts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Inventory Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map(category => {
              const IconComponent = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory === category.id 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "border-gray-700 text-gray-300 hover:bg-gray-800"
                  }
                >
                  <IconComponent className="w-4 h-4 mr-1" />
                  {category.name}
                </Button>
              );
            })}
          </div>

          {/* Item Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredAndSortedItems.map((item) => {
              const ItemTypeIcon = getItemTypeIcon(item.itemType);
              return (
                <div
                  key={item.id}
                  className={`relative bg-gray-800 rounded-lg border-2 cursor-pointer hover:scale-105 transition-all duration-200 ${getRarityColor(item.rarity)}`}
                  onClick={() => openItemDetails(item)}
                >
                  {/* Top-left item type badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-gray-900/80 backdrop-blur-sm rounded-full p-1">
                      <ItemTypeIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Bottom-right quantity badge */}
                  <div className="absolute bottom-2 right-2 z-10">
                    <Badge className="bg-gray-900/80 text-white text-xs px-1 py-0">
                      ×{item.quantity}
                    </Badge>
                  </div>

                  {/* Fixed 96x96px icon area */}
                  <div className="w-full h-24 flex items-center justify-center p-4">
                    <div className="text-3xl">
                      {item.itemType === 'equipment' && '⚔️'}
                      {item.itemType === 'consumable' && '🧪'}
                      {item.itemType === 'boost' && '✨'}
                      {item.itemType === 'trophy' && '🏆'}
                      {item.itemType === 'tournament_entry' && '🎫'}
                    </div>
                  </div>

                  {/* Item name and rarity */}
                  <div className="p-2 pt-0">
                    <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                    <Badge className={`${getRarityBadgeColor(item.rarity)} text-xs mt-1`}>
                      {item.rarity}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAndSortedItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">No items found</p>
            </div>
          )}
        </div>

        {/* Team Boost Slots Panel */}
        <div className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Team Boost Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {boostSlots.map((slot) => (
                <div key={slot.id} className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Slot {slot.slotNumber}/3
                  </label>
                  
                  {slot.item ? (
                    <div className="border-2 border-dashed border-blue-500 rounded-lg p-4 bg-blue-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✨</span>
                          <div>
                            <p className="text-sm font-medium text-white">{slot.item.name}</p>
                            <p className="text-xs text-gray-400">{slot.item.effect}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeBoostMutation.mutate(slot.slotNumber)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Sheet>
                      <SheetTrigger asChild>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors">
                          <Plus className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-400">Add Boost</p>
                        </div>
                      </SheetTrigger>
                      <SheetContent className="bg-gray-900 border-gray-700">
                        <SheetHeader>
                          <SheetTitle className="text-white">Select Boost for Slot {slot.slotNumber}</SheetTitle>
                          <SheetDescription className="text-gray-400">
                            Choose a boost item to assign to this slot
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-3 mt-6">
                          {inventoryItems
                            .filter(item => item.itemType === 'boost' && item.quantity > 0)
                            .map(boost => (
                              <div
                                key={boost.id}
                                className="border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
                                onClick={() => assignBoostToSlot(slot.slotNumber, boost.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">✨</span>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-white">{boost.name}</h4>
                                    <p className="text-sm text-gray-400">{boost.effect}</p>
                                    <p className="text-xs text-gray-500">Quantity: {boost.quantity}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Item Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="bg-gray-900 border-gray-700 w-full sm:max-w-md">
          {selectedItem && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {selectedItem.itemType === 'equipment' && '⚔️'}
                    {selectedItem.itemType === 'consumable' && '🧪'}
                    {selectedItem.itemType === 'boost' && '✨'}
                    {selectedItem.itemType === 'trophy' && '🏆'}
                    {selectedItem.itemType === 'tournament_entry' && '🎫'}
                  </span>
                  <div>
                    <SheetTitle className="text-white text-left">{selectedItem.name}</SheetTitle>
                    <Badge className={`${getRarityBadgeColor(selectedItem.rarity)} mt-1`}>
                      {selectedItem.rarity}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                <div>
                  <h4 className="font-medium text-white mb-2">Description</h4>
                  <p className="text-gray-400 text-sm">{selectedItem.description}</p>
                </div>

                {selectedItem.effect && (
                  <div>
                    <h4 className="font-medium text-white mb-2">Use Effect</h4>
                    <p className="text-blue-400 text-sm">{selectedItem.effect}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-white mb-2">Quantity</h4>
                  <p className="text-gray-400">You own: {selectedItem.quantity}</p>
                </div>

                {selectedItem.itemType === 'consumable' && (
                  <Button
                    onClick={() => useItemMutation.mutate(selectedItem.id)}
                    disabled={useItemMutation.isPending || selectedItem.quantity === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {useItemMutation.isPending ? 'Using...' : 'Use Item'}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default EnhancedInventoryTab;