import { z } from "zod";

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

// Required-field and priority validation lives here so both the client
// form (for inline feedback) and the API route (the authoritative check)
// use the exact same rules.
export const contactInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),
  company: z.string().trim().optional().or(z.literal("")),
  role: z.string().trim().optional().or(z.literal("")),
  met_where: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  priority: z.enum(PRIORITIES, {
    errorMap: () => ({ message: `Priority must be one of: ${PRIORITIES.join(", ")}` }),
  }),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
