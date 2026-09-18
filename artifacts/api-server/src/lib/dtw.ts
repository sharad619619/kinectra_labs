interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface PoseFrame {
  timestamp: number;
  phase: string;
  angles: {
    elbowAngle: number;
    kneeAngle: number;
    spineTilt: number;
    shoulderAlignment: number;
  };
  landmarks: {
    nose?: PoseLandmark;
    leftShoulder?: PoseLandmark;
    rightShoulder?: PoseLandmark;
    leftElbow?: PoseLandmark;
    rightElbow?: PoseLandmark;
    leftWrist?: PoseLandmark;
    rightWrist?: PoseLandmark;
    leftHip?: PoseLandmark;
    rightHip?: PoseLandmark;
    leftKnee?: PoseLandmark;
    rightKnee?: PoseLandmark;
    leftAnkle?: PoseLandmark;
    rightAnkle?: PoseLandmark;
    // Normalized or custom properties
    wrist?: PoseLandmark;
    elbow?: PoseLandmark;
    shoulder?: PoseLandmark;
    hip?: PoseLandmark;
    knee?: PoseLandmark;
    ankle?: PoseLandmark;
  };
}

/**
 * Normalizes pose landmark coordinates relative to hip center and shoulder width.
 */
export function normalizeFrame(frame: PoseFrame, isRightHanded = true): PoseFrame {
  const lHip = frame.landmarks.leftHip || { x: 0.45, y: 0.6 };
  const rHip = frame.landmarks.rightHip || { x: 0.55, y: 0.6 };
  const lShoulder = frame.landmarks.leftShoulder || { x: 0.45, y: 0.35 };
  const rShoulder = frame.landmarks.rightShoulder || { x: 0.55, y: 0.35 };

  const midHip = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2
  };

  const shoulderWidth = Math.sqrt(
    Math.pow(lShoulder.x - rShoulder.x, 2) + 
    Math.pow(lShoulder.y - rShoulder.y, 2)
  ) || 0.15;

  const wrist = isRightHanded ? frame.landmarks.rightWrist : frame.landmarks.leftWrist;
  const elbow = isRightHanded ? frame.landmarks.rightElbow : frame.landmarks.leftElbow;
  const shoulder = isRightHanded ? frame.landmarks.rightShoulder : frame.landmarks.leftShoulder;
  const hip = isRightHanded ? frame.landmarks.rightHip : frame.landmarks.leftHip;
  const knee = isRightHanded ? frame.landmarks.rightKnee : frame.landmarks.leftKnee;
  const ankle = isRightHanded ? frame.landmarks.rightAnkle : frame.landmarks.leftAnkle;

  const normalizePoint = (pt?: PoseLandmark) => {
    if (!pt) return { x: 0, y: 0 };
    return {
      x: (pt.x - midHip.x) / shoulderWidth,
      y: (pt.y - midHip.y) / shoulderWidth
    };
  };

  return {
    ...frame,
    landmarks: {
      ...frame.landmarks,
      wrist: normalizePoint(wrist),
      elbow: normalizePoint(elbow),
      shoulder: normalizePoint(shoulder),
      hip: normalizePoint(hip),
      knee: normalizePoint(knee),
      ankle: normalizePoint(ankle)
    }
  };
}

/**
 * Computes difference distance cost between reference and athlete frame metrics
 */
function computeFrameDistance(ref: PoseFrame, ath: PoseFrame): number {
  // Angles diff (normalized 0 to 1)
  const dElbow = Math.abs(ref.angles.elbowAngle - ath.angles.elbowAngle) / 180;
  const dKnee = ref.angles.kneeAngle === -1 || ath.angles.kneeAngle === -1
    ? 0
    : Math.abs(ref.angles.kneeAngle - ath.angles.kneeAngle) / 180;
  const dSpine = Math.abs(ref.angles.spineTilt - ath.angles.spineTilt) / 90;
  const dShoulder = Math.abs(ref.angles.shoulderAlignment - ath.angles.shoulderAlignment) / 90;

  // Normalized wrist position distance
  const wRef = ref.landmarks.wrist || { x: 0, y: 0 };
  const wAth = ath.landmarks.wrist || { x: 0, y: 0 };
  const dWrist = Math.sqrt(
    Math.pow(wRef.x - wAth.x, 2) +
    Math.pow(wRef.y - wAth.y, 2)
  );

  return (dElbow * 0.3 + dKnee * 0.25 + dSpine * 0.2 + dShoulder * 0.1 + dWrist * 0.15);
}

export interface DTWResult {
  score: number;
  similarity: number;
  accuracy: number;
  timing: number;
  stability: number;
  warpingPath: [number, number][]; // referenceIndex, athleteIndex
  alignedFrames: {
    time: number;
    phase: string;
    refAngle: number;
    athAngle: number;
    deviation: number;
    refWrist: { x: number; y: number };
    athWrist: { x: number; y: number };
  }[];
  isStatic?: boolean;
  noLowerBody?: boolean;
}

/**
 * Performs Dynamic Time Warping (DTW) to align pose sequences.
 */
