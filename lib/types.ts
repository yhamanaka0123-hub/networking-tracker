import type { Priority } from "@/lib/contactSchema";

export interface Contact {
  id: number;
  name: string;
  company: string | null;
  role: string | null;
  met_where: string | null;
  notes: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string;
}
