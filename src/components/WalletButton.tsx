import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Wallet, LogOut } from 'lucide-react';

export const WalletButton = () => {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const truncatedAddress = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 transition-all duration-200 rounded"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={connecting}
    >
      {publicKey ? (
        <>
          <LogOut className="w-4 h-4" />
          <span className="font-pixel text-[8px] uppercase">{truncatedAddress}</span>
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          <span className="font-pixel text-[8px] uppercase">
            {connecting ? 'Connecting...' : 'Connect'}
          </span>
        </>
      )}
    </motion.button>
  );
};
