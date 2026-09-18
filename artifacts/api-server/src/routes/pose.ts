import { Router, type IRouter } from "express";
import { SearchPosesBody, SearchPosesResponse, IngestPosesResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory professional poses database for matching / fallback
interface ProPose {
  name: string;
  role: string;
  analysisType: "batting" | "bowling";
  description: string;
  vector: number[]; // [elbowAngle, spineTilt, kneeAngle, shoulderAlignment]
}

const PRO_POSES: ProPose[] = [
  {
    name: "Virat Kohli",
    role: "Professional Batter",
    analysisType: "batting",
    description: "Virat's front-foot cover drive is textbook perfection. Focus on leaning into the ball, keeping a stable head, and pointing your lead elbow high toward the bowler.",
    vector: [155, 12, 120, 15]
  },
  {
    name: "Steve Smith",
    role: "Professional Batter",
    analysisType: "batting",
    description: "Steve Smith uses a distinct back-and-across trigger movement. Prioritize foot alignment and brace your core to maintain head stability at release.",
    vector: [110, 18, 140, 10]
  },
  {
    name: "Kane Williamson",
    role: "Professional Batter",
    analysisType: "batting",
    description: "Kane Williamson excels at playing the ball late with soft hands directly under his nose. Maintain a compact elbow alignment and relaxed posture.",
    vector: [130, 8, 135, 8]
  },
  {
    name: "Jasprit Bumrah",
    role: "Professional Bowler",
    analysisType: "bowling",
    description: "Jasprit Bumrah features a unique, hyper-extended release with high shoulders. Keep your lead arm high and pull it down forcefully to drive momentum.",
    vector: [175, 25, 160, 45]
  },
  {
    name: "Hardik Pandya",
    role: "Professional Bowler",
    analysisType: "bowling",
    description: "Hardik Pandya utilizes a clean, upright delivery stride with strong front-knee brace. Maintain trunk stability during landing to protect your back.",
    vector: [135, 15, 130, 25]
  },
  {
    name: "Mitchell Starc",
    role: "Professional Bowler",
    analysisType: "bowling",
    description: "Mitchell Starc releases from a towering height with an explosive front-foot block. Focus on maximizing elbow height and driving your chest through.",
    vector: [170, 20, 150, 40]
  }
];

// Helper functions for local cosine similarity fallback
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, idx) => sum + val * (b[idx] || 0), 0);
}

function magnitude(a: number[]): number {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// Ingest route (simplified - Qdrant cloud disabled)
router.post("/poses/ingest", async (req, res) => {
  try {
    logger.info("Ingest route completed using local in-memory reference poses.");
    res.json(IngestPosesResponse.parse({
      status: "local_fallback",
      message: "Qdrant Cloud disabled. Using local in-memory seed references."
    }));
  } catch (error: any) {
    logger.error(error, "Failed to ingest poses");
    res.status(500).json({ error: "Ingestion failed: " + error.message });
  }
});

// Search route to find matching professional pose
router.post("/poses/search", async (req, res): Promise<void> => {
  const parsed = SearchPosesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body: " + JSON.stringify(parsed.error.format()) });
    return;
  }

  const { analysisType, poseVector } = parsed.data;

  if (poseVector.length !== 4) {
    res.status(400).json({ error: "Pose vector must contain exactly 4 angles [elbow, spine, knee, shoulder]." });
    return;
  }

  logger.info("Performing local in-memory pose matching...");
  const candidates = PRO_POSES.filter(p => p.analysisType === analysisType);
  let bestMatch = null;
  let bestSim = -1;

  for (const candidate of candidates) {
    const sim = cosineSimilarity(poseVector, candidate.vector);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = candidate;
    }
  }

  let matchResult = null;
  if (bestMatch) {
    matchResult = {
      matchName: bestMatch.name,
      similarity: Number(bestSim.toFixed(6)),
      role: bestMatch.role,
      description: bestMatch.description,
      idealVector: bestMatch.vector
    };
  }

  if (!matchResult) {
    res.status(404).json({ error: "No matching poses found." });
    return;
  }

  res.json(SearchPosesResponse.parse(matchResult));
});

export default router;
