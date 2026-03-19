import { useState, useEffect } from 'react';

export type MobilePlatform = 'ios' | 'android' | null;

const SKIP_INSTALL_KEY = 'liberty_skip_install';

function getMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';
  return null;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari standalone (added to home screen)
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  // Android/Chrome standalone or fullscreen
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  // TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) return true;
  return false;
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
}

function getUserSkippedInstall(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(SKIP_INSTALL_KEY) === '1';
}

export function setSkipInstall(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SKIP_INSTALL_KEY, '1');
  }
}

export function clearSkipInstall(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SKIP_INSTALL_KEY);
  }
}

function getInitialState(): { showPrompt: boolean; platform: MobilePlatform; isMobileBrowser: boolean } {
  if (typeof window === 'undefined') return { showPrompt: false, platform: null, isMobileBrowser: false };
  const plat = getMobilePlatform();
  const mobile = plat !== null || isMobileViewport();
  const standalone = isStandalone();
  const isMobileBrowser = mobile && !standalone;
  const skipped = getUserSkippedInstall();
  return {
    showPrompt: isMobileBrowser && !skipped,
    platform: plat,
    isMobileBrowser,
  };
}

export function useAddToHomeScreen(): { showPrompt: boolean; platform: MobilePlatform; isMobileBrowser: boolean } {
  const [state, setState] = useState(() => getInitialState());

  useEffect(() => {
    setState(getInitialState());
  }, []);

  return state;
}
