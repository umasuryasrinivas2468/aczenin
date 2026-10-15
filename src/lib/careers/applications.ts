/*
  Reads career applications for /axe/careers.

  Unlike lead_event, these rows ARE personal data (name, email, phone). They are
  read only server-side with the service-role key, only behind the /axe gate,
  and filtering happens in the query so the page never receives rows it does
  not show.
*/

import { axeSelect } from "@/lib/axe/supabase";
import { escapeFilterValue } from "@/lib/axe/leads";

if (typeof window !== "undefined") {
  throw new Error("src/lib/careers/applications.ts is server-only and must never reach the browser.");
}

const COLUMNS = ["id", "submitted_at", "full_name", "email", "phone", "skills", "projects", "resume_url", "role_id"];

export type ApplicationRecord = {
  id: number;
  submitted_at: string;
  full_name: string;
  email: string;
  phone: string;
  skills: string;
  projects: string;
  resume_url: string;
  role_id: string | null;
};

export type ApplicationPage = {
  rows: ApplicationRecord[];
  hasMore: boolean;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 25;

/*
  One page of applications, newest first. `q` matches name, email or skills.
  Fetches one row more than the page size to learn whether a next page exists
  without a separate COUNT.
*/
export async function getApplications(q?: string, page = 1): Promise<ApplicationPage> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * PAGE_SIZE;

  const params = new URLSearchParams();
  params.set("select", COLUMNS.join(","));
  params.set("order", "submitted_at.desc");
  params.set("offset", String(offset));

  const term = q?.trim();
  if (term) {
    const value = escapeFilterValue(term);
    params.set(
      "or",
      `(full_name.ilike.*${value}*,email.ilike.*${value}*,skills.ilike.*${value}*,role_id.ilike.*${value}*)`,
    );
  }

  const rows = await axeSelect<ApplicationRecord>(
    "career_application",
    params.toString(),
    PAGE_SIZE + 1,
  );

  return {
    rows: rows.slice(0, PAGE_SIZE),
    hasMore: rows.length > PAGE_SIZE,
    page: safePage,
    pageSize: PAGE_SIZE,
  };
}
