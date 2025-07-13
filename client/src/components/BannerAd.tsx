import React, { useEffect, useState } from 'react';
import { UnityAdsService } from '@/services/UnityAdsService';

interface BannerAdProps {
  className?: string;
  placement?: 'top' | 'bottom' | 'sidebar';
}

export function BannerAd({ className = '', placement = 'bottom' }: BannerAdProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const initializeBanner = async () => {
      try {
        const unityAdsService = UnityAdsService.getInstance();
        await unityAdsService.initialize();
        
        if (unityAdsService.isReady('banner')) {
          setIsAdLoaded(true);
        }
      } catch (error) {
        console.error('Banner ad initialization error:', error);
      }
    };

    initializeBanner();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const getPlacementClasses = () => {
    switch (placement) {
      case 'top':
        return 'top-0 left-0 right-0';
      case 'bottom':
        return 'bottom-0 left-0 right-0';
      case 'sidebar':
        return 'right-0 top-1/2 transform -translate-y-1/2';
      default:
        return 'bottom-0 left-0 right-0';
    }
  };

  return (
    <div className={`fixed ${getPlacementClasses()} z-40 ${className}`}>
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 border-t border-purple-500 p-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            {isAdLoaded ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white text-sm">Unity Ads</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-300 text-sm">Ad Loading...</span>
              </div>
            )}
            
            <div 
              className="bg-gray-800 rounded border border-gray-600 p-4 min-w-[300px] text-center"
              style={{ height: placement === 'sidebar' ? '250px' : '60px' }}
            >
              {isAdLoaded ? (
                <div className="text-white text-sm">
                  <div className="font-semibold">Unity Banner Ad</div>
                  <div className="text-xs text-gray-300 mt-1">
                    {placement === 'sidebar' ? '160x600' : '728x90'}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  Loading banner ad...
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 ml-4 p-1"
            aria-label="Close banner ad"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}