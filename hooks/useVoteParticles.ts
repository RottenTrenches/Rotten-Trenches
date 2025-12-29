import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useVoteParticles() {
  const fireVoteParticles = useCallback((type: 'up' | 'down', event?: React.MouseEvent) => {
    // Get position from event or use center
    const x = event ? event.clientX / window.innerWidth : 0.5;
    const y = event ? event.clientY / window.innerHeight : 0.5;

    if (type === 'up') {
      // Upvote: Green/gold particles shooting upward
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x, y },
        colors: ['#22c55e', '#84cc16', '#fbbf24', '#a3e635'],
        ticks: 100,
        gravity: 0.8,
        scalar: 0.8,
        shapes: ['star', 'circle'],
        startVelocity: 25,
        angle: 90,
        zIndex: 9999,
      });
      
      // Extra sparkle burst
      confetti({
        particleCount: 15,
        spread: 360,
        origin: { x, y },
        colors: ['#fbbf24', '#f59e0b'],
        ticks: 60,
        gravity: 0.4,
        scalar: 0.5,
        shapes: ['star'],
        startVelocity: 15,
        zIndex: 9999,
      });
    } else {
      // Downvote: Red/orange particles falling down
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { x, y },
        colors: ['#ef4444', '#f97316', '#dc2626', '#ea580c'],
        ticks: 80,
        gravity: 1.5,
        scalar: 0.7,
        shapes: ['circle'],
        startVelocity: 15,
        angle: 270,
        zIndex: 9999,
      });
      
      // Smoke-like particles
      confetti({
        particleCount: 10,
        spread: 60,
        origin: { x, y },
        colors: ['#374151', '#6b7280', '#9ca3af'],
        ticks: 50,
        gravity: 0.3,
        scalar: 0.9,
        shapes: ['circle'],
        startVelocity: 8,
        drift: 0,
        zIndex: 9999,
      });
    }
  }, []);

  return { fireVoteParticles };
}
