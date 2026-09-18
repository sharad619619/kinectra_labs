import { Router, type IRouter } from "express";
import { SynthesizeSpeechQueryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/session/speech/synthesize", async (req, res): Promise<void> => {
  const parsed = SynthesizeSpeechQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters: " + JSON.stringify(parsed.error.format()) });
    return;
  }

  const { text } = parsed.data;
  const apiKey = process.env.RIME_API_KEY;

  if (!apiKey) {
    logger.warn("RIME_API_KEY is not defined. Skipping dynamic Rime speech synthesis.");
    res.status(400).json({ error: "Rime Speech API is not configured on this server." });
    return;
  }

  try {
    logger.info({ text }, "Calling Rime AI TTS API...");

    // Call Rime AI Text-to-Speech API
    const rimeResponse = await globalThis.fetch("https://users.rime.ai/v1/rime-tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        speaker: "ursa",     // High-quality expressive male coach voice
        text: text,
        modelId: "coda"      // High-quality standard model supporting ursa
      })
    });

    if (!rimeResponse.ok) {
      const errText = await rimeResponse.text();
      logger.error({ status: rimeResponse.status, errText }, "Rime AI API returned an error");
      res.status(502).json({ error: "Failed to generate speech from Rime AI" });
      return;
    }

    // Convert raw array buffer to a node binary Buffer
    const arrayBuffer = await rimeResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);
  } catch (error: any) {
    logger.error(error, "Error during Rime Speech proxy call");
    res.status(500).json({ error: "Internal server error during speech synthesis: " + error.message });
  }
});

// Route to inject custom instructions (warnings) into the active Agora Conversational Agent session
router.post("/session/speech/inject-alert", async (req, res): Promise<void> => {
  const { text, agentId } = req.body;

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const appId = process.env.AGORA_APP_ID;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

  // Fallback check
  if (!agentId || agentId.startsWith("mock_") || !appId || !customerId || !customerSecret) {
    logger.info({ agentId, text }, "Agora agent inactive or in mock mode. Requesting client fallback TTS.");
    res.json({ status: "fallback", message: "Agora agent not active. Play TTS locally." });
    return;
  }

  try {
    logger.info({ agentId, text }, "Injecting alert instruction into Agora Agent...");
    const authHeader = "Basic " + Buffer.from(`${customerId}:${customerSecret}`).toString("base64");
    const agoraUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/agents/${agentId}/custom-instructions`;

    const response = await globalThis.fetch(agoraUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        on_listening_action: "interrupt" // Immediately interrupt and speak the warning
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, "Agora custom instructions injection failed");
      res.status(502).json({ error: "Agora custom instructions injection failed: " + errText });
      return;
    }

    res.json({ status: "success", message: "Instruction injected into Agora agent session." });
  } catch (error: any) {
    logger.error(error, "Failed to inject alert to Agora");
    res.status(500).json({ error: "Internal server error injecting alert: " + error.message });
  }
});

export default router;
