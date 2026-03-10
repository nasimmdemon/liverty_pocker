import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

const LandscapeOverlay = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-6 text-center px-8">
      <RotateCcw size={64} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
      <h2 className="font-display text-primary text-2xl tracking-wider">
        Rotate Your Device
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Rotate your device to landscape to play Liberty Poker
      </p>
    </div>
  );
};

export default LandscapeOverlay;
