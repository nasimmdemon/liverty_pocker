import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/auth/LoginScreen';
import StartScreen from '@/components/poker/StartScreen';
import LoadingScreen from '@/components/poker/LoadingScreen';
import SitAndGoScreen from '@/components/poker/SitAndGoScreen';
import TestingScreen, { type TestingConfig } from '@/components/poker/TestingScreen';
import PokerTable from '@/components/poker/PokerTable';
import MultiplayerLobby from '@/components/multiplayer/MultiplayerLobby';
import MultiplayerPokerTable from '@/components/multiplayer/MultiplayerPokerTable';
import { getGameByCode, joinGameRoom } from '@/lib/multiplayer';

type Screen = 'start' | 'loading' | 'sitandgo' | 'testing' | 'table' | 'multiplayer-lobby' | 'multiplayer-table';

interface TableConfig {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  turnTimer?: number;
  botCount?: number;
  isTestingTable?: boolean;
  isPublic?: boolean;
}

interface MultiplayerConfig {
  gameId: string;
  inviteCode: string;
  isHost: boolean;
  room: Awaited<ReturnType<typeof getGameByCode>>;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const joinCodeFromUrl = searchParams.get('join');
  const { user, loading, incrementBotMatches, canInviteFriends, profile } = useAuth();
  const [screen, setScreen] = useState<Screen>('start');
  const [tableConfig, setTableConfig] = useState<TableConfig>({ buyIn: 1500, smallBlind: 5, bigBlind: 10 });
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | null>(null);

  const handlePlay = useCallback(() => setScreen('sitandgo'), []);
  const handleLoadingComplete = useCallback(() => setScreen('table'), []);

  const handleJoinTable = useCallback((buyIn: number, smallBlind: number, bigBlind: number) => {
    setTableConfig({ buyIn, smallBlind, bigBlind, isPublic: true });
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

  const handleExitTable = useCallback(() => {
    incrementBotMatches();
    setScreen('start');
  }, [incrementBotMatches]);

  const handleMultiplayerCreate = useCallback((room: import('@/lib/multiplayer').GameRoom) => {
    setMultiplayerConfig({
      gameId: room.id,
      inviteCode: room.inviteCode,
      isHost: true,
      room,
    });
    setScreen('multiplayer-lobby');
  }, []);

  const handleMultiplayerJoin = useCallback((gameId: string, room: Awaited<ReturnType<typeof getGameByCode>>) => {
    if (!room) return;
    setMultiplayerConfig({
      gameId,
      inviteCode: room.inviteCode,
      isHost: room.hostId === user?.uid,
      room,
    });
    setScreen('multiplayer-lobby');
  }, [user?.uid]);

  useEffect(() => {
    if (joinCodeFromUrl && canInviteFriends && user) {
      getGameByCode(joinCodeFromUrl).then(async room => {
        if (room) {
          await joinGameRoom(room.id, user.uid, user.displayName || user.email?.split('@')[0] || 'Player', user.photoURL);
          setMultiplayerConfig({
            gameId: room.id,
            inviteCode: room.inviteCode,
            isHost: room.hostId === user.uid,
            room,
          });
          setScreen('multiplayer-lobby');
        }
      });
    }
  }, [joinCodeFromUrl, canInviteFriends, user]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'start' && (
        <StartScreen
          key="start"
          onPlay={handlePlay}
          canInviteFriends={canInviteFriends}
          botMatchesPlayed={profile?.botMatchesPlayed ?? 0}
          onMultiplayerCreate={handleMultiplayerCreate}
          onMultiplayerJoin={handleMultiplayerJoin}
          joinCodeFromUrl={joinCodeFromUrl}
        />
      )}
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
      {screen === 'loading' && <LoadingScreen key="loading" onComplete={handleLoadingComplete} isPublic={tableConfig.isPublic} />}
      {screen === 'table' && (
        <PokerTable
          key="table"
          initialBuyIn={tableConfig.buyIn}
          botCount={tableConfig.botCount}
          smallBlind={tableConfig.smallBlind}
          bigBlind={tableConfig.bigBlind}
          turnTimer={tableConfig.turnTimer}
          isTestingTable={tableConfig.isTestingTable}
          onExit={handleExitTable}
        />
      )}
      {screen === 'multiplayer-lobby' && multiplayerConfig && (
        <MultiplayerLobby
          key="multiplayer-lobby"
          gameId={multiplayerConfig.gameId}
          inviteCode={multiplayerConfig.inviteCode}
          currentUserId={user?.uid ?? ''}
          currentUserName={user?.displayName || user?.email?.split('@')[0] || 'Player'}
          currentUserPhoto={user?.photoURL ?? null}
          isHost={multiplayerConfig.isHost}
          onStart={(room) => {
            setMultiplayerConfig(prev => prev ? { ...prev, room } : { gameId: room.id, inviteCode: room.inviteCode, isHost: room.hostId === user?.uid, room });
            setScreen('multiplayer-table');
          }}
          onBack={() => { setScreen('start'); setMultiplayerConfig(null); }}
        />
      )}
      {screen === 'multiplayer-table' && multiplayerConfig && user && (
        <MultiplayerPokerTable
          key="multiplayer-table"
          gameId={multiplayerConfig.gameId}
          currentUserId={user.uid}
          isHost={multiplayerConfig.isHost}
          initialRoom={multiplayerConfig.room!}
          onExit={() => { setScreen('start'); setMultiplayerConfig(null); }}
        />
      )}
    </AnimatePresence>
  );
};

export default Index;
