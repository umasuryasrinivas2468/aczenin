import { notFound } from "next/navigation";

import { Reveal } from "@/components/ai-studio/StudioMotion";
import { formatWhen, PageHeader, Panel } from "@/components/ai-studio/ui";
import { aiSelect } from "@/lib/ai-studio/db";
import { hasAdminSession } from "@/lib/ai-studio/session";

export const runtime = "nodejs";

interface AuditRow {
  id: number;
  occurred_at: string;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  details: Record<string, unknown>;
}

const ACTOR_STYLE: Record<string, string> = {
  admin: "bg-slate-900 text-white",
  system: "bg-smeorange-100 text-smeorange-800",
  user: "bg-smebank-50 text-smebank-800",
};

export default async function AuditPage() {
  if (!(await hasAdminSession())) notFound();
  const rows = await aiSelect<AuditRow>("ai_admin_audit", "select=id,occurred_at,actor,action,target_type,target_id,reason,details&order=occurred_at.desc", 300);

  return (
    <>
      <Reveal>
        <PageHeader eyebrow="Operator" title="Audit log" description="The latest 300 operator, system and key actions. Append-only." />
      </Reveal>
      <Reveal delay={0.04}>
        <Panel bodyClassName="p-0">
          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">Nothing recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/60 text-left text-xs text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">When (IST)</th>
                    <th scope="col" className="px-3 py-3 font-medium">Actor</th>
                    <th scope="col" className="px-3 py-3 font-medium">Action</th>
                    <th scope="col" className="px-3 py-3 font-medium">Target</th>
                    <th scope="col" className="px-5 py-3 font-medium">Reason / details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row) => {
                    const details = JSON.stringify(row.details ?? {});
                    return (
                      <tr key={row.id} className="align-top">
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatWhen(row.occurred_at)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ACTOR_STYLE[row.actor] ?? ACTOR_STYLE.admin}`}>{row.actor}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-[0.78rem] text-slate-900">{row.action}</td>
                        <td className="px-3 py-3 font-mono text-[0.72rem] text-slate-500">
                          {row.target_type ? `${row.target_type}:${row.target_id?.slice(0, 8) ?? ""}` : "—"}
                        </td>
                        <td className="max-w-[28rem] px-5 py-3">
                          {row.reason && <p className="text-slate-800">{row.reason}</p>}
                          {details !== "{}" && (
                            <p className="mt-0.5 truncate font-mono text-[0.7rem] text-slate-400" title={details}>{details}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Reveal>
    </>
  );
}
