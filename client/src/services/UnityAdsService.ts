// Unity Ads Service for Web Integration
declare global {
  interface Window {
    UnityAds: any;
  }
}

export interface UnityAdsConfig {
  gameId: string;
  testMode: boolean;
  debug: boolean;
}

export interface AdPlacement {
  id: string;
  type: 'rewarded' | 'interstitial' | 'banner';
  name: string;
}

export interface AdResult {
  placementId: string;
  state: 'COMPLETED' | 'SKIPPED' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
}

export class UnityAdsService {
  private static instance: UnityAdsService;
  private isInitialized: boolean = false;
  private config: UnityAdsConfig;
  private placements: AdPlacement[] = [
    { id: 'rewardedVideo', type: 'rewarded', name: 'Rewarded Video' },
    { id: 'interstitial', type: 'interstitial', name: 'Interstitial' },
    { id: 'banner', type: 'banner', name: 'Banner' }
  ];

  private constructor() {
    // Development configuration - replace with your actual Unity Game ID
    this.config = {
      gameId: 'test-game-id', // Replace with your actual game ID
      testMode: true, // Set to false for production
      debug: true // Set to false for production
    };
  }

  static getInstance(): UnityAdsService {
    if (!UnityAdsService.instance) {
      UnityAdsService.instance = new UnityAdsService();
    }
    return UnityAdsService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Wait for Unity Ads SDK to load
      await this.waitForUnityAds();
      
      if (!window.UnityAds) {
        throw new Error('Unity Ads SDK not loaded');
      }

      // Initialize Unity Ads
      await new Promise<void>((resolve, reject) => {
        window.UnityAds.init(this.config.gameId, this.config.testMode, this.config.debug, (error: any) => {
          if (error) {
            reject(new Error(`Unity Ads initialization failed: ${error}`));
          } else {
            this.isInitialized = true;
            console.log('Unity Ads initialized successfully');
            resolve();
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Unity Ads initialization error:', error);
      return false;
    }
  }

  private waitForUnityAds(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxWait = 10000; // 10 seconds
      const startTime = Date.now();
      
      const checkUnityAds = () => {
        if (window.UnityAds) {
          resolve();
        } else if (Date.now() - startTime > maxWait) {
          reject(new Error('Unity Ads SDK failed to load within timeout'));
        } else {
          setTimeout(checkUnityAds, 100);
        }
      };
      
      checkUnityAds();
    });
  }

  async showRewardedVideo(): Promise<AdResult> {
    if (!this.isInitialized) {
      throw new Error('Unity Ads not initialized');
    }

    const placementId = 'rewardedVideo';
    
    // Check if placement is ready
    if (!window.UnityAds.isSupported()) {
      throw new Error('Unity Ads not supported on this platform');
    }

    if (!window.UnityAds.isReady(placementId)) {
      throw new Error('Rewarded video not ready');
    }

    return new Promise((resolve) => {
      window.UnityAds.show(placementId, (result: string, errorCode?: string, errorMessage?: string) => {
        const adResult: AdResult = {
          placementId,
          state: result as 'COMPLETED' | 'SKIPPED' | 'FAILED',
          errorCode,
          errorMessage
        };
        
        resolve(adResult);
      });
    });
  }

  async showInterstitial(): Promise<AdResult> {
    if (!this.isInitialized) {
      throw new Error('Unity Ads not initialized');
    }

    const placementId = 'interstitial';
    
    if (!window.UnityAds.isSupported()) {
      throw new Error('Unity Ads not supported on this platform');
    }

    if (!window.UnityAds.isReady(placementId)) {
      throw new Error('Interstitial ad not ready');
    }

    return new Promise((resolve) => {
      window.UnityAds.show(placementId, (result: string, errorCode?: string, errorMessage?: string) => {
        const adResult: AdResult = {
          placementId,
          state: result as 'COMPLETED' | 'SKIPPED' | 'FAILED',
          errorCode,
          errorMessage
        };
        
        resolve(adResult);
      });
    });
  }

  isReady(placementId: string = 'rewardedVideo'): boolean {
    if (!this.isInitialized || !window.UnityAds) {
      return false;
    }
    
    return window.UnityAds.isReady(placementId);
  }

  isSupported(): boolean {
    if (!this.isInitialized || !window.UnityAds) {
      return false;
    }
    
    return window.UnityAds.isSupported();
  }

  getPlacementState(placementId: string): string {
    if (!this.isInitialized || !window.UnityAds) {
      return 'NOT_AVAILABLE';
    }
    
    return window.UnityAds.getPlacementState(placementId);
  }

  // Update configuration for production
  updateConfig(newConfig: Partial<UnityAdsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): UnityAdsConfig {
    return { ...this.config };
  }

  // Get available placements
  getPlacements(): AdPlacement[] {
    return [...this.placements];
  }
}

export default UnityAdsService.getInstance();