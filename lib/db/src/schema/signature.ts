import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const signatureMovesTable = pgTable("signature_moves", {
  id: text("id").primaryKey(),
  playerName: text("player_name").notNull(),
  moveName: text("move_name").notNull(),
  category: text("category").notNull(), // "batting" | "bowling"
  focusAreas: text("focus_areas").array().notNull().default([]),
  difficulty: text("difficulty").notNull(), // "Beginner" | "Medium" | "Hard"
  description: text("description").notNull(),
  referencePoseSequenceJson: text("reference_pose_sequence_json").notNull(), // Array of precomputed frames (angles, landmarks, phases)
});

export const signatureSessionsTable = pgTable("signature_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  athleteName: text("athlete_name").notNull(),
  referenceMoveId: text("reference_move_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  score: real("score").notNull(),
  trajectorySimilarity: real("trajectory_similarity").notNull(),
  biomechanicalAccuracy: real("biomechanical_accuracy").notNull(),
  timingScore: real("timing_score").notNull(),
  stabilityScore: real("stability_score").notNull(),
  warnings: text("warnings").array().notNull().default([]),
  analysisDataJson: text("analysis_data_json").notNull(), // Stores user pose landmarks & timing sequence
});

export const insertSignatureMoveSchema = createInsertSchema(signatureMovesTable);
export const insertSignatureSessionSchema = createInsertSchema(signatureSessionsTable);

export type SignatureMove = typeof signatureMovesTable.$inferSelect;
export type SignatureSession = typeof signatureSessionsTable.$inferSelect;