export function alignSequences(refSeq: PoseFrame[], athSeq: PoseFrame[]): DTWResult {
  const N = refSeq.length;
  const M = athSeq.length;

  if (N === 0 || M === 0) {
    return {
      score: 50, similarity: 50, accuracy: 50, timing: 50, stability: 50,
      warpingPath: [], alignedFrames: []
    };
  }

  // Create DP Cost Matrix
  const dp: number[][] = Array(N).fill(null).map(() => Array(M).fill(Infinity));
  const path: any[][] = Array(N).fill(null).map(() => Array(M).fill(null));

  dp[0][0] = computeFrameDistance(refSeq[0], athSeq[0]);
  path[0][0] = [];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      if (i === 0 && j === 0) continue;

      const cost = computeFrameDistance(refSeq[i], athSeq[j]);
      let minVal = Infinity;
      let prev: [number, number] | null = null;

      // Diagonal
      if (i > 0 && j > 0 && dp[i - 1][j - 1] < minVal) {
        minVal = dp[i - 1][j - 1];
        prev = [i - 1, j - 1];
      }
      // Vertical
      if (i > 0 && dp[i - 1][j] < minVal) {
        minVal = dp[i - 1][j];
        prev = [i - 1, j];
      }
      // Horizontal
      if (j > 0 && dp[i][j - 1] < minVal) {
        minVal = dp[i][j - 1];
        prev = [i, j - 1];
      }

      dp[i][j] = cost + minVal;
      path[i][j] = prev ? [...(path[prev[0]][prev[1]] || []), prev] : [];
    }
  }

  const finalPath: [number, number][] = [...(path[N - 1][M - 1] || []), [N - 1, M - 1] as [number, number]];

  // 1. Similarity (overall cost match)
  const totalCost = dp[N - 1][M - 1];
  const avgCost = totalCost / finalPath.length;
  const similarity = Math.max(0, Math.min(100, Math.round(100 - avgCost * 260)));

  // 2. Accuracy (specific joint angle match)
  let angleDiffSum = 0;
  finalPath.forEach(([rIdx, aIdx]) => {
    angleDiffSum += Math.abs(refSeq[rIdx].angles.elbowAngle - athSeq[aIdx].angles.elbowAngle);
  });
  const avgAngleDiff = angleDiffSum / finalPath.length;
  const accuracy = Math.max(0, Math.min(100, Math.round(100 - avgAngleDiff * 1.5)));

  // 3. Timing Deviation
  // Compare how long each sequence spent in various phases
  const getPhaseWeights = (seq: PoseFrame[]) => {
    const weights: Record<string, number> = {};
    seq.forEach((f) => {
      weights[f.phase] = (weights[f.phase] || 0) + 1;
    });
    // Convert to ratio
    Object.keys(weights).forEach((k) => { weights[k] /= seq.length; });
    return weights;
  };
  const refWeights = getPhaseWeights(refSeq);
  const athWeights = getPhaseWeights(athSeq);
  let timingDiff = 0;
  Object.keys(refWeights).forEach((k) => {
    timingDiff += Math.abs(refWeights[k] - (athWeights[k] || 0));
  });
  const timing = Math.max(0, Math.min(100, Math.round(100 - timingDiff * 80)));

  // 4. Stability
  let stabilitySum = 0;
  athSeq.forEach((f) => {
    // Score balance of athlete frames
    const hipL = f.landmarks.leftHip || { y: 0.6 };
    const hipR = f.landmarks.rightHip || { y: 0.6 };
    const diff = Math.abs(hipL.y - hipR.y);
    stabilitySum += Math.max(0, 100 - diff * 120);
  });
  const stability = Math.round(stabilitySum / M);

  const alignedFrames = finalPath.map(([rIdx, aIdx]) => {
    const ref = refSeq[rIdx];
    const ath = athSeq[aIdx];
    return {
      time: ath.timestamp,
      phase: ref.phase,
      refAngle: Math.round(ref.angles.elbowAngle),
      athAngle: Math.round(ath.angles.elbowAngle),
      deviation: Math.round(Math.abs(ref.angles.elbowAngle - ath.angles.elbowAngle)),
      refWrist: ref.landmarks.wrist || { x: 0, y: 0 },
      athWrist: ath.landmarks.wrist || { x: 0, y: 0 },
      refPose: ref.landmarks,
      athPose: ath.landmarks
    };
  });

  // Calculate standard deviation of wrist Y coordinate and elbow angle to detect stationary/static attempts
  const wristYVals = athSeq.map((f) => f.landmarks.wrist?.y || 0);
  const elbowAngles = athSeq.map((f) => f.angles.elbowAngle);

  const getStdDev = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const wristStd = getStdDev(wristYVals);
  const elbowStd = getStdDev(elbowAngles);

  // If standard deviation is extremely low, it means the user was sitting/standing completely still
  const isStatic = wristStd < 0.04 && elbowStd < 4.0;
  const noLowerBody = athSeq.every((f) => f.angles.kneeAngle === -1);

  // Combined score (accuracy 50%, similarity 20%, timing 15%, stability 15%)
  let score = Math.round(
    accuracy * 0.5 + 
    similarity * 0.2 + 
    timing * 0.15 + 
    stability * 0.15
  );

  // Apply penalties dynamically
  if (noLowerBody) {
    score = Math.round(score * 0.55); // 45% penalty for missing lower body capture
  }
  if (isStatic) {
    score = Math.round(score * 0.12); // 88% penalty for static pose
  }

  return {
    score,
    similarity: isStatic ? Math.round(similarity * 0.12) : similarity,
    accuracy: isStatic ? Math.round(accuracy * 0.12) : accuracy,
    timing: isStatic ? Math.round(timing * 0.12) : timing,
    stability: isStatic ? Math.round(stability * 0.12) : stability,
    warpingPath: finalPath,
    alignedFrames,
    isStatic,
    noLowerBody
  };
}
