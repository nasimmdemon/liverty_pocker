import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/** Returns true when mobile device is in portrait (we want landscape only) */
export function useIsPortraitOnMobile(): boolean {
  const [isPortraitOnMobile, setIsPortraitOnMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      const isMobile = shortSide < MOBILE_BREAKPOINT;
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      setIsPortraitOnMobile(isMobile && isPortrait);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isPortraitOnMobile;
}

/** Returns true on landscape mobile devices (short height, wide width) */
export function useIsLandscapeMobile(): boolean {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      // Landscape mobile: height is small (< 500px) and width is wider than height
      setIsLandscape(h < 500 && w > h);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscape;
}
