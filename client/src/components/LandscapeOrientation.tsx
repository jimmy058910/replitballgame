import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface LandscapeOrientationProps {
  children: React.ReactNode;
}

export const LandscapeOrientation: React.FC<LandscapeOrientationProps> = ({ children }) => {
  const [isLandscape, setIsLandscape] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobileDevice = width <= 768;
      const isLandscapeOrientation = width > height;
      
      setIsMobile(isMobileDevice);
      setIsLandscape(isLandscapeOrientation || !isMobileDevice);
    };

    // Check initial orientation
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Try to lock orientation to landscape if possible
    if ('screen' in window && 'orientation' in window.screen) {
      const orientation = window.screen.orientation;
      if ('lock' in orientation) {
        orientation.lock('landscape').catch((err: any) => {
          console.log('Orientation lock not supported:', err);
        });
      }
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Show portrait warning on mobile devices in portrait mode
  if (isMobile && !isLandscape) {
    return (
      <div className="portrait-warning">
        <div className="rotate-icon">
          <RotateCcw size={64} />
        </div>
        <h2>Please Rotate Your Device</h2>
        <p>
          Realm Rivalry is designed for landscape mode.
          <br />
          Turn your device sideways for the best experience.
        </p>
      </div>
    );
  }

  // Show content in landscape mode or on desktop
  return <div className="landscape-only">{children}</div>;
};