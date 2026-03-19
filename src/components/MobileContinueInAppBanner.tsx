import { Smartphone } from 'lucide-react';
import { clearSkipInstall } from '@/hooks/use-add-to-home-screen';

export default function MobileContinueInAppBanner() {
  const handleAddToHome = () => {
    clearSkipInstall();
    window.location.reload();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 py-3 bg-primary/95 backdrop-blur-sm border-t border-primary/50 shadow-[0_-4px 20px rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Smartphone className="w-5 h-5 text-primary shrink-0" style={{ color: '#F2D27A' }} />
          <p className="text-sm font-medium text-white truncate">
            Continue in the app for the best experience
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddToHome}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 text-[#F2D27A] border border-[#F2D27A]/50 transition-colors"
        >
          Add to Home
        </button>
      </div>
    </div>
  );
}
