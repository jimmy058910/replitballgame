import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Package, Shield, Zap, Trophy, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  slot?: string;
  statBoosts?: any;
  quantity: number;
  acquiredAt: string;
  metadata?: any;
}

interface InventoryDisplayProps {
  teamId: string;
}

export default function InventoryDisplay({ teamId }: InventoryDisplayProps) {
  const [activeTab, setActiveTab] = useState("equipment");
  const [searchTerm, setSearchTerm] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [slotFilter, setSlotFilter] = useState("all");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'inventory'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/inventory`),
  });

  const { data: trophies } = useQuery({
    queryKey: ['/api/teams', teamId, 'trophies'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/trophies`),
  });

  const filterItems = (items: InventoryItem[], type: string) => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesType = item.type === type;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRarity = rarityFilter === "all" || item.rarity === rarityFilter;
      const matchesSlot = slotFilter === "all" || item.slot === slotFilter;
      
      return matchesType && matchesSearch && matchesRarity && matchesSlot;
    });
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity?.toLowerCase()) {
      case 'common':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'uncommon':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rare':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'epic':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'legendary':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatBonusText = (statBoosts: any): string => {
    if (!statBoosts || typeof statBoosts !== 'object') return '';
    
    const bonuses = Object.entries(statBoosts)
      .filter(([_, value]) => value && value !== 0)
      .map(([stat, value]) => `${stat}: ${value > 0 ? '+' : ''}${value}`)
      .join(', ');
    
    return bonuses;
  };

  const equipment = filterItems(inventory || [], 'equipment');
  const consumables = filterItems(inventory || [], 'consumable');
  const entries = filterItems(inventory || [], 'entry');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Team Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading inventory...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Team Inventory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={rarityFilter} onValueChange={setRarityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarity</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
              <Select value={slotFilter} onValueChange={setSlotFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  <SelectItem value="helmet">Helmet</SelectItem>
                  <SelectItem value="armor">Armor</SelectItem>
                  <SelectItem value="gloves">Gloves</SelectItem>
                  <SelectItem value="footwear">Footwear</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equipment" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Equipment ({equipment.length})
              </TabsTrigger>
              <TabsTrigger value="consumables" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Consumables ({consumables.length})
              </TabsTrigger>
              <TabsTrigger value="trophies" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Trophies ({trophies?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="space-y-3">
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No equipment found matching your criteria
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                          <Badge className={getRarityColor(item.rarity)}>
                            {item.rarity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{item.slot || 'Universal'}</Badge>
                          <span className="text-sm font-medium">Qty: {item.quantity}</span>
                        </div>
                        
                        {/* Race Restriction */}
                        {item.raceRestriction && item.raceRestriction !== 'UNIVERSAL' && (
                          <div className="text-sm">
                            <span className="font-medium text-blue-600">Race: </span>
                            <span className="text-blue-600">{item.raceRestriction}</span>
                          </div>
                        )}
                        
                        {/* Stat Effects */}
                        {item.statBoosts && (
                          <div className="text-sm">
                            <div className="font-medium text-green-600">
                              {getStatBonusText(item.statBoosts)}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">
                            Equip
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="consumables" className="space-y-3">
              {consumables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No consumables found matching your criteria
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {consumables.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                          <Badge className={getRarityColor(item.rarity)}>
                            {item.rarity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="text-sm font-medium">Qty: {item.quantity}</span>
                        </div>
                        
                        {/* Effect text with proper contrast */}
                        {item.effect && (
                          <div className="text-sm">
                            <span className="font-medium text-purple-600 dark:text-purple-400">Effect: </span>
                            <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                              {item.effect}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">
                            Use
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="trophies" className="space-y-3">
              {!trophies || trophies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No trophies earned yet. Win tournaments and competitions to earn trophies!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trophies.map((trophy: any) => (
                    <Card key={trophy.id} className="hover:shadow-md transition-shadow border-yellow-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{trophy.name}</CardTitle>
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trophy.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{trophy.type}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(trophy.earnedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}