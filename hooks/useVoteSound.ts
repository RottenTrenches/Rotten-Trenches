import { useCallback, useRef } from 'react';

// Create audio context and oscillators for richer vote sounds
const createVoteSound = (type: 'up' | 'down') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === 'up') {
      // Upvote: Bright, satisfying "ding" with harmonics
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
      
      frequencies.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(freq * 1.2, audioContext.currentTime + 0.15);
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (i * 0.03);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      });
    } else {
      // Downvote: Deep "thud" with descending pitch
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(55, audioContext.currentTime + 0.2);
      oscillator.type = 'triangle';
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Add a subtle "crack" sound
      const noise = audioContext.createOscillator();
      const noiseGain = audioContext.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      
      noise.frequency.setValueAtTime(80, audioContext.currentTime);
      noise.type = 'sawtooth';
      noiseGain.gain.setValueAtTime(0.08, audioContext.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
      
      noise.start(audioContext.currentTime);
      noise.stop(audioContext.currentTime + 0.05);
    }
  } catch (err) {
    console.log('Audio not supported');
  }
};

export function useVoteSound() {
  const lastPlayedRef = useRef<number>(0);
  
  const playVoteSound = useCallback((type: 'up' | 'down') => {
    // Debounce to prevent rapid sound spam
    const now = Date.now();
    if (now - lastPlayedRef.current < 200) return;
    lastPlayedRef.current = now;
    
    createVoteSound(type);
  }, []);
  
  return { playVoteSound };
}
