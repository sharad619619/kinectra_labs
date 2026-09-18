import { Router, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../utils/auth";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "professional"]).default("intermediate"),
  dominantHand: z.enum(["right", "left"]).default("right"),
  sportsAcademy: z.string().optional().default("Independent"),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid registration parameters", details: parsed.error.issues });
      return;
    }

    const { username, email, password, skillLevel, dominantHand, sportsAcademy } = parsed.data;

    // Check if user already exists
    const existingUsername = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }

    const existingEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }

    const passwordHash = hashPassword(password);
    const id = Math.random().toString(36).substring(2, 11);

    const userRecords = await db.insert(usersTable).values({
      id,
      username,
      email,
      passwordHash,
      skillLevel: skillLevel as any,
      dominantHand,
      sportsAcademy,
    });

    const userProfile = {
      id,
      username,
      email,
      skillLevel,
      dominantHand,
      sportsAcademy,
    };

    const token = signToken({ id, username });

    res.status(201).json({ token, user: userProfile });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid login credentials" });
      return;
    }

    const { username, password } = parsed.data;
    const loginIdentifier = username.trim();

    // Lookup user by username OR email
    const users = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, loginIdentifier),
          eq(usersTable.email, loginIdentifier.toLowerCase())
        )
      )
      .limit(1);

    if (users.length === 0) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const user = users[0];
    const passwordMatch = verifyPassword(password, user.passwordHash);

    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      skillLevel: user.skillLevel,
      dominantHand: user.dominantHand,
      sportsAcademy: user.sportsAcademy,
    };

    const token = signToken({ id: user.id, username: user.username });

    res.json({ token, user: userProfile });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authorization required" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id))
      .limit(1);

    if (users.length === 0) {
      res.status(401).json({ error: "User session not found" });
      return;
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      skillLevel: user.skillLevel,
      dominantHand: user.dominantHand,
      sportsAcademy: user.sportsAcademy,
    });
  } catch (err) {
    req.log.error({ err }, "Auth me verification failed");
    res.status(500).json({ error: "Auth verification failed" });
  }
});

const googleClient = new OAuth2Client();
const googleLoginSchema = z.object({
  credential: z.string(),
});

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = googleLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.issues });
      return;
    }

    const { credential } = parsed.data;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      req.log.error("GOOGLE_CLIENT_ID environment variable is not configured");
      res.status(500).json({ error: "Google authentication is not configured on the server" });
      return;
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token payload" });
      return;
    }

    const email = payload.email;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const user = existingUser[0];
      const userProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        skillLevel: user.skillLevel,
        dominantHand: user.dominantHand,
        sportsAcademy: user.sportsAcademy,
      };

      const token = signToken({ id: user.id, username: user.username });
      res.json({ token, user: userProfile });
      return;
    }

    // Register a new user
    // Generate a unique username based on the email prefix
    let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    if (baseUsername.length < 2) {
      baseUsername = "athlete_" + Math.random().toString(36).substring(2, 6);
    }
    
    let username = baseUsername;
    let usernameCheck = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    while (usernameCheck.length > 0) {
      username = `${baseUsername}_${Math.random().toString(36).substring(2, 6)}`;
      usernameCheck = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);
    }

    const id = Math.random().toString(36).substring(2, 11);
    const randomPassword = crypto.randomUUID();
    const passwordHash = hashPassword(randomPassword);

    await db.insert(usersTable).values({
      id,
      username,
      email,
      passwordHash,
      skillLevel: "intermediate",
      dominantHand: "right",
      sportsAcademy: "Independent",
    });

    const userProfile = {
      id,
      username,
      email,
      skillLevel: "intermediate",
      dominantHand: "right",
      sportsAcademy: "Independent",
    };

    const token = signToken({ id, username });

    res.status(201).json({ token, user: userProfile });
  } catch (err) {
    req.log.error({ err }, "Google authentication failed");
    res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
