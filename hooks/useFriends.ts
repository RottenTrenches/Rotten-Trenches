import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';

export function useFriends(userWallet: string | null) {
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { incrementFriendsAdded } = useAchievements();

  useEffect(() => {
    if (userWallet) {
      fetchFriends();
    } else {
      setFriends([]);
    }
  }, [userWallet]);

  const fetchFriends = async () => {
    if (!userWallet) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('user_friends')
      .select('friend_wallet')
      .eq('user_wallet', userWallet);
    
    if (!error && data) {
      setFriends(data.map(f => f.friend_wallet));
    }
    setLoading(false);
  };

  const addFriend = async (friendWallet: string) => {
    if (!userWallet) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (userWallet === friendWallet) {
      toast.error("You can't add yourself as a friend");
      return false;
    }

    // Check if friend is verified
    const { data: friendProfile } = await supabase
      .from('user_profiles')
      .select('is_verified')
      .eq('wallet_address', friendWallet)
      .maybeSingle();

    if (!friendProfile?.is_verified) {
      toast.error('You can only add verified users as friends');
      return false;
    }

    const { error } = await supabase
      .from('user_friends')
      .insert({ user_wallet: userWallet, friend_wallet: friendWallet });

    if (error) {
      if (error.code === '23505') {
        toast.info('Already friends!');
      } else {
        toast.error('Failed to add friend');
      }
      return false;
    }

    setFriends(prev => [...prev, friendWallet]);
    incrementFriendsAdded();
    toast.success('Friend added!');
    return true;
  };

  const removeFriend = async (friendWallet: string) => {
    if (!userWallet) return false;

    const { data, error } = await supabase.rpc('remove_friend', {
      p_user_wallet: userWallet,
      p_friend_wallet: friendWallet,
    });

    if (error) {
      toast.error('Failed to remove friend');
      return false;
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      toast.error(result?.error || 'Failed to remove friend');
      return false;
    }

    setFriends(prev => prev.filter(f => f !== friendWallet));
    toast.success('Friend removed');
    return true;
  };

  const isFriend = (walletAddress: string) => friends.includes(walletAddress);

  return {
    friends,
    loading,
    addFriend,
    removeFriend,
    isFriend,
    refetch: fetchFriends
  };
}
