/**
 * Scoring utility functions for the leaderboard system
 * 
 * Key principles:
 * - Accuracy baseline is 50% (random chance with 2 options)
 * - Above 50% gets exponential boost, below 50% gets exponential penalty
 * - Time decay: attempts start losing value after 30 days, fully gone by 120 days
 */

/**
 * Calculate accuracy multiplier using exponential scaling
 * - 50% accuracy = 1x multiplier (baseline)
 * - 75% accuracy ≈ 2x multiplier
 * - 90% accuracy ≈ 4x multiplier
 * - 25% accuracy ≈ 0.1x multiplier (heavy penalty)
 * - 100% accuracy ≈ 5.5x multiplier
 */
export const calculateAccuracyMultiplier = (accuracy: number): number => {
  // Normalize accuracy to 0-100 range
  const acc = Math.max(0, Math.min(100, accuracy));
  
  // Shift so 50% becomes 0 (baseline)
  const shifted = acc - 50;
  
  // Use exponential function: e^(shifted * k) where k controls steepness
  // k = 0.035 gives us roughly:
  // - 50% → 1x
  // - 75% → ~2.4x  
  // - 90% → ~4x
  // - 25% → ~0.4x
  // - 0% → ~0.17x
  const k = 0.035;
  const multiplier = Math.exp(shifted * k);
  
  return multiplier;
};

/**
 * Calculate time decay factor for an attempt
 * - 0-30 days old: 100% value (decay = 1.0)
 * - 30-120 days: linear decay from 100% to 0%
 * - 120+ days: 0% value (fully decayed)
 */
export const calculateTimeDecay = (attemptDate: Date | string): number => {
  const now = new Date();
  const date = typeof attemptDate === 'string' ? new Date(attemptDate) : attemptDate;
  
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 30) {
    // First 30 days: full value
    return 1.0;
  } else if (daysDiff >= 120) {
    // After 120 days: no value
    return 0.0;
  } else {
    // 30-120 days: linear decay
    // At 30 days: 1.0
    // At 120 days: 0.0
    return 1.0 - ((daysDiff - 30) / 90);
  }
};

/**
 * Calculate weighted stats from attempts with time decay
 */
export interface AttemptData {
  is_correct: boolean;
  response_time: number;
  created_at: string;
}

export interface WeightedStats {
  accuracy: number;
  speed: number;
  effectiveTotal: number;
  effectiveCorrect: number;
}

export const calculateWeightedStats = (attempts: AttemptData[]): WeightedStats => {
  if (!attempts || attempts.length === 0) {
    return { accuracy: 0, speed: 0, effectiveTotal: 0, effectiveCorrect: 0 };
  }
  
  let weightedTotal = 0;
  let weightedCorrect = 0;
  let weightedTimeSum = 0;
  let weightedCorrectCount = 0;
  
  for (const attempt of attempts) {
    const decay = calculateTimeDecay(attempt.created_at);
    
    // Skip fully decayed attempts
    if (decay <= 0) continue;
    
    weightedTotal += decay;
    
    if (attempt.is_correct) {
      weightedCorrect += decay;
      weightedTimeSum += attempt.response_time * decay;
      weightedCorrectCount += decay;
    }
  }
  
  const accuracy = weightedTotal > 0 ? (weightedCorrect / weightedTotal) * 100 : 0;
  const speed = weightedCorrectCount > 0 ? weightedTimeSum / weightedCorrectCount : 0;
  
  return {
    accuracy: Math.round(accuracy),
    speed: Math.round(speed),
    effectiveTotal: weightedTotal,
    effectiveCorrect: weightedCorrect
  };
};

/**
 * Calculate combined score with accuracy multiplier
 * Higher is better
 */
export const calculateCombinedScore = (accuracy: number, speed: number): number => {
  if (speed === 0) return 0;
  
  const accuracyMultiplier = calculateAccuracyMultiplier(accuracy);
  
  // Base score: 1000 / speed (faster = higher)
  // Multiplied by accuracy multiplier
  const baseScore = 1000 / Math.max(speed, 1);
  
  return baseScore * accuracyMultiplier;
};

/**
 * Calculate combined score with weighted stats (includes time decay)
 */
export const calculateWeightedCombinedScore = (attempts: AttemptData[]): number => {
  const stats = calculateWeightedStats(attempts);
  return calculateCombinedScore(stats.accuracy, stats.speed);
};
