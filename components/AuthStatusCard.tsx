import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, Link2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface AuthStatusCardProps {
  authUserId?: string | null;
}

export function AuthStatusCard({ authUserId }: AuthStatusCardProps) {
  const { isAuthenticated, isAuthenticating, walletAddress, user, signIn } = useAuth();

  const isLinked = !!authUserId || !!user?.id;
  const displayAuthId = authUserId || user?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card p-4 rounded-lg"
    >
      <div className="flex items-center gap-2 mb-3">
        {isAuthenticated ? (
          <ShieldCheck className="w-5 h-5 text-green-500" />
        ) : (
          <ShieldX className="w-5 h-5 text-destructive" />
        )}
        <h3 className="font-pixel text-xs text-foreground uppercase">
          Authentication Status
        </h3>
      </div>

      <div className="space-y-3">
        {/* Auth Status Row */}
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-muted-foreground">Status</span>
          <span className={`font-pixel text-[9px] px-2 py-0.5 rounded ${
            isAuthenticated 
              ? 'bg-green-500/20 text-green-500' 
              : 'bg-destructive/20 text-destructive'
          }`}>
            {isAuthenticating ? 'Authenticating...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </div>

        {/* Wallet Address Row */}
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-muted-foreground">Wallet</span>
          <span className="font-pixel text-[9px] text-foreground font-mono">
            {walletAddress 
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : 'Not connected'
            }
          </span>
        </div>

        {/* Auth User Linkage Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link2 className="w-3 h-3 text-muted-foreground" />
            <span className="font-pixel text-[9px] text-muted-foreground">Auth Link</span>
          </div>
          <span className={`font-pixel text-[9px] px-2 py-0.5 rounded ${
            isLinked
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {isLinked ? 'Linked' : 'Not Linked'}
          </span>
        </div>

        {/* Auth User ID (if linked) */}
        {displayAuthId && (
          <div className="pt-2 border-t border-border/50">
            <span className="font-pixel text-[8px] text-muted-foreground block mb-1">Auth User ID</span>
            <span className="font-mono text-[8px] text-foreground/70 break-all">
              {displayAuthId}
            </span>
          </div>
        )}

        {/* Sign In Button (if not authenticated) */}
        {!isAuthenticated && walletAddress && (
          <Button
            onClick={() => signIn()}
            disabled={isAuthenticating}
            size="sm"
            className="w-full font-pixel text-[9px] gap-2 mt-2"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Sign In with Wallet
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
