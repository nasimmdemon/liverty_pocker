import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getGameByCode, joinGameRoom } from '@/lib/multiplayer';
import { toast } from '@/hooks/use-toast';

interface JoinGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (gameId: string, room: Awaited<ReturnType<typeof getGameByCode>>) => void;
  initialCode?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserPhoto?: string | null;
}

const JoinGameModal = ({ open, onOpenChange, onJoined, initialCode = '', currentUserId = '', currentUserName = '', currentUserPhoto = null }: JoinGameModalProps) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialCode) setCode(initialCode.toUpperCase());
  }, [open, initialCode]);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      toast({ title: 'Enter a valid code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const room = await getGameByCode(trimmed);
      if (!room) {
        toast({ title: 'Game not found', description: 'Check the code and try again.', variant: 'destructive' });
        return;
      }
      await joinGameRoom(room.id, currentUserId, currentUserName, currentUserPhoto);
      onJoined(room.id, room);
      onOpenChange(false);
      setCode('');
    } catch (e) {
      toast({ title: 'Failed to join', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-2 border-primary/50">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">Join Game</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Enter invite code</Label>
            <Input
              placeholder="e.g. ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              className="font-mono text-lg tracking-widest uppercase"
              maxLength={6}
            />
          </div>
          <Button
            className="w-full casino-btn"
            onClick={handleJoin}
            disabled={loading || code.trim().length < 4}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinGameModal;
