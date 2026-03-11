import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import StartScreen from '@/components/poker/StartScreen';
import LoadingScreen from '@/components/poker/LoadingScreen';
import SitAndGoScreen from '@/components/poker/SitAndGoScreen';
import PokerTable from '@/components/poker/PokerTable';

type Screen = 'start' | 'loading' | 'sitandgo' | 'table';

interface TableConfig {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>('start');
  const [tableConfig, setTableConfig] = useState<TableConfig>({ buyIn: 1500, smallBlind: 5, bigBlind: 10 });

  const handlePlay = useCallback(() => setScreen('sitandgo'), []);
  const handleLoadingComplete = useCallback(() => setScreen('table'), []);
  const handleJoinTable = useCallback((buyIn: number, smallBlind: number, bigBlind: number) => {
    setTableConfig({ buyIn, smallBlind, bigBlind });
    setScreen('loading');
  }, []);

  return (
    <AnimatePresence mode="wait">
      {screen === 'start' && <StartScreen key="start" onPlay={handlePlay} />}
      {screen === 'sitandgo' && (
        <SitAndGoScreen
          key="sitandgo"
          onJoinTable={handleJoinTable}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'loading' && <LoadingScreen key="loading" onComplete={handleLoadingComplete} />}
      {screen === 'table' && (
        <PokerTable
          key="table"
          initialBuyIn={tableConfig.buyIn}
          onExit={() => setScreen('start')}
        />
      )}
    </AnimatePresence>
  );
};

export default Index;
