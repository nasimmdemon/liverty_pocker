import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsLandscapeOnMobile(): boolean {
  const [isLandscapeOnMobile, setIsLandscapeOnMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      // Use min dimension so phones are detected in both orientations (landscape width can exceed 768)
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      const isMobile = shortSide < MOBILE_BREAKPOINT;
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscapeOnMobile(isMobile && isLandscape);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscapeOnMobile;
}
