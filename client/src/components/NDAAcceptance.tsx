import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Lock, Eye } from "lucide-react";

interface NDAAcceptanceProps {
  accepted: boolean;
  onAcceptanceChange: (accepted: boolean) => void;
}

const NDAText = () => (
  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4">
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold mb-2">
        <AlertTriangle className="w-5 h-5" />
        PRE-ALPHA CONFIDENTIALITY NOTICE
      </div>
      <p className="text-red-700 dark:text-red-300">
        This is a legally binding Non-Disclosure Agreement (NDA) for access to confidential pre-alpha testing content. 
        Violation of this agreement may result in legal action.
      </p>
    </div>

    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">REALM RIVALRY PLAYTESTER NON-DISCLOSURE AGREEMENT</h3>
      
      <div className="space-y-2">
        <p><strong>Effective Date:</strong> July 16, 2025</p>
        <p><strong>Version:</strong> 1.0</p>
        <p><strong>Parties:</strong> You (the "Recipient") and Realm Rivalry Development Team (the "Disclosing Party")</p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1. CONFIDENTIAL INFORMATION</h4>
          <p>
            You acknowledge that you will have access to confidential and proprietary information including but not limited to:
            game mechanics, features, content, bugs, balance data, economic systems, unreleased features, 
            development roadmaps, and any other non-public information related to Realm Rivalry.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">2. NON-DISCLOSURE OBLIGATIONS</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>You agree not to disclose, publish, or share any confidential information with third parties</li>
            <li>You will not create content (streams, videos, screenshots, posts) showing game content without written permission</li>
            <li>You will not discuss specific game mechanics, features, or content on social media or public forums</li>
            <li>You will not reverse engineer, decompile, or attempt to extract proprietary information</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">3. TESTING OBLIGATIONS</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>You agree to provide constructive feedback through official channels only</li>
            <li>You understand this is pre-alpha software and may contain bugs or incomplete features</li>
            <li>You will not exploit bugs or gain unfair advantages for personal benefit</li>
            <li>You will report security vulnerabilities responsibly to the development team</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">4. DURATION</h4>
          <p>
            This agreement remains in effect until the game's official public release or until terminated by either party.
            Your confidentiality obligations survive termination of this agreement.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">5. CONSEQUENCES OF BREACH</h4>
          <p>
            Breach of this agreement may result in immediate termination of testing access and potential legal action.
            The Disclosing Party may seek injunctive relief and monetary damages for any violations.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">6. ELECTRONIC SIGNATURE</h4>
          <p>
            By checking the acceptance box below, you agree to be bound by the terms of this NDA and acknowledge
            that your electronic signature has the same legal effect as a handwritten signature.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export function NDAAcceptance({ accepted, onAcceptanceChange }: NDAAcceptanceProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Pre-Alpha NDA Required
          <Badge variant="destructive" className="ml-2">
            <Lock className="w-3 h-3 mr-1" />
            Confidential
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold">Testing Phase:</span> You are accessing confidential pre-alpha content
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="nda-acceptance"
            checked={accepted}
            onCheckedChange={(checked) => onAcceptanceChange(!!checked)}
          />
          <div className="flex-1 space-y-2">
            <label htmlFor="nda-acceptance" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              I have read and agree to the Non-Disclosure Agreement
            </label>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              This legally binding agreement protects confidential game content during pre-alpha testing.
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              Read Full NDA Agreement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <Shield className="w-5 h-5" />
                Realm Rivalry Pre-Alpha NDA
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full max-h-[60vh]">
              <NDAText />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}