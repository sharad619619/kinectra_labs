import { Router } from "express";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";
import {
  StartSessionBody,
  EndSessionBody,
  EndSessionParams,
  GetSessionParams,
} from "@workspace/api-zod";

const router = Router();

function generateRecommendations(
  warnings: string[],
  analysisType: string
): { strengths: string[]; improvements: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  const warningSet = new Set(warnings);

  if (analysisType === "bowling") {
    if (!warningSet.has("Elbow angle too low")) {
      strengths.push("Good elbow height during delivery");
    } else {
      improvements.push("Elbow position needs work");
      recommendations.push("Maintain elbow height during release — aim for 80°-110°.");
    }
    if (!warningSet.has("Excessive spine tilt")) {
      strengths.push("Strong upright body position");
    } else {
      improvements.push("Spine tilt is excessive");
      recommendations.push("Keep upper body more upright during the delivery stride.");
    }
    if (!warningSet.has("Poor shoulder rotation")) {
      strengths.push("Consistent shoulder alignment");
    } else {
      improvements.push("Shoulder rotation needs improvement");
      recommendations.push("Focus on full shoulder rotation through the crease.");
    }
    if (warnings.length === 0) {
      strengths.push("Excellent overall bowling technique");
      recommendations.push("Continue drilling at current tempo for consistency.");
    }
  } else if (analysisType === "basketball") {
    if (!warningSet.has("Low set-point elbow flexion (Pushing shot)") && !warningSet.has("Excessive set-point elbow flexion")) {
      strengths.push("Consistent shooting elbow set point");
    } else if (warningSet.has("Low set-point elbow flexion (Pushing shot)")) {
      improvements.push("Pushing shot trajectory");
      recommendations.push("Tuck your shooting elbow to a 90° angle at your set point.");
    } else {
      improvements.push("Slow release execution");
      recommendations.push("Open up your elbow slot slightly at the set point to quicken release.");
    }
    if (!warningSet.has("Shallow leg drive dip")) {
      strengths.push("Excellent lower body kinetic load");
    } else {
      improvements.push("Shallow propulsion drive");
      recommendations.push("Dip your knees deeper (around 120°) to load leg drive force.");
    }
    if (!warningSet.has("Lateral spine lean on release (Balance drift)")) {
      strengths.push("Upright vertical launch alignment");
    } else {
      improvements.push("Lateral launch drift");
      recommendations.push("Keep your spine vertical during release; stabilize your core posture.");
    }
    if (warnings.length === 0) {
      strengths.push("Clean shooting mechanics and high release arc");
      recommendations.push("Practice catch-and-shoot repetitions to solidify shooting rhythm.");
    }
  } else if (analysisType === "badminton") {
    if (!warningSet.has("Short overhead reach (Low contact point)")) {
      strengths.push("High vertical smash contact reach");
    } else {
      improvements.push("Short overhead smash reach");
      recommendations.push("Extend hitting arm elbow fully at the peak height of the stroke.");
    }
    if (!warningSet.has("Knee translated past toe (Patellar stress)")) {
      strengths.push("Stable recovery lunge base");
    } else {
      improvements.push("Deep knee lunge overload");
      recommendations.push("Sit your hips back and keep your leading shin vertical to avoid knee strain.");
    }
    if (!warningSet.has("Rigid trunk loading posture") && !warningSet.has("Excessive lateral lean (Recovery lag)")) {
      strengths.push("Excellent core torso coiling torque");
    } else if (warningSet.has("Rigid trunk loading posture")) {
      improvements.push("Rigid pre-smash coiling loading");
      recommendations.push("Arch your shoulder line back to store core rotational energy.");
    } else {
      improvements.push("Excessive smash recovery shift");
      recommendations.push("Limit excessive side tilt to speed up recovery movement.");
    }
    if (warnings.length === 0) {
      strengths.push("High smash velocity and safe lunge balance");
      recommendations.push("Incorporate rapid-recovery agility drills after smash shots.");
    }
  } else {
    if (!warningSet.has("Head moving excessively")) {
      strengths.push("Stable head position");
    } else {
      improvements.push("Head stability is inconsistent");
      recommendations.push("Keep your eyes level and head still — watch the ball from release.");
    }
    if (!warningSet.has("Balance unstable")) {
      strengths.push("Good weight transfer and balance");
    } else {
      improvements.push("Balance needs work");
      recommendations.push("Focus on stable landing mechanics — plant the front foot firmly.");
    }
    if (!warningSet.has("Front foot delayed")) {
      strengths.push("Good front foot movement");
    } else {
      improvements.push("Front foot timing is off");
      recommendations.push("Move your front foot earlier to improve weight transfer.");
    }
    if (warnings.length === 0) {
      strengths.push("Solid batting stance and technique");
      recommendations.push("Practice footwork drills to further enhance timing.");
    }
  }

  return { strengths, improvements, recommendations };
}

router.post("/session/start", async (req, res): Promise<void> => {
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { athleteName, analysisType, skillLevel, dominantHand } = parsed.data;
  const id = randomUUID();

  try {
    await db.insert(sessionsTable).values({
      id,
      athleteName,
      analysisType,
      skillLevel,
      dominantHand,
      status: "active",
      frameCount: 0,
      avgPostureScore: 0,
      avgAlignmentScore: 0,
      avgStabilityScore: 0,
      avgEfficiencyScore: 0,
      overallScore: 0,
      warnings: [],
      strengths: [],
      improvements: [],
      recommendations: [],
    });

    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id))
      .limit(1);

    res.status(201).json(session[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to start session");
    res.status(500).json({ error: "Failed to start session" });
  }
});

