import { Share, Download } from 'lucide-react';
import { setSkipInstall, type MobilePlatform } from '@/hooks/use-add-to-home-screen';

interface AddToHomeScreenOverlayProps {
  platform: MobilePlatform;
  onContinueInBrowser?: () => void;
}

const IOS_INSTRUCTIONS = [
  '1. Tap the Share button (square with arrow) at the bottom of Safari',
  '2. Scroll down and tap "Add to Home Screen"',
  '3. Tap "Add" in the top right',
  '4. Open Liberty Poker from your home screen for the full experience',
];

const ANDROID_INSTRUCTIONS = [
  '1. Tap the menu (⋮) in Chrome\'s address bar',
  '2. Tap "Add to Home screen" or "Install app"',
  '3. Confirm by tapping "Add" or "Install"',
  '4. Open Liberty Poker from your home screen for the full experience',
];

export default function AddToHomeScreenOverlay({ platform, onContinueInBrowser }: AddToHomeScreenOverlayProps) {
  const isIOS = platform === 'ios';
  const instructions = isIOS ? IOS_INSTRUCTIONS : ANDROID_INSTRUCTIONS;
  const Icon = isIOS ? Share : Download;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl border-2 border-primary flex items-center justify-center bg-primary/10">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Add to Home Screen
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Liberty Poker works best as a web app. Add it to your home screen for the full experience—no browser bars, smoother gameplay, and better performance.
          </p>
        </div>
        <div className="text-left space-y-3 bg-muted/30 rounded-xl p-4 border border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isIOS ? 'On iPhone or iPad:' : 'On Android:'}
          </p>
          <ol className="space-y-2 text-sm text-foreground">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary font-bold shrink-0">{step.split('.')[0]}.</span>
                <span>{step.replace(/^\d+\.\s*/, '')}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">
          After adding, open the app from your home screen to play.
        </p>
        <button
          type="button"
          onClick={() => {
            setSkipInstall();
            onContinueInBrowser?.();
          }}
          className="mt-4 text-sm text-muted-foreground underline hover:text-foreground transition-colors"
        >
          Continue in browser instead
        </button>
      </div>
    </div>
  );
}
