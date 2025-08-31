import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Users, Building2, TrendingUp } from "lucide-react";

interface RevenueCalculationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stadium?: {
    capacity: number;
    concessionsLevel: number;
    parkingLevel: number;
    vipSuitesLevel: number;
    merchandisingLevel: number;
    lightingScreensLevel: number;
  };
  team?: {
    fanLoyalty: number;
  };
}

export function RevenueCalculationsModal({ isOpen, onClose, stadium, team }: RevenueCalculationsModalProps) {
  // Calculate sample attendance (65% of capacity based on 50% fan loyalty)
  const sampleAttendance = Math.round((stadium?.capacity || 5000) * 0.65);
  
  // Revenue calculations based on replit.md formulas
  const calculations = {
    tickets: {
      formula: "ActualAttendance × 25₡",
      example: `${sampleAttendance.toLocaleString()} × 25₡`,
      result: sampleAttendance * 25
    },
    concessions: {
      formula: "ActualAttendance × 8₡ × ConcessionsLevel",
      example: `${sampleAttendance.toLocaleString()} × 8₡ × ${stadium?.concessionsLevel || 1}`,
      result: sampleAttendance * 8 * (stadium?.concessionsLevel || 1)
    },
    parking: {
      formula: "(ActualAttendance × 0.3) × 10₡ × ParkingLevel",
      example: `(${sampleAttendance.toLocaleString()} × 0.3) × 10₡ × ${stadium?.parkingLevel || 1}`,
      result: Math.round(sampleAttendance * 0.3) * 10 * (stadium?.parkingLevel || 1)
    },
    merchandise: {
      formula: "ActualAttendance × 3₡ × MerchandisingLevel",
      example: `${sampleAttendance.toLocaleString()} × 3₡ × ${stadium?.merchandisingLevel || 1}`,
      result: sampleAttendance * 3 * (stadium?.merchandisingLevel || 1)
    },
    vipSuites: {
      formula: "VIPSuitesLevel × 5000₡",
      example: `${stadium?.vipSuitesLevel || 1} × 5000₡`,
      result: (stadium?.vipSuitesLevel || 1) * 5000
    },
    atmosphereBonus: {
      formula: "Small credit bonus if FanLoyalty > 75%",
      example: team?.fanLoyalty && team.fanLoyalty > 75 ? "Active" : "Inactive",
      result: team?.fanLoyalty && team.fanLoyalty > 75 ? Math.round(sampleAttendance * 0.5) : 0
    }
  };

  const totalPerGame = Object.values(calculations).reduce((sum, calc) => sum + calc.result, 0);
  const seasonTotal = totalPerGame * 8; // 8 home games per season

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Calculator className="w-6 h-6 mr-2 text-green-400" />
            Revenue Breakdown & Analytics Calculations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Attendance Calculation */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 mr-2 text-blue-400" />
                Attendance Formula
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-gray-300">
                  <strong>Base Formula:</strong> StadiumCapacity × AttendanceRate
                </p>
                <p className="text-gray-300">
                  <strong>AttendanceRate:</strong> Primarily driven by FanLoyalty with small bonus for winning streaks
                </p>
                <div className="bg-blue-900/30 p-3 rounded-lg">
                  <p className="text-blue-200 font-semibold">Current Example:</p>
                  <p className="text-blue-100">
                    {stadium?.capacity?.toLocaleString() || 5000} capacity × ~65% rate = {sampleAttendance.toLocaleString()} attendance
                  </p>
                  <p className="text-blue-100 text-sm mt-1">
                    (Based on {team?.fanLoyalty || 50}% fan loyalty)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Streams */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Revenue Streams (Per Home Game)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ticket Sales */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">🎫 Ticket Sales</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.tickets.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.tickets.example}</p>
                  <Badge className="bg-green-600 text-white mt-2">
                    ₡{calculations.tickets.result.toLocaleString()}
                  </Badge>
                </div>

                {/* Concessions */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">🍿 Concessions</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.concessions.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.concessions.example}</p>
                  <Badge className="bg-green-600 text-white mt-2">
                    ₡{calculations.concessions.result.toLocaleString()}
                  </Badge>
                </div>

                {/* Parking */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">🚗 Parking</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.parking.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.parking.example}</p>
                  <Badge className="bg-green-600 text-white mt-2">
                    ₡{calculations.parking.result.toLocaleString()}
                  </Badge>
                </div>

                {/* Merchandise */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">👕 Merchandise</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.merchandise.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.merchandise.example}</p>
                  <Badge className="bg-green-600 text-white mt-2">
                    ₡{calculations.merchandise.result.toLocaleString()}
                  </Badge>
                </div>

                {/* VIP Suites */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">💎 VIP Suites</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.vipSuites.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.vipSuites.example}</p>
                  <Badge className="bg-purple-600 text-white mt-2">
                    ₡{calculations.vipSuites.result.toLocaleString()}
                  </Badge>
                </div>

                {/* Atmosphere Bonus */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">⚡ Atmosphere Bonus</h4>
                  <p className="text-gray-300 text-sm mb-2">{calculations.atmosphereBonus.formula}</p>
                  <p className="text-gray-400 text-sm">{calculations.atmosphereBonus.example}</p>
                  <Badge className={calculations.atmosphereBonus.result > 0 ? "bg-yellow-600 text-white mt-2" : "bg-gray-600 text-white mt-2"}>
                    {calculations.atmosphereBonus.result.toLocaleString()}₡
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="bg-gradient-to-r from-green-900 to-blue-900 border-green-700">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Revenue Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <h4 className="text-white font-semibold mb-2">Per Home Game</h4>
                  <div className="text-3xl font-bold text-green-400">
                    {totalPerGame.toLocaleString()}₡
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="text-white font-semibold mb-2">Full Season (8 games)</h4>
                  <div className="text-3xl font-bold text-blue-400">
                    {seasonTotal.toLocaleString()}₡
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-gray-300 text-sm">
                  <strong>Note:</strong> Actual revenue varies based on attendance fluctuations, 
                  winning streaks, and seasonal fan loyalty changes. Upgrade facilities to 
                  increase multipliers and base revenue per attendee.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Facility Impact */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Building2 className="w-5 h-5 mr-2 text-orange-400" />
                Facility Upgrade Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Concessions Level +1</span>
                  <span className="text-green-400">+{(sampleAttendance * 8).toLocaleString()}₡ per game</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Parking Level +1</span>
                  <span className="text-green-400">+{(Math.round(sampleAttendance * 0.3) * 10).toLocaleString()}₡ per game</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">VIP Suites Level +1</span>
                  <span className="text-purple-400">+₡5,000 per game</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Merchandising Level +1</span>
                  <span className="text-green-400">+₡{(sampleAttendance * 3).toLocaleString()} per game</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Lighting & Screens Level +1</span>
                  <span className="text-blue-400">+0.5% Fan Loyalty (indirect revenue boost)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}