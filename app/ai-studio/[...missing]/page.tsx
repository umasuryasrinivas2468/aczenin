import { notFound } from "next/navigation";

/*
  Catches every unknown /ai-studio/* path so it renders the studio's own 404
  (app/ai-studio/not-found.tsx) instead of the marketing site's. This includes
  unknown paths below /ai-studio/axe, which therefore look identical to any
  other missing page and reveal nothing about the admin panel.
*/
export default function MissingStudioPage() {
  notFound();
}
