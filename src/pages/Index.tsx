import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAddToHomeScreen } from '@/hooks/use-add-to-home-screen';
import { useIsLandscapeMobile } from '@/hooks/use-orientation';
import AddToHomeScreenOverlay from '@/components/AddToHomeScreenOverlay';
import LoginScreen from '@/components/auth/LoginScreen';
import StartScreen from '@/components/poker/StartScreen';
import LoadingScreen from '@/components/poker/LoadingScreen';
import SitAndGoScreen from '@/components/poker/SitAndGoScreen';
import TestingScreen, { type TestingConfig } from '@/components/poker/TestingScreen';
import PokerTable from '@/components/poker/PokerTable';
import WatchAndEarnScreen from '@/components/poker/WatchAndEarnScreen';
import MultiplayerLobby from '@/components/multiplayer/MultiplayerLobby';
import MultiplayerPokerTable from '@/components/multiplayer/MultiplayerPokerTable';
import { getGameByCode, joinGameRoom } from '@/lib/multiplayer';

type Screen = 'start' | 'loading' | 'sitandgo' | 'testing' | 'table' | 'watch-and-earn' | 'multiplayer-lobby' | 'multiplayer-table';

interface TableConfig {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  turnTimer?: number;
  botCount?: number;
  isTestingTable?: boolean;
  isPublic?: boolean;
  gameMode?: 'tournament' | 'sit-and-go';
  testCommission?: import('@/lib/gameLogic').TestCommissionConfig;
  cardBack?: string;
}

interface MultiplayerConfig {
  gameId: string;
  inviteCode: string;
  isHost: boolean;
  room: Awaited<ReturnType<typeof getGameByCode>>;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const { showPrompt: showAddToHomeScreen, platform } = useAddToHomeScreen();
  const [skipInstall, setSkipInstallState] = useState(false);
  const isLandscapeMobile = useIsLandscapeMobile();
  const joinCodeFromUrl = searchParams.get('join');
  const refCodeFromUrl = searchParams.get('ref');

  // Store referral code for new signups (used when user creates account)
  useEffect(() => {
    if (refCodeFromUrl && typeof window !== 'undefined') {
      sessionStorage.setItem('referral_code', refCodeFromUrl);
    }
  }, [refCodeFromUrl]);
  const { user, loading, incrementBotMatches, canInviteFriends, profile } = useAuth();
  const [screen, setScreen] = useState<Screen>('start');
  const [funds, setFunds] = useState(9); // Player funds (will connect to backend later)
  const [tableConfig, setTableConfig] = useState<TableConfig>({ buyIn: 1500, smallBlind: 5, bigBlind: 10 });
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | null>(null);

  const handlePlay = useCallback(() => setScreen('sitandgo'), []);
  const handleWatchAndEarn = useCallback(() => setScreen('watch-and-earn'), []);
  const handleWatchAndEarnClaim = useCallback(() => setScreen('sitandgo'), []);
  const handleLoadingComplete = useCallback(() => setScreen('table'), []);

  const handleJoinTable = useCallback((buyIn: number, smallBlind: number, bigBlind: number, gameMode?: 'tournament' | 'sit-and-go', cardBack?: string) => {
    const mode = gameMode ?? 'sit-and-go';
    // Deduct funds
    setFunds(prev => Math.max(0, prev - buyIn));
    setTableConfig({
      buyIn,
      smallBlind,
      bigBlind,
      isPublic: true,
      gameMode: mode,
      turnTimer: 10,
      cardBack,
    });
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
      testCommission: config.testCommission,
      cardBack: config.cardBack,
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

  // Mobile browser: prompt add-to-home-screen (can skip to continue in browser)
  if (showAddToHomeScreen && platform && !skipInstall) {
    return (
      <AddToHomeScreenOverlay
        platform={platform}
        onContinueInBrowser={() => setSkipInstallState(true)}
      />
    );
  }

  if (!user) {
    return <LoginScreen refCodeFromUrl={refCodeFromUrl} />;
  }

  // Mobile: portrait only — block landscape with rotate prompt
  if (isLandscapeMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full border-2 border-primary flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Please rotate to portrait
        </h2>
        <p className="text-muted-foreground text-sm">
          Liberty Poker is playable only in portrait mode. Please rotate your device to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col">
    <AnimatePresence mode="wait">
      {screen === 'start' && (
        <StartScreen key="start" onPlay={handlePlay} onWatchAndEarn={handleWatchAndEarn} funds={funds} />
      )}
      {screen === 'watch-and-earn' && (
        <WatchAndEarnScreen
          key="watch-and-earn"
          onClaim={handleWatchAndEarnClaim}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'sitandgo' && (
        <SitAndGoScreen
          key="sitandgo"
          onJoinTable={handleJoinTable}
          onBack={() => setScreen('start')}
          onTestingMode={handleTestingMode}
          canInviteFriends={canInviteFriends}
          botMatchesPlayed={profile?.botMatchesPlayed ?? 0}
          onMultiplayerCreate={handleMultiplayerCreate}
          onMultiplayerJoin={handleMultiplayerJoin}
          joinCodeFromUrl={joinCodeFromUrl}
          funds={funds}
        />
      )}
      {screen === 'testing' && (
        <TestingScreen
          key="testing"
          onStartGame={handleStartTestGame}
          onBack={() => setScreen('sitandgo')}
          funds={funds}
          onTopUp={(amount) => setFunds(prev => prev + amount)}
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
          gameMode={tableConfig.gameMode}
          testCommission={tableConfig.testCommission}
          cardBack={tableConfig.cardBack}
          onExit={handleExitTable}
          isLandscapeMobile={isLandscapeMobile}
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
          isLandscapeMobile={isLandscapeMobile}
        />
      )}
    </AnimatePresence>
    </div>
  );
};

export default Index;
