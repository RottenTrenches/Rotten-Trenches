import { Twitter, Facebook, Link, Share2 } from "lucide-react";
import { toast } from "sonner";

interface SocialShareButtonsProps {
  kolName: string;
  kolHandle: string;
  rating: number;
  isRotten?: boolean;
  className?: string;
}

export function SocialShareButtons({ 
  kolName, 
  kolHandle, 
  rating, 
  isRotten = false,
  className = "" 
}: SocialShareButtonsProps) {
  const baseUrl = window.location.origin;
  const shareText = isRotten 
    ? `🔥 ${kolName} (${kolHandle}) is one of the MOST ROTTEN KOLs on Rotten Trenches! Rating: ${rating.toFixed(1)}⭐ - Check them out!`
    : `✨ ${kolName} (${kolHandle}) is rated ${rating.toFixed(1)}⭐ on Rotten Trenches! Community-powered KOL tracking.`;
  
  const shareUrl = `${baseUrl}/leaderboard`;
  
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-pixel text-[8px] text-muted-foreground mr-1">
        <Share2 className="w-3 h-3 inline mr-1" />
        Share:
      </span>
      <button
        onClick={handleTwitterShare}
        className="p-2 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/40 text-[#1DA1F2] rounded transition-colors"
        title="Share on Twitter/X"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        onClick={handleFacebookShare}
        className="p-2 bg-[#4267B2]/20 hover:bg-[#4267B2]/40 text-[#4267B2] rounded transition-colors"
        title="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        onClick={handleCopyLink}
        className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors"
        title="Copy link"
      >
        <Link className="w-4 h-4" />
      </button>
    </div>
  );
}
