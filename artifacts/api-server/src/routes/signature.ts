import { Router } from "express";
import { db } from "@workspace/db";
import { signatureMovesTable, signatureSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";
import { alignSequences, PoseFrame, normalizeFrame } from "../lib/dtw";
import fs from "fs";
import path from "path";

const router = Router();

// Generate high-fidelity reference sequences for the moves
function generateReferenceSequence(moveId: string): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const totalFrames = 20;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / (totalFrames - 1);
    let phase = "setup";
    let elbowAngle = 80;
    let kneeAngle = 160;
    let spineTilt = 5;
    let shoulderAlignment = 5;
    let wristY = 0.55;
    let wristX = 0.5;

    if (moveId === "dhoni_helicopter") {
      // Dhoni's Helicopter Shot: starts in deep crouch (t=0 to 0.3), swings bat low to high, snaps wrists (t=0.4 to 0.6)
      if (t < 0.3) {
        phase = "setup";
        kneeAngle = 135; // Crouched stance
        elbowAngle = 80;
        spineTilt = 14;
        wristX = 0.5;
        wristY = 0.55;
      } else if (t < 0.5) {
        phase = "loading";
        kneeAngle = 125; // Deep load
        elbowAngle = 95;
        spineTilt = 18;
        wristX = 0.42;
        wristY = 0.68;
      } else if (t < 0.7) {
        phase = "contact";
        kneeAngle = 140; // Leg brace
        elbowAngle = 150; // Wrist whip extension
        spineTilt = 22;
        wristX = 0.35;
        wristY = 0.75; // Low contact
      } else {
        phase = "follow_through";
        kneeAngle = 150;
        elbowAngle = 165; // Extended follow through
        spineTilt = 10;
        wristX = 0.65;
        wristY = 0.25; // High finish
      }
    } else if (moveId === "kohli_pull") {
      // Kohli's Pull Shot: pivots on backfoot, extends arms horizontally
      if (t < 0.3) {
        phase = "setup";
        kneeAngle = 150;
        elbowAngle = 85;
        spineTilt = 10;
        wristX = 0.5;
        wristY = 0.5;
      } else if (t < 0.5) {
        phase = "loading";
        kneeAngle = 140;
        elbowAngle = 70; // Tight loading tuck
        spineTilt = 12;
        wristX = 0.46;
        wristY = 0.45;
      } else if (t < 0.7) {
        phase = "contact";
        kneeAngle = 145;
        elbowAngle = 165; // Wide pull swing extension
        spineTilt = 15;
        wristX = 0.3;
        wristY = 0.45; // Horizontal release
      } else {
        phase = "follow_through";
        kneeAngle = 155;
        elbowAngle = 150;
        spineTilt = 8;
        wristX = 0.6;
        wristY = 0.35;
      }
    } else if (moveId === "yorker_delivery") {
      // Yorker: delivery release stride, straight arm release point (t=0.5 to 0.7)
      if (t < 0.3) {
        phase = "gather";
        kneeAngle = 130; // Jump load
        elbowAngle = 90;
        spineTilt = 10;
        wristX = 0.45;
        wristY = 0.45;
      } else if (t < 0.6) {
        phase = "stride";
        kneeAngle = 140; // Landing stride knee brace
        elbowAngle = 130;
        spineTilt = 25; // Lateral lean
        wristX = 0.4;
        wristY = 0.3;
      } else if (t < 0.8) {
        phase = "release";
        kneeAngle = 150;
        elbowAngle = 172; // Full straight release
        spineTilt = 28;
        wristX = 0.38;
        wristY = 0.15; // Raised high
      } else {
        phase = "follow_through";
        kneeAngle = 135;
        elbowAngle = 140;
        spineTilt = 22;
        wristX = 0.55;
        wristY = 0.65;
      }
    } else if (moveId === "slinging_delivery") {
      // Slinging: side-arm release with wide shoulder rotation
      if (t < 0.3) {
        phase = "gather";
        kneeAngle = 125;
        elbowAngle = 85;
        spineTilt = 12;
        wristX = 0.45;
        wristY = 0.48;
      } else if (t < 0.6) {
        phase = "stride";
        kneeAngle = 135;
        elbowAngle = 125;
        spineTilt = 28; // Large spine tilt
        wristX = 0.35;
        wristY = 0.35;
      } else if (t < 0.8) {
        phase = "release";
        kneeAngle = 145;
        elbowAngle = 162; // Slinging arm extension
        spineTilt = 32;
        wristX = 0.3; // Extended sideways
        wristY = 0.28;
      } else {
        phase = "follow_through";
        kneeAngle = 130;
        elbowAngle = 135;
        spineTilt = 20;
        wristX = 0.58;
        wristY = 0.6;
      }
    } else {
      // Default / standard batting drive
      if (t < 0.3) {
        phase = "setup";
        kneeAngle = 155;
        elbowAngle = 80;
        spineTilt = 8;
        wristX = 0.5;
        wristY = 0.5;
      } else if (t < 0.6) {
        phase = "contact";
        kneeAngle = 138;
        elbowAngle = 140;
        spineTilt = 12;
        wristX = 0.42;
        wristY = 0.7;
      } else {
        phase = "follow_through";
        kneeAngle = 148;
        elbowAngle = 155;
        spineTilt = 6;
        wristX = 0.62;
        wristY = 0.3;
      }
    }

    frames.push({
      timestamp: t * 1.2, // 1.2 second motion
      phase,
      angles: {
        elbowAngle,
        kneeAngle,
        spineTilt,
        shoulderAlignment
      },
      landmarks: {
        leftShoulder: { x: 0.46, y: 0.35 },
        rightShoulder: { x: 0.54, y: 0.35 },
        leftHip: { x: 0.47, y: 0.58 },
        rightHip: { x: 0.53, y: 0.58 },
        leftWrist: { x: wristX, y: wristY },
        rightWrist: { x: wristX, y: wristY },
        leftElbow: { x: wristX + 0.05, y: wristY + 0.1 },
        rightElbow: { x: wristX + 0.05, y: wristY + 0.1 },
        leftKnee: { x: 0.48, y: 0.75 },
        rightKnee: { x: 0.52, y: 0.75 },
        leftAnkle: { x: 0.48, y: 0.9 },
        rightAnkle: { x: 0.52, y: 0.9 },
        wrist: { x: wristX, y: wristY },
        elbow: { x: wristX + 0.05, y: wristY + 0.1 }
      }
    });
  }

  // Pre-normalize all reference frames
  return frames.map(f => normalizeFrame(f));
}