router.post("/session/:sessionId/end", async (req, res): Promise<void> => {
  const paramsParsed = EndSessionParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const bodyParsed = EndSessionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { sessionId } = paramsParsed.data;
  const {
    frameCount,
    avgPostureScore,
    avgAlignmentScore,
    avgStabilityScore,
    avgEfficiencyScore,
    overallScore,
    warnings,
    snapshots,
  } = bodyParsed.data;

  try {
    const existing = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { strengths, improvements, recommendations } = generateRecommendations(
      warnings,
      existing[0].analysisType
    );

    await db
      .update(sessionsTable)
      .set({
        status: "completed",
        frameCount,
        avgPostureScore,
        avgAlignmentScore,
        avgStabilityScore,
        avgEfficiencyScore,
        overallScore,
        warnings,
        strengths,
        improvements,
        recommendations,
        snapshotsJson: snapshots ? JSON.stringify(snapshots) : "[]",
      })
      .where(eq(sessionsTable.id, sessionId));

    const updated = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    const s = updated[0];
    res.json({
      ...s,
      snapshots: s.snapshotsJson ? JSON.parse(s.snapshotsJson) : [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to end session");
    res.status(500).json({ error: "Failed to end session" });
  }
});

router.get("/session/:sessionId", async (req, res): Promise<void> => {
  const parsed = GetSessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { sessionId } = parsed.data;

  try {
    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (!session.length) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const s = session[0];
    res.json({
      ...s,
      snapshots: s.snapshotsJson ? JSON.parse(s.snapshotsJson) : [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.get("/session", async (req, res): Promise<void> => {
  try {
    const sessions = await db
      .select()
      .from(sessionsTable)
      .orderBy(desc(sessionsTable.createdAt))
      .limit(20);

    const mapped = sessions.map((s: any) => ({
      ...s,
      snapshots: s.snapshotsJson ? JSON.parse(s.snapshotsJson) : [],
    }));

    res.json(mapped);
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/session/:sessionId/chat", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const { message, history, snapshots } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (!session.length) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const s = session[0];

    // Load Gemini API Key
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      try {
        const envPath = path.join(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf-8");
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
          if (match) {
            apiKey = match[1].trim().replace(/^['"]|['"]$/g, "");
          }
        }
      } catch (err) {
        req.log.error({ err }, "Failed to read .env file manually");
      }
    }

    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not defined in process.env or .env file" });
      return;
    }

    // Compile dynamic context
    const warningsText = s.warnings && s.warnings.length > 0 
      ? s.warnings.map((w: string) => `- Warning: ${w}`).join("\n") 
      : "- No posture warnings triggered.";
      
    const recsText = s.recommendations && s.recommendations.length > 0 
      ? s.recommendations.map((r: string) => `- Recommendation: ${r}`).join("\n") 
      : "- Form is optimal. Continue regular practice.";

    let snapshotsText = "";
    if (Array.isArray(snapshots) && snapshots.length > 0) {
      snapshotsText = "\nCaptured Frame-by-Frame Posture Details:\n" + 
        snapshots.map((snap: any) => {
          const m = snap.metrics;
          const metricsStr = m ? ` (Elbow: ${m.elbowAngle}°, Spine Tilt: ${m.spineTilt}°, Knee: ${m.kneeAngle}°, Shoulder Alignment: ${m.shoulderAlignment}°)` : "";
          return `- Event Label: "${snap.label}" | Captured at ${snap.time}${metricsStr}`;
        }).join("\n");
    } else {
      snapshotsText = "\nNo frame-by-frame posture captures logged.";
    }

    const systemPrompt = `You are Kinectra's elite AI Sports Biomechanics Coach, named Coach Aryan.
You are talking to the athlete: ${s.athleteName || "Athlete"}.
Discipline: ${s.analysisType || "Cricket"} (${s.dominantHand || "right"}-handed)
Overall Biomechanical Score: ${s.overallScore || 0}/100

Active Technique Warnings:
${warningsText}

Recommended Drills:
${recsText}
${snapshotsText}

Your instructions:
1. Provide encouraging, professional coaching advice based on their metrics, warnings, and captured posture frames.
2. Directly reference their score (${s.overallScore}/100), warnings, or specific captured frame metrics (such as the elbow angle or spine tilt in their "Bowling Stance" or "Setup Load" frames) when relevant.
3. Be conversational and active. Keep your answers extremely concise (max 2-3 sentences) so the browser can read it aloud using Text-to-Speech (speechSynthesis) without lag.`;

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      // Map history turns to API format: limit to last 4 turns to avoid token overhead
      const recentHistory = history.slice(-4);
      for (const turn of recentHistory) {
        if (turn.sender && turn.text) {
          messages.push({
            role: turn.sender === "user" ? "user" : "assistant",
            content: turn.text
          });
        }
      }
    }

    messages.push({ role: "user", content: message });

    // Call Gemini OpenAI-compatible endpoint
    const response = await globalThis.fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        messages,
        temperature: 0.3,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, errorText }, "Gemini API error response");
      res.status(502).json({ error: "Failed to fetch response from Gemini AI service" });
      return;
    }

    const resJson = (await response.json()) as any;
    const replyText = resJson?.choices?.[0]?.message?.content || "";

    res.json({ reply: replyText.trim() });
  } catch (err) {
    req.log.error({ err }, "Error in chat assistant route");
    res.status(500).json({ error: "Internal server error in chat coach assistant" });
  }
});

export default router;
