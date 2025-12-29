import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Hardcoded admin wallet address
const ADMIN_WALLET = '96HvKxa7FzbSsSK2nD4Yc1AtdMNUUUoqb37dyNKNJsrV';

export const useAdminRole = () => {
  const { publicKey } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRoles = () => {
      if (!publicKey) {
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      const walletAddress = publicKey.toBase58();
      
      // Check if connected wallet is the admin wallet
      const isAdminWallet = walletAddress === ADMIN_WALLET;
      
      setIsAdmin(isAdminWallet);
      setIsModerator(isAdminWallet); // Admin is also moderator
      setLoading(false);
    };

    checkRoles();
  }, [publicKey]);

  return { isAdmin, isModerator, loading };
};
