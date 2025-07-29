import React, { useState, useEffect } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Star,
  Save,
  RotateCcw,
  AlertTriangle,
  Info
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
  isEquipped?: boolean;
  duration?: string;
  category?: string;
}

interface TeamBoost {
  id: string;
  slotNumber: 1 | 2 | 3;
  itemId?: string;
  item?: InventoryItem;
}

interface BoostConfiguration {
  slot1: string | null;
  slot2: string | null;
  slot3: string | null;
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [boostConfiguration, setBoostConfiguration] = useState<BoostConfiguration>({
    slot1: null,
    slot2: null,
    slot3: null
  });
  
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

  // Load boost configuration from current team boosts
  useEffect(() => {
    if (boostSlots) {
      setBoostConfiguration({
        slot1: boostSlots.find(slot => slot.slotNumber === 1)?.itemId || null,
        slot2: boostSlots.find(slot => slot.slotNumber === 2)?.itemId || null,
        slot3: boostSlots.find(slot => slot.slotNumber === 3)?.itemId || null
      });
    }
  }, [boostSlots]);

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

  // Save boost configuration mutation
  const saveBoostsMutation = useMutation({
    mutationFn: (configuration: BoostConfiguration) =>
      apiRequest(`/api/inventory/${teamId}/team-boosts/save`, 'POST', configuration),
    onSuccess: () => {
      toast({
        title: "Team Boosts Saved",
        description: "Your team boost configuration has been saved successfully!",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/team-boosts', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory', teamId] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save team boost configuration.",
        variant: "destructive",
      });
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

  // Enhanced item quantity display - fixes "x0" issue when equipped
  const getDisplayQuantity = (item: InventoryItem) => {
    if (item.isEquipped && item.quantity > 0) {
      return `${item.quantity - 1} + 1 Applied`;
    }
    return item.quantity.toString();
  };

  // Enhanced item tooltips with detailed information
  const getItemTooltipContent = (item: InventoryItem) => ({
    title: item.name,
    rarity: item.rarity,
    description: item.description,
    effect: item.effect || "No special effect",
    duration: item.duration || null,
    category: item.itemType,
    isEquipped: item.isEquipped || false,
    quantity: item.quantity
  });

  // Save boost configuration
  const saveBoostConfiguration = () => {
    saveBoostsMutation.mutate(boostConfiguration);
  };

  // Clear all boosts
  const clearAllBoosts = () => {
    setBoostConfiguration({ slot1: null, slot2: null, slot3: null });
    setHasUnsavedChanges(true);
  };

  // Update boost configuration
  const updateBoostSlot = (slotKey: keyof BoostConfiguration, itemId: string | null) => {
    setBoostConfiguration(prev => ({ ...prev, [slotKey]: itemId }));
    setHasUnsavedChanges(true);
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

          {/* Enhanced Item Grid with Comprehensive Tooltips */}
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAndSortedItems.map((item) => {
                const ItemTypeIcon = getItemTypeIcon(item.itemType);
                const tooltipData = getItemTooltipContent(item);
                const displayQuantity = getDisplayQuantity(item);
                
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative bg-gray-800 rounded-lg border-2 cursor-pointer hover:scale-105 transition-all duration-200 shadow-lg ${getRarityColor(item.rarity)}`}
                        onClick={() => openItemDetails(item)}
                      >
                        {/* Top-left item type badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-gray-900/90 backdrop-blur-sm rounded-full p-1.5">
                            <ItemTypeIcon className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        {/* Equipped indicator */}
                        {item.isEquipped && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="bg-green-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                              Applied
                            </div>
                          </div>
                        )}

                        {/* Bottom-right enhanced quantity badge */}
                        <div className="absolute bottom-2 right-2 z-10">
                          <Badge className={`text-white text-xs px-2 py-0.5 ${
                            item.quantity === 0 ? 'bg-red-600' : 
                            item.isEquipped ? 'bg-blue-600' : 'bg-gray-700'
                          }`}>
                            {item.isEquipped && item.quantity > 1 ? `${item.quantity - 1} + 1` : `×${item.quantity}`}
                          </Badge>
                        </div>

                        {/* Fixed 96x96px icon area with enhanced visuals */}
                        <div className="w-full h-24 flex items-center justify-center p-4">
                          <div className="text-4xl filter drop-shadow-lg">
                            {item.itemType === 'equipment' && '⚔️'}
                            {item.itemType === 'consumable' && '🧪'}
                            {item.itemType === 'boost' && '✨'}
                            {item.itemType === 'trophy' && '🏆'}
                            {item.itemType === 'tournament_entry' && '🎫'}
                          </div>
                        </div>

                        {/* Item name and rarity */}
                        <div className="p-3 pt-0">
                          <h4 className="text-sm font-medium text-white truncate mb-1">{item.name}</h4>
                          <Badge className={`${getRarityBadgeColor(item.rarity)} text-xs`}>
                            {item.rarity}
                          </Badge>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-80 p-4 bg-gray-900 border-gray-700"
                      side="top"
                    >
                      <div className="space-y-3">
                        {/* Header with icon and name */}
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {item.itemType === 'equipment' && '⚔️'}
                            {item.itemType === 'consumable' && '🧪'}
                            {item.itemType === 'boost' && '✨'}
                            {item.itemType === 'trophy' && '🏆'}
                            {item.itemType === 'tournament_entry' && '🎫'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{tooltipData.title}</h4>
                            <Badge className={`${getRarityBadgeColor(tooltipData.rarity)} text-xs`}>
                              {tooltipData.rarity}
                            </Badge>
                          </div>
                        </div>

                        {/* Effect Description */}
                        <div>
                          <h5 className="text-sm font-medium text-blue-400 mb-1">Effect:</h5>
                          <p className="text-sm text-gray-300">{tooltipData.effect}</p>
                          {tooltipData.duration && (
                            <p className="text-xs text-gray-400 mt-1">Duration: {tooltipData.duration}</p>
                          )}
                        </div>

                        {/* Usage Information */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Owned: <span className="text-white">{tooltipData.quantity}</span></span>
                          <span className="text-gray-400">Type: <span className="text-white capitalize">{tooltipData.category}</span></span>
                        </div>

                        {/* Status and Actions */}
                        {tooltipData.isEquipped && (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            Currently Applied to Team
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          </div>

          {filteredAndSortedItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">No items found</p>
            </div>
          )}
        </div>

        {/* Enhanced Team Boost Slots Panel */}
        <div className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Team Boosts for Next League Match
                </div>
                <div className="text-sm text-gray-400">
                  Slots: {Object.values(boostConfiguration).filter(Boolean).length}/3 Used
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Boost Slots */}
              {[1, 2, 3].map((slotNumber) => {
                const slotKey = `slot${slotNumber}` as keyof BoostConfiguration;
                const assignedItemId = boostConfiguration[slotKey];
                const assignedItem = assignedItemId ? 
                  inventoryItems.find(item => item.id === assignedItemId) : null;
                
                return (
                  <div key={slotNumber} className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Slot {slotNumber}/3
                    </label>
                    
                    {assignedItem ? (
                      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-500/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">✨</span>
                            <div>
                              <p className="text-sm font-medium text-white">{assignedItem.name}</p>
                              <p className="text-xs text-blue-400">{assignedItem.effect || "Boost effect"}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateBoostSlot(slotKey, null)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title="Remove Boost"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Sheet>
                        <SheetTrigger asChild>
                          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors min-h-[80px] flex flex-col items-center justify-center">
                            <Plus className="w-6 h-6 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-400">Add Boost</p>
                          </div>
                        </SheetTrigger>
                        <SheetContent className="bg-gray-900 border-gray-700 w-96">
                          <SheetHeader>
                            <SheetTitle className="text-white">Select Boost for Slot {slotNumber}</SheetTitle>
                            <SheetDescription className="text-gray-400">
                              Choose a boost item to assign to this slot
                            </SheetDescription>
                          </SheetHeader>
                          <div className="space-y-3 mt-6 max-h-96 overflow-y-auto">
                            {inventoryItems
                              .filter(item => item.itemType === 'boost' && item.quantity > 0)
                              .map(boost => (
                                <Card
                                  key={boost.id}
                                  className="cursor-pointer hover:bg-gray-800 transition-colors"
                                  onClick={() => {
                                    updateBoostSlot(slotKey, boost.id);
                                  }}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">✨</span>
                                      <div className="flex-1">
                                        <h4 className="text-white font-medium">{boost.name}</h4>
                                        <p className="text-sm text-gray-400">{boost.effect || "Boost effect"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge className={getRarityBadgeColor(boost.rarity)}>
                                            {boost.rarity}
                                          </Badge>
                                          <span className="text-xs text-gray-500">×{boost.quantity}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            
                            {inventoryItems.filter(item => item.itemType === 'boost' && item.quantity > 0).length === 0 && (
                              <div className="text-center py-8">
                                <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-400">No boost items available</p>
                                <p className="text-sm text-gray-500 mt-2">
                                  Purchase boost items from the Store to assign them here
                                </p>
                              </div>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>
                );
              })}

              {/* Enhanced Save Controls */}
              <div className="pt-4 border-t border-gray-700">
                <div className="space-y-3">
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-orange-400 text-sm bg-orange-400/10 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4" />
                      You have unsaved changes to your team boosts
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={saveBoostConfiguration}
                      disabled={!hasUnsavedChanges || saveBoostsMutation.isPending}
                      className={`flex-1 ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : 'bg-gray-600'}`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveBoostsMutation.isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Boosts Saved'}
                    </Button>
                    
                    <Button
                      variant="outline" 
                      onClick={clearAllBoosts}
                      disabled={Object.values(boostConfiguration).every(slot => !slot)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Item Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="bg-gray-900 border-gray-700 w-96">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-white">
                  <div className="text-2xl">
                    {selectedItem.itemType === 'equipment' && '⚔️'}
                    {selectedItem.itemType === 'consumable' && '🧪'}
                    {selectedItem.itemType === 'boost' && '✨'}
                    {selectedItem.itemType === 'trophy' && '🏆'}
                    {selectedItem.itemType === 'tournament_entry' && '🎫'}
                  </div>
                  <div>
                    <div>{selectedItem.name}</div>
                    <Badge className={`${getRarityBadgeColor(selectedItem.rarity)} mt-1`}>
                      {selectedItem.rarity}
                    </Badge>
                  </div>
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  {selectedItem.description}
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {selectedItem.effect && (
                  <div>
                    <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      Use Effect
                    </h4>
                    <p className="text-blue-400 text-sm bg-blue-400/10 rounded-lg p-3">{selectedItem.effect}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-white mb-3">Item Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quantity:</span>
                      <span className="text-white">{getDisplayQuantity(selectedItem)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white capitalize">{selectedItem.itemType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rarity:</span>
                      <Badge className={getRarityBadgeColor(selectedItem.rarity)}>
                        {selectedItem.rarity}
                      </Badge>
                    </div>
                    {selectedItem.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white">{selectedItem.duration}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedItem.isEquipped && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Currently Applied to Team
                    </div>
                  </div>
                )}

                {selectedItem.itemType === 'consumable' && !selectedItem.isEquipped && (
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