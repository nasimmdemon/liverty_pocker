import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsLandscapeOnMobile(): boolean {
  const [isLandscapeOnMobile, setIsLandscapeOnMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
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
