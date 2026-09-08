import { describe, expect, it } from "vitest";
import { contactInputSchema } from "@/lib/contactSchema";

describe("contactInputSchema", () => {
  it("accepts valid input", () => {
    const result = contactInputSchema.safeParse({
      name: "Ada Lovelace",
      company: "Analytical Engines Inc",
      role: "Mathematician",
      met_where: "a conference",
      notes: "Met at a conference.",
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = contactInputSchema.safeParse({
      name: "",
      priority: "medium",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeTruthy();
    }
  });

  it("rejects a name that is only whitespace", () => {
    const result = contactInputSchema.safeParse({
      name: "   ",
      priority: "medium",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const result = contactInputSchema.safeParse({
      name: "Grace Hopper",
      priority: "urgent",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.priority).toBeTruthy();
    }
  });

  it("requires a priority to be present", () => {
    const result = contactInputSchema.safeParse({ name: "Alan Turing" });
    expect(result.success).toBe(false);
  });
});
