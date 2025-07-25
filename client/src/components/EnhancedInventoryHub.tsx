import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Shield, 
  Zap, 
  Trophy, 
  Filter, 
  Search, 
  ChevronDown,
  Plus,
  X,
  Gamepad2,
  Crown,
  Star,
  Coins,
  Ticket,
  Activity,
  Info,
  Users
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  itemType: string;
  rarity: string;
  slot?: string;
  statBoosts?: Record<string, number>;
  raceRestriction?: string;
  effect?: string;
  quantity: number;
  acquiredAt?: string;
  metadata?: any;
  tier?: string;
}

interface EquippedBoost {
  id: string;
  itemId: string;
  itemName: string;
  effect: string;
  duration: number;
  slot: number;
}

interface EnhancedInventoryHubProps {
  teamId: string;
}

export default function EnhancedInventoryHub({ teamId }: EnhancedInventoryHubProps) {
  // State management
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [boostsPanelOpen, setBoostsPanelOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['/api/inventory', teamId],
    queryFn: () => apiRequest(`/api/inventory/${teamId}`),
    enabled: !!teamId,
  });

  const { data: equippedBoosts = [] } = useQuery<EquippedBoost[]>({
    queryKey: ['/api/teams', teamId, 'equipped-boosts'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/equipped-boosts`),
    enabled: !!teamId,
  });

  // Filter definitions
  const filterChips = [
    { id: 'all', name: 'All', icon: Package, count: inventory.length },
    { id: 'equipment', name: 'Equipment', icon: Shield, count: inventory.filter(i => i.itemType?.toLowerCase().includes('equipment')).length },
    { id: 'consumable', name: 'Consumables', icon: Zap, count: inventory.filter(i => i.itemType?.toLowerCase().includes('consumable')).length },
    { id: 'boost', name: 'Boosts', icon: Activity, count: inventory.filter(i => i.itemType?.toLowerCase().includes('boost')).length },
    { id: 'entry', name: 'Entries', icon: Ticket, count: inventory.filter(i => i.itemType?.toLowerCase().includes('entry')).length },
    { id: 'trophy', name: 'Trophies', icon: Trophy, count: inventory.filter(i => i.itemType?.toLowerCase().includes('trophy')).length },
  ];

  const rarityOptions = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
  const slotOptions = ['all', 'helmet', 'jersey', 'gloves', 'cleats', 'accessory'];

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    
    return inventory.filter((item: InventoryItem) => {
      // Quantity filter - only show items with quantity > 0
      if (item.quantity <= 0) return false;
      
      // Category filter
      if (selectedFilter !== 'all') {
        const itemType = item.itemType?.toLowerCase() || '';
        if (!itemType.includes(selectedFilter)) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(searchLower);
        const descMatch = item.description?.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) return false;
      }
      
      // Rarity filter
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      
      // Slot filter
      if (slotFilter !== 'all' && item.slot !== slotFilter) return false;
      
      return true;
    });
  }, [inventory, selectedFilter, searchTerm, rarityFilter, slotFilter]);

  // Helper functions
  const getRarityColor = (rarity: string): string => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'border-orange-500 bg-orange-500/10';
      case 'epic': return 'border-purple-500 bg-purple-500/10';
      case 'rare': return 'border-blue-500 bg-blue-500/10';
      case 'uncommon': return 'border-green-500 bg-green-500/10';
      case 'common': 
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getRarityBadgeColor = (rarity: string): string => {
    switch (rarity?.toLowerCase()) {
      case 'legendary': return 'bg-orange-600 text-white';
      case 'epic': return 'bg-purple-600 text-white';
      case 'rare': return 'bg-blue-600 text-white';
      case 'uncommon': return 'bg-green-600 text-white';
      case 'common': 
      default: return 'bg-gray-600 text-white';
    }
  };

  const getItemIcon = (item: InventoryItem): string => {
    const itemType = item.itemType?.toLowerCase() || '';
    const slot = item.slot?.toLowerCase() || '';
    
    if (itemType.includes('trophy')) return '🏆';
    if (itemType.includes('entry') || itemType.includes('ticket')) return '🎫';
    if (itemType.includes('boost')) return '⚡';
    if (slot.includes('helmet')) return '🪖';
    if (slot.includes('jersey')) return '👕';
    if (slot.includes('gloves')) return '🧤';
    if (slot.includes('cleats')) return '👟';
    if (itemType.includes('consumable')) return '🧪';
    return '📦';
  };

  const getItemTypeIcon = (item: InventoryItem): string => {
    const itemType = item.itemType?.toLowerCase() || '';
    
    if (itemType.includes('boost')) return '⚡';
    if (itemType.includes('consumable')) return '🧪';
    if (itemType.includes('equipment')) return '🛡️';
    if (itemType.includes('entry') || itemType.includes('ticket')) return '🎫';
    if (itemType.includes('trophy')) return '🏆';
    return '📦';
  };

  // Mutations
  const equipItemMutation = useMutation({
    mutationFn: (itemId: string) => 
      apiRequest(`/api/inventory/${teamId}/equip/${itemId}`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Item Equipped!",
        description: "Item has been equipped to your team.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'equipped-boosts'] });
    },
    onError: () => {
      toast({
        title: "Equipment Failed",
        description: "Unable to equip item. Check slot availability.",
        variant: "destructive",
      });
    },
  });

  const useItemMutation = useMutation({
    mutationFn: (data: { itemId: string; quantity: number }) => 
      apiRequest(`/api/inventory/${teamId}/use`, 'POST', data),
    onSuccess: (_, variables) => {
      toast({
        title: "Item Used!",
        description: `${variables.quantity}× ${selectedItem?.name} used successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
    },
    onError: () => {
      toast({
        title: "Use Failed",
        description: "Unable to use item.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/30 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Team Inventory</h2>
            <p className="text-gray-300">
              Manage equipment, consumables, and boosts for your team
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-purple-400 border-purple-400">
              {filteredItems.length} Items
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBoostsPanelOpen(!boostsPanelOpen)}
              className="md:hidden"
            >
              <Activity className="h-4 w-4 mr-2" />
              Boosts
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Filters & Items */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filter & Sort Bar */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {filterChips.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = selectedFilter === filter.id;
                  return (
                    <Button
                      key={filter.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter(filter.id)}
                      className={`h-10 min-w-[44px] ${
                        isActive 
                          ? "bg-purple-600 hover:bg-purple-700 text-white" 
                          : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                      }`}
                      aria-label={`Filter by ${filter.name}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {filter.name}
                      <Badge 
                        className="ml-2 bg-gray-600 text-gray-200 text-xs"
                        aria-label={`${filter.count} items`}
                      >
                        {filter.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {/* Search and Secondary Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white h-10"
                    aria-label="Search inventory items"
                  />
                </div>
                
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="h-10 px-3 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                  aria-label="Filter by rarity"
                >
                  {rarityOptions.map(rarity => (
                    <option key={rarity} value={rarity}>
                      {rarity === 'all' ? 'All Rarities' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="h-10 px-3 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                  aria-label="Filter by equipment slot"
                >
                  {slotOptions.map(slot => (
                    <option key={slot} value={slot}>
                      {slot === 'all' ? 'All Slots' : slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Item Grid */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-24 h-24 bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No Items Found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? "Try adjusting your search or filters" : "Your inventory is empty"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredItems.map((item) => (
                    <Card
                      key={item.id}
                      className={`w-24 h-24 cursor-pointer hover:scale-105 transition-all duration-200 ${getRarityColor(item.rarity)} border-2`}
                      onClick={() => {
                        setSelectedItem(item);
                        setDetailsOpen(true);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.name} - ${item.quantity} available`}
                    >
                      <CardContent className="p-1 h-full flex flex-col items-center justify-center relative">
                        {/* Top-left Item Type Badge */}
                        <Badge className="absolute top-1 left-1 bg-blue-600 text-white text-xs w-5 h-5 p-0 flex items-center justify-center rounded-md">
                          {getItemTypeIcon(item)}
                        </Badge>
                        
                        {/* Item Icon */}
                        <div className="text-2xl mb-1 mt-2">
                          {getItemIcon(item)}
                        </div>
                        
                        {/* Bottom-right Quantity Badge */}
                        {item.quantity > 1 && (
                          <Badge className="absolute bottom-1 right-1 bg-gray-900 text-white text-xs min-w-[18px] h-5 p-0 flex items-center justify-center rounded-md font-medium">
                            {item.quantity}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Equipped Boosts (Desktop) */}
        <div className="hidden lg:block">
          <Card className="bg-gray-800 border-gray-700 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-300">
                <Activity className="h-5 w-5" />
                Team Boost Slots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => {
                const boost = equippedBoosts[index];
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 border-dashed min-h-[80px] relative ${
                      boost 
                        ? "border-purple-500 bg-purple-500/10" 
                        : "border-gray-600 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer transition-colors"
                    }`}
                    onClick={() => {
                      if (!boost) {
                        // TODO: Open boost selection modal/drawer
                        toast({
                          title: "Add Boost",
                          description: "Boost selection feature coming soon!",
                        });
                      }
                    }}
                  >
                    <div className="absolute top-2 left-2 text-xs text-gray-400">
                      Slot {index + 1}/3
                    </div>
                    {boost ? (
                      <div className="pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-white text-sm">{boost.itemName}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Remove boost functionality
                              toast({
                                title: "Remove Boost",
                                description: "Boost removal feature coming soon!",
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{boost.effect}</p>
                      </div>
                    ) : (
                      <div className="text-center pt-4">
                        <Plus className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 font-medium">+ Add Boost</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Boosts Panel */}
      <div className="lg:hidden">
        <Collapsible open={boostsPanelOpen} onOpenChange={setBoostsPanelOpen}>
          <CollapsibleTrigger asChild>
            <Card className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-purple-300">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Team Boost Slots
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${boostsPanelOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => {
                  const boost = equippedBoosts[index];
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 border-dashed min-h-[80px] relative ${
                        boost 
                          ? "border-purple-500 bg-purple-500/10" 
                          : "border-gray-600 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer transition-colors"
                      }`}
                      onClick={() => {
                        if (!boost) {
                          // TODO: Open boost selection modal/drawer
                          toast({
                            title: "Add Boost",
                            description: "Boost selection feature coming soon!",
                          });
                        }
                      }}
                    >
                      <div className="absolute top-2 left-2 text-xs text-gray-400">
                        Slot {index + 1}/3
                      </div>
                      {boost ? (
                        <div className="pt-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-white text-sm">{boost.itemName}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Remove boost functionality
                                toast({
                                  title: "Remove Boost",
                                  description: "Boost removal feature coming soon!",
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{boost.effect}</p>
                        </div>
                      ) : (
                        <div className="text-center pt-4">
                          <Plus className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                          <p className="text-xs text-gray-500 font-medium">+ Add Boost</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Item Details Drawer/Dialog */}
      {selectedItem && (
        <>
          {/* Mobile Drawer */}
          <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DrawerContent className="bg-gray-800 border-gray-700 lg:hidden">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2 text-white">
                  <span className="text-2xl">{getItemIcon(selectedItem)}</span>
                  {selectedItem.name}
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                <ItemDetails 
                  item={selectedItem} 
                  onEquip={() => equipItemMutation.mutate(selectedItem.id)}
                  onUse={(quantity) => useItemMutation.mutate({ itemId: selectedItem.id, quantity })}
                  isEquipping={equipItemMutation.isPending}
                  isUsing={useItemMutation.isPending}
                />
              </div>
            </DrawerContent>
          </Drawer>

          {/* Desktop Dialog */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="bg-gray-800 border-gray-700 hidden lg:block">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <span className="text-2xl">{getItemIcon(selectedItem)}</span>
                  {selectedItem.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <ItemDetails 
                  item={selectedItem} 
                  onEquip={() => equipItemMutation.mutate(selectedItem.id)}
                  onUse={(quantity) => useItemMutation.mutate({ itemId: selectedItem.id, quantity })}
                  isEquipping={equipItemMutation.isPending}
                  isUsing={useItemMutation.isPending}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// Item Details Component
interface ItemDetailsProps {
  item: InventoryItem;
  onEquip: () => void;
  onUse: (quantity: number) => void;
  isEquipping: boolean;
  isUsing: boolean;
}

function ItemDetails({ item, onEquip, onUse, isEquipping, isUsing }: ItemDetailsProps) {
  const [useQuantity, setUseQuantity] = useState(1);

  const canEquip = item.itemType?.toLowerCase().includes('equipment') || item.slot;
  const canUse = item.itemType?.toLowerCase().includes('consumable') || item.itemType?.toLowerCase().includes('boost');

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={getRarityBadgeColor(item.rarity)}>
            {item.rarity?.toUpperCase()}
          </Badge>
          {item.slot && (
            <Badge className="bg-gray-600 text-gray-200">
              {item.slot}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Quantity:</span>
          <span className="text-white font-medium">{item.quantity}</span>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-sm">{item.description}</p>
        </div>
      )}

      {/* Stat Boosts */}
      {item.statBoosts && Object.keys(item.statBoosts).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-white">Stat Bonuses:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(item.statBoosts).map(([stat, value]) => (
              <div key={stat} className="flex justify-between items-center p-2 bg-green-900/20 border border-green-500/30 rounded">
                <span className="text-green-300 text-sm capitalize">{stat}:</span>
                <span className="text-green-400 font-medium">+{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Race Restriction */}
      {item.raceRestriction && (
        <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded">
          <div className="flex items-center gap-2 text-purple-300">
            <span className="font-medium">Race Restriction:</span>
            <span className="capitalize">{item.raceRestriction}</span>
          </div>
        </div>
      )}

      {/* Effect */}
      {item.effect && (
        <div className="space-y-2">
          <h4 className="font-medium text-white">Effect:</h4>
          <p className="text-gray-300 text-sm bg-gray-700 p-3 rounded">{item.effect}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        {canEquip && (
          <Button
            onClick={onEquip}
            disabled={isEquipping}
            className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
          >
            {isEquipping ? "Equipping..." : "Equip Item"}
          </Button>
        )}
        
        {canUse && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max={item.quantity}
                value={useQuantity}
                onChange={(e) => setUseQuantity(parseInt(e.target.value) || 1)}
                className="flex-1 bg-gray-700 border-gray-600 text-white"
              />
              <Button
                onClick={() => onUse(useQuantity)}
                disabled={isUsing || useQuantity < 1 || useQuantity > item.quantity}
                className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] px-6"
              >
                {isUsing ? "Using..." : "Use"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getRarityBadgeColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'legendary': return 'bg-orange-600 text-white';
    case 'epic': return 'bg-purple-600 text-white';
    case 'rare': return 'bg-blue-600 text-white';
    case 'uncommon': return 'bg-green-600 text-white';
    case 'common': 
    default: return 'bg-gray-600 text-white';
  }
}