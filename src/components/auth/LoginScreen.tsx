import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getReferrerByCode } from '@/lib/referrals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import pokerRoomBg from '@/assets/poker-room-bg.png';

type Mode = 'signin' | 'signup';

interface LoginScreenProps {
  refCodeFromUrl?: string | null;
}

const LoginScreen = ({ refCodeFromUrl }: LoginScreenProps) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest } = useAuth();
  const [referrer, setReferrer] = useState<{ displayName: string; photoURL: string | null } | null>(null);

  useEffect(() => {
    if (!refCodeFromUrl) return;
    getReferrerByCode(refCodeFromUrl).then(setReferrer);
  }, [refCodeFromUrl]);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName || undefined);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };



  return (
    <motion.div
      className="login-screen fixed inset-0 flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerRoomBg})` }} />
      <div className="absolute inset-0 bg-black/70" />

      <div className="login-form relative z-10 w-full max-w-md mx-4 px-6 py-8 rounded-2xl border-2 border-primary/50 bg-background/95 backdrop-blur-sm shadow-2xl">
        <h1
          className="text-2xl sm:text-3xl tracking-[0.2em] text-center mb-6"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          LIBERTY POKER
        </h1>
        {referrer && (
          <div className="flex items-center justify-center gap-2 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={referrer.photoURL ?? undefined} />
              <AvatarFallback className="text-primary text-sm">
                {referrer.displayName?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-foreground">
              You were invited by <span className="font-semibold text-primary">{referrer.displayName}</span>
            </p>
          </div>
        )}
        <p className="text-muted-foreground text-sm text-center mb-6">
          {mode === 'signin' ? 'Sign in to play' : 'Create an account to get started'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-primary">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-muted/50 border-primary/30"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-primary">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-muted/50 border-primary/30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-primary">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 bg-muted/50 border-primary/30"
              />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full casino-btn h-12"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-primary/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full h-12 border-primary/50 hover:bg-primary/10"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-primary/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              await signInAsGuest();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Something went wrong';
              setError(msg);
            } finally {
              setLoading(false);
            }
          }}
          className="w-full h-12 border-primary/50 hover:bg-primary/10 text-primary font-semibold"
        >
          🎰 Play as Guest
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
};

export default LoginScreen;
