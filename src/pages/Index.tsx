import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import StartScreen from '@/components/poker/StartScreen';
import LoadingScreen from '@/components/poker/LoadingScreen';
import SitAndGoScreen from '@/components/poker/SitAndGoScreen';
import TestingScreen, { type TestingConfig } from '@/components/poker/TestingScreen';
import PokerTable from '@/components/poker/PokerTable';

type Screen = 'start' | 'loading' | 'sitandgo' | 'testing' | 'table';

interface TableConfig {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  turnTimer?: number;
  botCount?: number;
  isTestingTable?: boolean;
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

  const handleTestingMode = useCallback(() => setScreen('testing'), []);

  const handleStartTestGame = useCallback((config: TestingConfig) => {
    setTableConfig({
      buyIn: config.startingChips,
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      turnTimer: config.turnTimer,
      botCount: config.botCount,
      isTestingTable: true,
    });
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
          onTestingMode={handleTestingMode}
        />
      )}
      {screen === 'testing' && (
        <TestingScreen
          key="testing"
          onStartGame={handleStartTestGame}
          onBack={() => setScreen('sitandgo')}
        />
      )}
      {screen === 'loading' && <LoadingScreen key="loading" onComplete={handleLoadingComplete} />}
      {screen === 'table' && (
        <PokerTable
          key="table"
          initialBuyIn={tableConfig.buyIn}
          botCount={tableConfig.botCount}
          smallBlind={tableConfig.smallBlind}
          bigBlind={tableConfig.bigBlind}
          turnTimer={tableConfig.turnTimer}
          onExit={() => setScreen('start')}
        />
      )}
    </AnimatePresence>
  );
};

export default Index;
