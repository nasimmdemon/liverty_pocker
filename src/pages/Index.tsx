import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import StartScreen from '@/components/poker/StartScreen';
import LoadingScreen from '@/components/poker/LoadingScreen';
import PokerTable from '@/components/poker/PokerTable';

type Screen = 'start' | 'loading' | 'table';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('start');

  const handlePlay = useCallback(() => setScreen('loading'), []);
  const handleLoadingComplete = useCallback(() => setScreen('table'), []);

  return (
    <AnimatePresence mode="wait">
      {screen === 'start' && <StartScreen key="start" onPlay={handlePlay} />}
      {screen === 'loading' && <LoadingScreen key="loading" onComplete={handleLoadingComplete} />}
      {screen === 'table' && <PokerTable key="table" />}
    </AnimatePresence>
  );
};

export default Index;
