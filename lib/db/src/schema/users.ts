import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  skillLevel: text("skill_level").notNull().default("intermediate"),
  dominantHand: text("dominant_hand").notNull().default("right"),
  sportsAcademy: text("sports_academy").notNull().default("Independent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
