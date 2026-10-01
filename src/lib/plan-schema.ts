import { z } from "zod";

/** Shapes shared by the client form and the server-side AI function. */

export const SESSION_TYPES = ["study", "revision", "practice", "mock_test", "break"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const aiSessionSchema = z.object({
  subject: z.string().min(1).max(120),
  topic: z.string().min(1).max(200),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.number().int().min(5).max(300),
  type: z.enum(SESSION_TYPES),
});

export const aiPlanSchema = z.object({
  summary: z.string().max(1500).optional().default(""),
  recommendations: z.array(z.string().max(400)).max(12).optional().default([]),
  plan: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        sessions: z.array(aiSessionSchema).max(20),
      }),
    )
    .min(1)
    .max(60),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;

export const generatePlanInput = z.object({
  mode: z.enum(["new", "replan"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(30),
  hoursPerDay: z.number().min(0.5).max(14),
  preferredTime: z.enum(["morning", "afternoon", "evening", "night"]),
  daysAvailable: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  studyMethod: z.string().min(1).max(60),
  revisionPreference: z.string().min(1).max(60),
  breakPreference: z.string().min(1).max(60),
});
export type GeneratePlanInput = z.infer<typeof generatePlanInput>;
