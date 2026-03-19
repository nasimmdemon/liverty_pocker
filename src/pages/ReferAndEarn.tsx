import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIsLandscapeMobile } from '@/hooks/use-orientation';
import { QRCodeSVG } from 'qrcode.react';
import {
  Crown,
  User,
  Mail,
  Share2,
  Search,
  ArrowLeft,
  LogOut,
  Copy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrCreateReferralCode,
  subscribeReferralStats,
  getReferredUsers,
  updateReferralCodePublicProfile,
  type ReferralStats,
} from '@/lib/referrals';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import pokerRoomBg from '@/assets/poker-room-bg.png';
import charactersBg from '@/assets/characters-alt.png';
import avatar1 from '@/assets/avatar-1.png';
import avatar2 from '@/assets/avatar-2.png';
import { toast } from '@/hooks/use-toast';

const DEFAULT_AVATARS = [avatar1, avatar2];

const RESERVATION_SECONDS = 16 * 60; // 16 minutes
const EARN_PERCENT = 33;

export default function ReferAndEarn() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isLandscapeMobile = useIsLandscapeMobile();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({ invited: 0, joined: 0, played: 0 });
  const [referredAvatars, setReferredAvatars] = useState<{ photoURL: string | null; displayName: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ uid: string; displayName: string; photoURL: string | null }[]>([]);
  const [reservationSeconds, setReservationSeconds] = useState(RESERVATION_SECONDS);

  const inviteUrl = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${referralCode}`
    : '';

  // Load referral code and update public profile so invitees can see who invited them
  useEffect(() => {
    if (!user?.uid) return;
    getOrCreateReferralCode(user.uid).then((code) => {
      setReferralCode(code);
      const name = user.displayName || user.email?.split('@')[0] || 'Player';
      updateReferralCodePublicProfile(code, user.uid, name, user.photoURL ?? null).catch(() => {});
    });
  }, [user?.uid, user?.displayName, user?.email, user?.photoURL]);

  // Subscribe to stats
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeReferralStats(user.uid, setStats);
  }, [user?.uid]);

  // Load referred users for avatars
  useEffect(() => {
    if (!user?.uid) return;
    getReferredUsers(user.uid).then((records) => {
      setReferredAvatars(
        records.slice(0, 4).map((r) => ({
          photoURL: r.referredPhotoURL,
          displayName: r.referredName,
        }))
      );
    });
  }, [user?.uid, stats]);

  // Reservation timer
  useEffect(() => {
    const interval = setInterval(() => {
      setReservationSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Search users by displayName
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const q = query(
        collection(db, 'users'),
        where('displayName', '>=', searchQuery.trim()),
        where('displayName', '<=', searchQuery.trim() + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setSearchResults(
        snap.docs
          .filter((d) => d.id !== user?.uid)
          .map((d) => {
            const d_ = d.data();
            return {
              uid: d.id,
              displayName: (d_.displayName as string) || 'Player',
              photoURL: (d_.photoURL as string | null) ?? null,
            };
          })
      );
    } catch (e) {
      toast({ title: 'Search failed', variant: 'destructive' });
    }
  }, [searchQuery, user?.uid]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: 'Link copied to clipboard!' });
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Liberty Poker',
          text: `Play poker with me! Use my referral link: ${inviteUrl}`,
          url: inviteUrl,
        });
        toast({ title: 'Shared successfully!' });
      } catch (e) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleInviteUser = (targetUser: { uid: string; displayName: string }) => {
    const url = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(`${url}\nHey ${targetUser.displayName}, join me on Liberty Poker!`);
    toast({ title: `Invite link copied for ${targetUser.displayName}` });
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} minutes & ${s} seconds`;
  };

  const progressPercent = ((RESERVATION_SECONDS - reservationSeconds) / RESERVATION_SECONDS) * 100;

  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
        <p className="text-primary mb-4">Sign in to refer friends and earn</p>
        <Button onClick={() => navigate('/')} className="casino-btn">
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background - dark poker room */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${pokerRoomBg})` }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${charactersBg})`, backgroundPosition: 'center 60%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Top bar — compact on landscape */}
      <div className={`relative z-20 flex justify-between items-center shrink-0 ${isLandscapeMobile ? 'px-2 py-1.5' : 'px-4 sm:px-6 py-3 sm:py-4'}`}>
        <h1
          className={`tracking-wider ${isLandscapeMobile ? 'text-sm' : 'text-lg sm:text-2xl md:text-3xl'}`}
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          LIBERTY POKER
        </h1>
        <div className={`flex items-center ${isLandscapeMobile ? 'gap-1' : 'gap-2 sm:gap-4'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className={`text-[#F2D27A] hover:bg-white/10 ${isLandscapeMobile ? 'px-2 py-1 text-xs' : ''}`}
          >
            <ArrowLeft className={`mr-1 ${isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'}`} /> Back
          </Button>
          <button
            onClick={() => signOut()}
            className={`rounded-lg hover:bg-white/10 transition-colors ${isLandscapeMobile ? 'p-1' : 'p-1.5'}`}
            title="Sign out"
          >
            <LogOut className={isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'} style={{ color: '#F2D27A' }} />
          </button>
        </div>
      </div>

      {/* Main content — centered block on landscape, vertical on portrait */}
      <div className={`relative z-10 flex-1 flex min-h-0 overflow-auto ${isLandscapeMobile ? 'justify-center items-center px-4 py-4' : 'flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 px-4 py-6'}`}>
        {/* Left: 2 avatars — hidden on landscape */}
        {!isLandscapeMobile && (
          <div className="flex flex-col gap-5 sm:gap-6 shrink-0">
            {[0, 1].map((i) => {
              const referred = referredAvatars[i];
              const imgSrc = referred?.photoURL ?? DEFAULT_AVATARS[i];
              return (
                <div
                  key={i}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[4px] overflow-hidden shadow-lg"
                  style={{
                    borderColor: '#E5B84A',
                    boxShadow: '0 0 20px rgba(229, 184, 74, 0.3)',
                  }}
                >
                  {referred?.photoURL ? (
                    <Avatar className="w-full h-full">
                      <AvatarImage src={referred.photoURL} alt={referred.displayName} />
                      <AvatarFallback className="bg-muted text-primary text-xl">
                        {referred.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <img
                      src={imgSrc}
                      alt={`Player ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Center: QR + content — compact centered block on landscape */}
        <div className={`flex items-center gap-3 ${isLandscapeMobile ? 'flex-row justify-center items-center flex-wrap shrink-0' : 'flex-col sm:items-start gap-4 sm:gap-5 w-full max-w-sm'}`}>
          {/* QR Code + Counters — compact on landscape */}
          {inviteUrl && (
            <div className={`flex ${isLandscapeMobile ? 'flex-row items-center gap-2 shrink-0' : 'flex-col gap-3 w-full'}`}>
              <div className={`flex items-center ${isLandscapeMobile ? 'flex-row gap-2' : 'flex-row gap-4 justify-center sm:justify-start'}`}>
                <div
                  className={`rounded-xl border-2 shrink-0 ${isLandscapeMobile ? 'p-1.5' : 'p-3'}`}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    borderColor: 'rgba(229, 184, 74, 0.6)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                  }}
                >
                  <QRCodeSVG
                    value={inviteUrl}
                    size={isLandscapeMobile ? 72 : 130}
                    level="M"
                    bgColor="#0a0a0a"
                    fgColor="#E5B84A"
                    includeMargin={false}
                  />
                </div>
                <div className={`flex flex-col ${isLandscapeMobile ? 'gap-0.5' : 'gap-2'}`}>
                  <div className={`flex items-center gap-1 text-[#F2D27A] ${isLandscapeMobile ? 'text-[10px]' : ''}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    <Crown className={`shrink-0 ${isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className="font-medium tracking-wide">{stats.played}/2</span>
                  </div>
                  <div className={`flex items-center gap-1 text-[#F2D27A] ${isLandscapeMobile ? 'text-[10px]' : ''}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    <User className={`shrink-0 ${isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className="font-medium tracking-wide">{stats.joined}/2</span>
                  </div>
                  <div className={`flex items-center gap-1 text-[#F2D27A] ${isLandscapeMobile ? 'text-[10px]' : ''}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    <Mail className={`shrink-0 ${isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className="font-medium tracking-wide">{stats.invited}/2</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className={`text-[#F2D27A] hover:bg-white/10 w-fit ${isLandscapeMobile ? 'h-6 w-6' : ''}`}
                  >
                    <Share2 className={isLandscapeMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className={`border-[#E5B84A]/50 text-[#F2D27A] hover:bg-white/10 shrink-0 ${isLandscapeMobile ? 'px-2 py-1 text-[10px] h-7' : 'w-fit'}`}
              >
                <Copy className={`mr-2 ${isLandscapeMobile ? 'h-3 w-3' : 'h-4 w-4'}`} /> Copy invite link
              </Button>
            </div>
          )}

          {!inviteUrl && (
            <div className="flex items-center gap-2 text-[#F2D27A]">
              <span className="text-sm">Loading your referral link...</span>
            </div>
          )}

          {/* Search bar — compact on landscape */}
          <div className={`relative shrink-0 ${isLandscapeMobile ? 'w-36 min-w-[120px]' : 'w-full'}`}>
            <Input
              placeholder="Search for friend by username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`pl-3 pr-10 rounded-xl border-2 bg-black/30 text-foreground placeholder:text-muted-foreground/80 ${isLandscapeMobile ? 'h-8 text-[10px]' : 'pl-4 pr-12 h-12'}`}
              style={{ borderColor: 'rgba(229, 184, 74, 0.5)' }}
            />
            <button
              type="button"
              onClick={handleSearch}
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-[#F2D27A] ${isLandscapeMobile ? 'right-1.5' : ''}`}
            >
              <Search className={isLandscapeMobile ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={`rounded-lg bg-black/60 border border-[#E5B84A]/30 p-2 space-y-1 ${isLandscapeMobile ? 'absolute top-full left-0 right-0 z-30 mt-1 max-h-24 overflow-y-auto' : 'w-full'}`}>
              {searchResults.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => handleInviteUser(u)}
                  className={`w-full flex items-center gap-2 rounded hover:bg-white/10 text-left ${isLandscapeMobile ? 'p-1.5' : 'p-2'}`}
                >
                  <Avatar className={isLandscapeMobile ? 'h-6 w-6' : 'h-8 w-8'}>
                    <AvatarImage src={u.photoURL ?? undefined} />
                    <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className={`text-foreground ${isLandscapeMobile ? 'text-[10px]' : 'text-sm'}`}>{u.displayName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Reservation timer — compact on landscape */}
          <div className={isLandscapeMobile ? 'w-28 min-w-0 shrink-0' : 'w-full'}>
            <p
              className={`mb-1 tracking-wide ${isLandscapeMobile ? 'text-[9px]' : 'text-sm sm:text-base mb-2'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
            >
              Reserved for {formatTime(reservationSeconds)}
            </p>
            <Progress
              value={progressPercent}
              className={`bg-black/50 rounded-full overflow-hidden [&>div]:bg-[#E5B84A] [&>div]:rounded-full ${isLandscapeMobile ? 'h-1.5' : 'h-2'}`}
            />
          </div>

          {/* READY? button — compact on landscape */}
          <Button
            onClick={() => navigate('/')}
            className={`font-bold uppercase tracking-[0.2em] text-white shrink-0 ${isLandscapeMobile ? 'h-8 px-4 text-xs' : 'w-full h-14 sm:h-16 text-xl'}`}
            style={{
              background: 'linear-gradient(180deg, #C0392B 0%, #8B1A1A 50%, #6B1010 100%)',
              border: '3px solid #F2D27A',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(242, 210, 122, 0.2)',
            }}
          >
            READY?
          </Button>
        </div>
      </div>

      {/* Bottom: EARN 33% — compact on landscape, hidden or inline */}
      <div className={`relative z-10 shrink-0 ${isLandscapeMobile ? 'pb-2 px-2' : 'pb-6 sm:pb-8 px-4'} text-center`}>
        <p
          className={`font-bold uppercase tracking-wider mb-1 ${isLandscapeMobile ? 'text-[9px] leading-tight' : 'text-base sm:text-lg'}`}
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
        >
          EARN {EARN_PERCENT}% FOR LIFE FROM EVERY HAND YOUR INVITEES PLAY FOREVER
        </p>
        <button
          type="button"
          onClick={() => toast({ title: 'Learn more', description: 'Referral program details coming soon.' })}
          className={`text-red-400 hover:text-red-300 underline ${isLandscapeMobile ? 'text-[8px]' : 'text-sm'}`}
        >
          learn more
        </button>
      </div>
    </motion.div>
  );
}
