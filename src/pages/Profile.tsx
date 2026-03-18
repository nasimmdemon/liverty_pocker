import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReferredUsers,
  getReferrerInfoByUid,
  subscribeReferralStats,
  type ReferralRecord,
  type ReferralStats,
} from '@/lib/referrals';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import pokerRoomBg from '@/assets/poker-room-bg.png';
import charactersBg from '@/assets/characters-alt.png';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({ invited: 0, joined: 0, played: 0 });
  const [referredList, setReferredList] = useState<ReferralRecord[]>([]);
  const [referrerInfo, setReferrerInfo] = useState<{ displayName: string; photoURL: string | null } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeReferralStats(user.uid, setStats);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    getReferredUsers(user.uid).then(setReferredList);
  }, [user?.uid, stats]);

  useEffect(() => {
    const referredBy = profile?.referredBy;
    if (!referredBy) {
      setReferrerInfo(null);
      return;
    }
    getReferrerInfoByUid(referredBy).then(setReferrerInfo);
  }, [profile?.referredBy]);

  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
        <p className="text-primary mb-4">Sign in to view your profile</p>
        <Button onClick={() => navigate('/')} className="casino-btn">
          Go to Sign In
        </Button>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Player';

  return (
    <motion.div
      className="fixed inset-0 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background */}
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

      {/* Top bar */}
      <div className="relative z-20 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
        <h1
          className="text-lg sm:text-2xl md:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          LIBERTY POKER
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-[#F2D27A] hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1" /> Back
          </Button>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#F2D27A' }} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Profile header */}
          <div
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2"
            style={{
              background: 'rgba(0,0,0,0.5)',
              borderColor: 'rgba(229, 184, 74, 0.6)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-[4px] border-[#E5B84A]">
              <AvatarImage src={user.photoURL ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-muted text-primary text-2xl">
                {displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <h2
              className="text-xl sm:text-2xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
            >
              {displayName}
            </h2>
          </div>

          {/* Who referred me */}
          {referrerInfo && (
            <div
              className="p-4 rounded-xl border-2"
              style={{
                background: 'rgba(0,0,0,0.4)',
                borderColor: 'rgba(229, 184, 74, 0.5)',
              }}
            >
              <h3
                className="text-sm uppercase tracking-wider mb-3"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
              >
                Invited by
              </h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-[#E5B84A]/50">
                  <AvatarImage src={referrerInfo.photoURL ?? undefined} />
                  <AvatarFallback className="bg-muted text-primary">
                    {referrerInfo.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-medium">{referrerInfo.displayName}</span>
              </div>
            </div>
          )}

          {/* Referral stats */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderColor: 'rgba(229, 184, 74, 0.5)',
            }}
          >
            <h3
              className="text-sm uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
            >
              <UserPlus className="h-4 w-4" />
              People joined from my referral
            </h3>
            <p className="text-3xl font-bold text-[#F2D27A]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {stats.joined}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.played} have played • {stats.invited} invited
            </p>
          </div>

          {/* Referred friends list */}
          <div
            className="p-4 rounded-xl border-2"
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderColor: 'rgba(229, 184, 74, 0.5)',
            }}
          >
            <h3
              className="text-sm uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}
            >
              <Users className="h-4 w-4" />
              Friends I referred
            </h3>
            {referredList.length === 0 ? (
              <p className="text-muted-foreground text-sm">No one has joined from your referral yet.</p>
            ) : (
              <ul className="space-y-2">
                {referredList.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={r.referredPhotoURL ?? undefined} />
                      <AvatarFallback className="bg-muted text-primary text-sm">
                        {r.referredName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium truncate block">{r.referredName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            onClick={() => navigate('/refer')}
            className="w-full h-12 text-base font-bold uppercase tracking-wider"
            style={{
              background: 'linear-gradient(180deg, #C0392B 0%, #8B1A1A 50%, #6B1010 100%)',
              border: '2px solid #F2D27A',
              color: '#F2D27A',
            }}
          >
            Invite more friends
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
