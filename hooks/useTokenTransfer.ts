import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { toast } from 'sonner';

// Devnet test token - replace with actual $ROTTEN mint address in production
const ROTTEN_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Using SOL as placeholder

export const useTokenTransfer = () => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const transferTokens = async (
    recipientAddress: string,
    amount: number
  ): Promise<string | null> => {
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const recipientPubkey = new PublicKey(recipientAddress);
      
      // For devnet testing, we'll do a simple SOL transfer as placeholder
      // In production, this would use SPL token transfer with the actual $ROTTEN token
      const lamports = Math.floor(amount * 1e9); // Convert to lamports (using SOL for demo)
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: Math.min(lamports, 1000000), // Cap at 0.001 SOL for testing
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    } catch (error) {
      console.error('Token transfer failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          toast.error('Insufficient funds for transfer');
        } else if (error.message.includes('rejected')) {
          toast.error('Transaction rejected by user');
        } else {
          toast.error(`Transfer failed: ${error.message}`);
        }
      }
      return null;
    }
  };

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  return {
    transferTokens,
    validateAddress,
    isConnected: !!publicKey,
    walletAddress: publicKey?.toBase58() || null,
  };
};
