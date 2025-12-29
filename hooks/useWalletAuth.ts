import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import bs58 from 'bs58';

interface WalletAuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  session: Session | null;
  user: User | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

export function useWalletAuth(): WalletAuthState {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto sign-out when wallet disconnects
  useEffect(() => {
    if (!connected && session) {
      // Wallet disconnected but still has session - sign out
      supabase.auth.signOut().then(() => {
        setSession(null);
        setUser(null);
      });
    }
  }, [connected, session]);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (isAuthenticating) {
      return false;
    }

    setIsAuthenticating(true);

    try {
      const walletAddress = publicKey.toBase58();
      
      // Create a message to sign
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Sign this message to authenticate with KOL Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
      
      // Request signature from wallet
      const messageBytes = new TextEncoder().encode(message);
      let signature: string;
      
      try {
        const signatureBytes = await signMessage(messageBytes);
        signature = bs58.encode(signatureBytes);
      } catch (signError: any) {
        if (signError?.message?.includes('User rejected')) {
          toast.error('Signature request was rejected');
        } else {
          toast.error('Failed to sign message');
          console.error('Sign error:', signError);
        }
        setIsAuthenticating(false);
        return false;
      }

      // Call the edge function to verify and authenticate
      const { data, error } = await supabase.functions.invoke('wallet-auth', {
        body: {
          wallet_address: walletAddress,
          message,
          signature,
        },
      });

      if (error) {
        console.error('Wallet auth error:', error);
        toast.error('Authentication failed');
        setIsAuthenticating(false);
        return false;
      }

      if (!data?.success || !data?.session) {
        console.error('Invalid auth response:', data);
        toast.error(data?.error || 'Authentication failed');
        setIsAuthenticating(false);
        return false;
      }

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Session set error:', sessionError);
        toast.error('Failed to establish session');
        setIsAuthenticating(false);
        return false;
      }

      toast.success('Wallet authenticated successfully!');
      setIsAuthenticating(false);
      return true;
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Authentication failed');
      setIsAuthenticating(false);
      return false;
    }
  }, [publicKey, signMessage, isAuthenticating]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      // Optionally disconnect wallet
      if (disconnect) {
        await disconnect();
      }
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  }, [disconnect]);

  return {
    isAuthenticated: !!session && !!user,
    isAuthenticating,
    session,
    user,
    signIn,
    signOut,
  };
}