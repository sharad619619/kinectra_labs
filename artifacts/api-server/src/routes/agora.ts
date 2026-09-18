import { Router, type IRouter } from "express";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory store for active session telemetry (for Coach Aryan Q&A during session)
export const activeSessionsTelemetry: Record<string, {
  elbowAngle: number;
  spineTilt: number;
  kneeAngle: number;
  shoulderAlignment: number;
  timestamp: number;
}[]> = {};

// Reference profiles for matching (copied for self-containment)
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

// 1. Generate RTC token for dynamic client join
router.post("/agora/token", (req, res): void => {
  const { channelName, uid } = req.body;
  if (!channelName) {
    res.status(400).json({ error: "channelName is required" });
    return;
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    logger.warn("Agora APP ID or APP Certificate is not set. Returning mock token.");
    res.json({ token: "mock_token_for_channel_" + channelName, appId: "" });
    return;
  }

  try {
    const userUid = uid !== undefined ? Number(uid) : 0;
    const expirationTimeInSeconds = 7200; // 2 hours
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      userUid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    res.json({ token, appId });
  } catch (error: any) {
    logger.error(error, "Failed to generate Agora token");
    res.status(500).json({ error: "Failed to generate token: " + error.message });
  }
});

// 2. Start Conversational AI Agent (joins RTC channel)
router.post("/agora/start-agent", async (req, res): Promise<void> => {
  const { channelName, sessionId } = req.body;
  if (!channelName || !sessionId) {
    res.status(400).json({ error: "channelName and sessionId are required" });
    return;
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  const agentId = process.env.AGORA_AGENT_ID;

  if (!appId || !appCertificate || !customerId || !customerSecret) {
    logger.warn("Agora credentials missing in .env. Returning mock start-agent session (fallback mode).");
    res.json({
      status: "mock_success",
      message: "Agora credentials missing. operating in fallback mode.",
      agentId: "mock_agent_session_12345",
      isFallback: true
    });
    return;
  }

  try {
    // Generate token for Agent (using UID 9999)
    const expirationTimeInSeconds = 7200;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agentToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      9999,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    const authHeader = "Basic " + Buffer.from(`${customerId}:${customerSecret}`).toString("base64");

    // Call Agora API to launch the conversational AI agent
    const agoraUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/join`;
    
    // Inline Gemini configuration to make setup zero-config for Agent Studio
    const payload = {
      name: "coach-aryan",
      properties: {
        channel: channelName,
        token: agentToken,
        agent_rtc_uid: 9999,
        remote_rtc_uids: ["*"],
        idle_timeout: 300,
        asr: { language: "en-US", vendor: "ares" },
        vad: { mode: "interrupt" },
        llm: {
          url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          api_key: process.env.GEMINI_API_KEY,
          system_messages: [
            {
              role: "system",
              content: `You are Coach Aryan, an expert cricket biomechanics coach. You are helping an athlete in the nets. Listen to their questions and provide brief, punchy coaching advice (under 15 words). The active sessionId is "${sessionId}". If they ask how they did on their last delivery, or to compare their pose, use the available tools to fetch data first, then answer them.`
            }
          ],
          params: { model: "gemini-1.5-flash" }
        },
        tts: {
          vendor: "microsoft",
          params: {
            voice_name: "en-US-AndrewMultilingualNeural"
          }
        }
      }
    };

    logger.info({ channelName, sessionId }, "Starting Agora Conversational AI Agent...");
    const response = await globalThis.fetch(agoraUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, "Agora API start agent failed");
      res.status(502).json({ error: "Agora API start agent failed: " + errText });
      return;
    }

    const data = (await response.json()) as any;
    res.json({
      status: "success",
      agentId: data.agent_id || "agent_session",
      isFallback: false
    });
  } catch (error: any) {
    logger.error(error, "Error starting Agora Agent");
    res.status(500).json({ error: "Internal server error starting agent: " + error.message });
  }
});

// 3. Stop Conversational AI Agent
router.post("/agora/stop-agent", async (req, res): Promise<void> => {
  const { agentId } = req.body;
  if (!agentId) {
    res.status(400).json({ error: "agentId is required" });
    return;
  }

  const appId = process.env.AGORA_APP_ID;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

  if (agentId.startsWith("mock_") || !appId || !customerId || !customerSecret) {
    logger.info({ agentId }, "Stopping mock agent session (fallback mode).");
    res.json({ status: "success", message: "Mock agent stopped." });
    return;
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${customerId}:${customerSecret}`).toString("base64");
    const agoraUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/agents/${agentId}/leave`;

    const response = await globalThis.fetch(agoraUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, "Agora API stop agent failed");
      res.status(502).json({ error: "Agora API stop agent failed: " + errText });
      return;
    }

    res.json({ status: "success", message: "Agent stopped successfully." });
  } catch (error: any) {
    logger.error(error, "Error stopping Agora Agent");
    res.status(500).json({ error: "Internal server error stopping agent: " + error.message });
  }
});

// 4. Webhook tool call router for LLM (Gemini) integration
router.post("/agora/agent-tool-call", async (req, res): Promise<void> => {
  logger.info({ body: req.body }, "Received tool call from Agora Agent");

  const functionName = req.body.functionName || req.body.name || req.body.payload?.name || "";
  const args = req.body.arguments || req.body.args || req.body.payload?.arguments || {};
  const sessionId = args.sessionId || "";

  if (!sessionId) {
    res.json({ result: "Could not find active session ID to fetch telemetry." });
    return;
  }

  if (functionName === "get_latest_delivery_metrics") {
    const frames = activeSessionsTelemetry[sessionId] || [];
    if (frames.length === 0) {
      res.json({ result: "No deliveries recorded yet in this session." });
      return;
    }
    const latest = frames[frames.length - 1];
    res.json({
      result: `The last delivery metrics were: elbow extension angle is ${latest.elbowAngle.toFixed(1)} degrees, spine lateral tilt is ${latest.spineTilt.toFixed(1)} degrees, front landing knee angle is ${latest.kneeAngle.toFixed(1)} degrees, and shoulder alignment is ${latest.shoulderAlignment.toFixed(1)} degrees.`
    });
    return;
  }

  if (functionName === "find_pro_player_match") {
    const frames = activeSessionsTelemetry[sessionId] || [];
    if (frames.length === 0) {
      res.json({ result: "No deliveries recorded yet. Match cannot be computed." });
      return;
    }
    const latest = frames[frames.length - 1];
    const poseVector = [latest.elbowAngle, latest.spineTilt, latest.kneeAngle, latest.shoulderAlignment];

    // Compute similarity matching locally
    const candidates = PRO_POSES.filter(p => p.analysisType === "bowling");
    let bestMatch = null;
    let bestSim = -1;

    for (const candidate of candidates) {
      const sim = cosineSimilarity(poseVector, candidate.vector);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      res.json({
        result: `Your last delivery is a ${(bestSim * 100).toFixed(1)}% match to the professional bowler ${bestMatch.name} (${bestMatch.role}). Coach advice: ${bestMatch.description}`
      });
    } else {
      res.json({ result: "No matching professional player found in references." });
    }
    return;
  }

  res.status(404).json({ error: `Function ${functionName} not found` });
});

// 5. Save intermediate frame from client to enable tool calls during session
router.post("/session/:sessionId/frame", (req, res): void => {
  const { sessionId } = req.params;
  const { elbowAngle, spineTilt, kneeAngle, shoulderAlignment } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  if (!activeSessionsTelemetry[sessionId]) {
    activeSessionsTelemetry[sessionId] = [];
  }

  activeSessionsTelemetry[sessionId].push({
    elbowAngle: Number(elbowAngle || 0),
    spineTilt: Number(spineTilt || 0),
    kneeAngle: Number(kneeAngle || 0),
    shoulderAlignment: Number(shoulderAlignment || 0),
    timestamp: Date.now()
  });

  // Keep last 50 entries
  if (activeSessionsTelemetry[sessionId].length > 50) {
    activeSessionsTelemetry[sessionId].shift();
  }

  res.json({ status: "success" });
});

export default router;
