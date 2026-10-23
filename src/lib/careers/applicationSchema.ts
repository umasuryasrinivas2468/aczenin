/*
  The careers application shape, shared by the form and the API route so the
  two cannot disagree about what is valid. Bounds mirror the CHECK constraints
  in supabase/migrations/20261010120000_career_application.sql.
*/

import { z } from "zod";

import { ROLE_IDS } from "@/lib/careers/roles";

export const careerApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name must be under 80 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254, "Email is too long."),
  // Spaces, dashes and brackets are stripped before the check, so
  // "+91 98765-43210" is accepted and stored as "+919876543210".
  phone: z
    .string()
    .transform((value) => value.replace(/[\s\-()]/g, ""))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, "Enter a valid phone number.")),
  skills: z
    .string()
    .trim()
    .min(2, "List at least one skill.")
    .max(1000, "Keep skills under 1000 characters."),
  projects: z
    .string()
    .trim()
    .min(10, "Tell us a little about your projects.")
    .max(4000, "Keep projects under 4000 characters."),
  resumeUrl: z
    .string()
    .trim()
    .max(500, "Link is too long.")
    .url("Enter a full link, starting with https://")
    .refine((value) => /^https?:\/\//i.test(value), "Link must start with http:// or https://"),
  // Optional: the general /careers form has no role picker, so "" or absent
  // means a general application. When present it must be a published role ID.
  roleId: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || ROLE_IDS.includes(value), "Choose one of the open roles."),
});

export type CareerApplication = z.infer<typeof careerApplicationSchema>;

export function firstIssue(error: z.ZodError): { field: string; message: string } {
  const issue = error.issues[0];
  if (!issue) return { field: "form", message: "Check the form and try again." };
  return { field: issue.path.join("."), message: issue.message };
}
