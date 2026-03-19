import { useState, useCallback, useEffect } from 'react';
import { WATCH_EARN_REWARD } from '@/lib/bonusConstants';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAddToHomeScreen } from '@/hooks/use-add-to-home-screen';
import { useIsLandscapeMobile } from '@/hooks/use-orientation';
import AddToHomeScreenOverlay from '@/components/AddToHomeScreenOverlay';
import MobileContinueInAppBanner from '@/components/MobileContinueInAppBanner';
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
  const { showPrompt: showAddToHomeScreen, platform, isMobileBrowser } = useAddToHomeScreen();
  const [skipInstall, setSkipInstallState] = useState(false);
  const showContinueBanner = isMobileBrowser && skipInstall;
  const isLandscapeMobile = useIsLandscapeMobile();
  const joinCodeFromUrl = searchParams.get('join');
  const refCodeFromUrl = searchParams.get('ref');

  // Store referral code for new signups (used when user creates account)
  useEffect(() => {
    if (refCodeFromUrl && typeof window !== 'undefined') {
      sessionStorage.setItem('referral_code', refCodeFromUrl);
    }
  }, [refCodeFromUrl]);
  const { user, loading, incrementBotMatches, canInviteFriends, profile, addFunds, deductFunds } = useAuth();
  const [screen, setScreen] = useState<Screen>('start');
  const funds = profile?.funds ?? 0;
  const [tableConfig, setTableConfig] = useState<TableConfig>({ buyIn: 1500, smallBlind: 5, bigBlind: 10 });
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | null>(null);

  const handlePlay = useCallback(() => setScreen('sitandgo'), []);
  const handleWatchAndEarn = useCallback(() => setScreen('watch-and-earn'), []);
  const handleWatchAndEarnClaim = useCallback(async () => {
    await addFunds(WATCH_EARN_REWARD);
    setScreen('sitandgo');
  }, [addFunds]);
  const handleLoadingComplete = useCallback(() => setScreen('table'), []);

  const handleJoinTable = useCallback(async (buyIn: number, smallBlind: number, bigBlind: number, gameMode?: 'tournament' | 'sit-and-go', cardBack?: string) => {
    const mode = gameMode ?? 'sit-and-go';
    // Deduct funds from profile
    await deductFunds(buyIn);
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
  }, [deductFunds]);

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

  const handleExitTable = useCallback((userChips?: number) => {
    incrementBotMatches();
    // Add winnings to funds when leaving regular table (not test, not multiplayer)
    if (!tableConfig.isTestingTable && userChips != null && userChips > 0) {
      const buyIn = tableConfig.buyIn;
      const profit = Math.round((userChips - buyIn) * 100) / 100;
      if (profit > 0) {
        addFunds(profit);
      }
    }
    setScreen('start');
  }, [incrementBotMatches, tableConfig.isTestingTable, tableConfig.buyIn, addFunds]);

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

  return (
    <div className={`min-h-[100dvh] h-[100dvh] overflow-hidden flex flex-col ${showContinueBanner ? 'pb-[52px]' : ''}`} data-landscape-mobile={isLandscapeMobile ? 'true' : undefined}>
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
          onTopUp={(amount) => addFunds(amount)}
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
    {showContinueBanner && <MobileContinueInAppBanner />}
    </div>
  );
};

export default Index;