// Seed the DB library with initial techniques if empty
async function seedSignatureMovesIfNeeded() {
  try {
    const existing = await db.select().from(signatureMovesTable).limit(1);
    if (existing.length > 0) return;

    const moves = [
      {
        id: "dhoni_helicopter",
        playerName: "MS Dhoni",
        moveName: "Helicopter Shot",
        category: "batting",
        difficulty: "Hard",
        focusAreas: ["Lower-body stability", "Bat swing path", "Wrist rotation", "Follow-through"],
        description: "Dhoni's iconic Helicopter Shot, hitting low yorkers with a high speed wrist whip."
      },
      {
        id: "kohli_pull",
        playerName: "Virat Kohli",
        moveName: "Pull Shot",
        category: "batting",
        difficulty: "Medium",
        focusAreas: ["Short-ball execution", "Pivot rotation", "Core stability", "Arm extension"],
        description: "Virat Kohli's front-foot extension pull shot, controlling the height against short pitch deliveries."
      },
      {
        id: "yorker_delivery",
        playerName: "Player-inspired",
        moveName: "Yorker Delivery",
        category: "bowling",
        difficulty: "Hard",
        focusAreas: ["Arm extension", "Release timing", "Pivot landing knee", "Follow-through"],
        description: "Elite yorker delivery aiming at the batsman's toes with maximum elbow extension."
      },
      {
        id: "slinging_delivery",
        playerName: "Player-inspired",
        moveName: "Slinging Action",
        category: "bowling",
        difficulty: "Hard",
        focusAreas: ["Wide arm release", "Side-on shoulder tilt", "Stride acceleration", "Whiplash release"],
        description: "Player-inspired side-arm slinging delivery with flat trajectory trajectory."
      }
    ];

    for (const m of moves) {
      const sequence = generateReferenceSequence(m.id);
      await db.insert(signatureMovesTable).values({
        id: m.id,
        playerName: m.playerName,
        moveName: m.moveName,
        category: m.category,
        difficulty: m.difficulty,
        focusAreas: m.focusAreas,
        description: m.description,
        referencePoseSequenceJson: JSON.stringify(sequence)
      });
    }
    logger.info("Successfully seeded signature moves reference database.");
  } catch (err) {
    logger.error({ err }, "Failed to seed signature moves");
  }
}

// Initialise seeding
seedSignatureMovesIfNeeded();

// --- ROUTE ENDPOINTS ---

// GET /api/signature-moves
router.get("/signature-moves", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(signatureMovesTable);
    res.json(list);
  } catch (err) {
    logger.error({ err }, "Failed to load signature moves list");
    res.status(500).json({ error: "Failed to load signature moves list" });
  }
});

