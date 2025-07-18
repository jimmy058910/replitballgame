/**
 * PWA Install Prompt Component
 * Provides native app installation experience
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone;
    
    if (isStandalone || isInWebAppiOS) {
      return; // App is already installed
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Show prompt after user has interacted with the app
      setTimeout(() => {
        setIsVisible(true);
      }, 30000); // Wait 30 seconds before showing
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Don't show again for this session
    setIsInstallable(false);
  };

  if (!isVisible || !isInstallable) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Install Realm Rivalry</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-blue-100">
          Get the full app experience with offline features
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm">Works offline</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm">Faster loading</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm">Home screen shortcut</span>
        </div>
        <Button 
          onClick={handleInstallClick}
          className="w-full bg-white text-blue-600 hover:bg-gray-100"
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      </CardContent>
    </Card>
  );
};

export default PWAInstallPrompt;