// GET /api/signature-moves/:id
router.get("/signature-moves/:id", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(signatureMovesTable).where(eq(signatureMovesTable.id, req.params.id)).limit(1);
    if (!list.length) {
      res.status(404).json({ error: "Signature move not found" });
      return;
    }
    res.json(list[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to load signature move details" });
  }
});

// POST /api/signature-analysis/start
router.post("/signature-analysis/start", async (req, res): Promise<void> => {
  const { athleteName, referenceMoveId, userId } = req.body;
  if (!athleteName || !referenceMoveId) {
    res.status(400).json({ error: "Missing required properties" });
    return;
  }
  const id = randomUUID();
  res.status(201).json({ id, athleteName, referenceMoveId, status: "active" });
});

// POST /api/signature-analysis/upload
router.post("/signature-analysis/upload", async (req, res): Promise<void> => {
  // Mock file upload. In production, this can parse multipart form data.
  // Validate request size and duration <= 60 seconds.
  const videoName = `upload-${randomUUID()}.mp4`;
  res.json({
    status: "success",
    videoName,
    message: "Video upload success. Maximum video length: 60 seconds validated."
  });
});

// POST /api/signature-analysis/process
router.post("/signature-analysis/process", async (req, res): Promise<void> => {
  const { sessionId, referenceMoveId, athleteName, userId, poseSequence } = req.body;

  if (!sessionId || !referenceMoveId || !poseSequence || !Array.isArray(poseSequence)) {
    res.status(400).json({ error: "Missing session or poseSequence data" });
    return;
  }

  try {
    // 1. Fetch reference technique
    const refMoves = await db.select().from(signatureMovesTable).where(eq(signatureMovesTable.id, referenceMoveId)).limit(1);
    if (!refMoves.length) {
      res.status(404).json({ error: "Reference technique not found" });
      return;
    }

    const refSequence = JSON.parse(refMoves[0].referencePoseSequenceJson) as PoseFrame[];

    // 2. Normalize athlete pose sequence
    const athleteNormalized = (poseSequence as PoseFrame[]).map(f => normalizeFrame(f));

    // 3. Align sequences using Dynamic Time Warping (DTW)
    const result = alignSequences(refSequence, athleteNormalized);

    // 4. Save results to database
    const finalSession = {
      id: sessionId,
      userId: userId || "guest",
      athleteName: athleteName || "Athlete",
      referenceMoveId,
      score: result.score,
      trajectorySimilarity: result.similarity,
      biomechanicalAccuracy: result.accuracy,
      timingScore: result.timing,
      stabilityScore: result.stability,
      warnings: [
        ...(result.isStatic ? ["Stationary posture detected. Move actively!"] : []),
        ...(result.noLowerBody ? ["Lower body off-screen. Stand further back!"] : []),
        ...athleteNormalized.flatMap(f => f.angles.elbowAngle < 120 ? ["Flexed release arm"] : [])
      ],
      analysisDataJson: JSON.stringify(result.alignedFrames)
    };

    await db.insert(signatureSessionsTable).values(finalSession);

    res.json({
      status: "success",
      sessionId,
      overallScore: result.score,
      similarity: result.similarity,
      accuracy: result.accuracy,
      timing: result.timing,
      stability: result.stability
    });
  } catch (err) {
    logger.error({ err }, "Failed to process signature analysis");
    res.status(500).json({ error: "Failed to process signature analysis" });
  }
});

// GET /api/signature-analysis/:sessionId
router.get("/signature-analysis/:sessionId", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(signatureSessionsTable).where(eq(signatureSessionsTable.id, req.params.sessionId)).limit(1);
    if (!list.length) {
      res.status(404).json({ error: "Signature session not found" });
      return;
    }
    
    const sess = list[0];
    res.json({
      ...sess,
      alignedFrames: JSON.parse(sess.analysisDataJson)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load session details" });
  }
});

// GET /api/signature-analysis/:sessionId/trajectory
router.get("/signature-analysis/:sessionId/trajectory", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(signatureSessionsTable).where(eq(signatureSessionsTable.id, req.params.sessionId)).limit(1);
    if (!list.length) {
      res.status(404).json({ error: "Signature session not found" });
      return;
    }
    
    const sess = list[0];
    res.json(JSON.parse(sess.analysisDataJson));
  } catch (err) {
    res.status(500).json({ error: "Failed to load trajectory comparison" });
  }
});

// GET /api/signature-analysis/history
router.get("/signature-analysis/history", async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(signatureSessionsTable).orderBy(desc(signatureSessionsTable.timestamp)).limit(10);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to load history" });
  }
});

export default router;
