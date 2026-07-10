"use client";

import { Home, FileText, Users, BarChart3, Settings, LogOut, Plus } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import CountUp from "@/components/motion/CountUp";

const sidebarItems = [
  { label: "Home", icon: Home, active: false },
  { label: "Invoices", icon: FileText, active: true },
  { label: "Clients", icon: Users, active: false },
  { label: "Reports", icon: BarChart3, active: false },
];

const metrics = [
  { label: "Invoiced this month", value: 1248900, prefix: "₹" },
  { label: "Outstanding", value: 214500, prefix: "₹" },
  { label: "Pending GST filings", value: 3, prefix: "" },
];

const hoursBreakdown = [
  { label: "Billed", value: 18, tone: "bg-ink" },
  { label: "Unbilled", value: 26, tone: "bg-gray-400" },
  { label: "Available", value: 64, tone: "bg-gray-200" },
  { label: "Carried over", value: 6, tone: "bg-gray-100" },
];
const hoursTotal = hoursBreakdown.reduce((sum, h) => sum + h.value, 0);

type InvoiceStatus = "Paid" | "Sent" | "Overdue";

const invoices: { id: string; client: string; amount: number; date: string; status: InvoiceStatus }[] = [
  { id: "INV-2026-0142", client: "Sharma Textiles", amount: 84000, date: "05 Jul 2026", status: "Paid" },
  { id: "INV-2026-0143", client: "Nair Logistics", amount: 152300, date: "07 Jul 2026", status: "Sent" },
  { id: "INV-2026-0144", client: "Verma & Co.", amount: 46750, date: "08 Jul 2026", status: "Overdue" },
  { id: "INV-2026-0145", client: "Bright Retail Pvt Ltd", amount: 210000, date: "09 Jul 2026", status: "Paid" },
];

const statusTone: Record<InvoiceStatus, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Sent: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
};

const HeroDashboardMockup = () => {
  return (
    <section className="pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <Reveal>
          <div className="surface-card p-4 md:p-6 lg:p-8 flex gap-6">
            {/* Sidebar */}
            <aside className="hidden md:flex w-44 shrink-0 flex-col justify-between border-r border-gray-100 pr-5">
              <div>
                <div className="flex items-center gap-2 mb-8">
                  <img
                    src="/images/aczenimg.jpeg"
                    alt="Aczen logo"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-md object-cover"
                  />
                  <span className="text-sm font-bold text-gray-900">Aczen</span>
                </div>
                <nav className="space-y-1">
                  {sidebarItems.map(({ label, icon: Icon, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        active ? "bg-gray-100 text-gray-900" : "text-gray-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  ))}
                </nav>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400">
                  <Settings className="h-4 w-4" />
                  Settings
                </div>
                <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400">
                  <LogOut className="h-4 w-4" />
                  Logout
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {/* Greeting header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base md:text-lg font-semibold text-gray-900">Hello, Rohan Mehta</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sharma Textiles &middot; Owner</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex -space-x-2">
                    {["RM", "AS", "+2"].map((initials) => (
                      <span
                        key={initials}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 border-2 border-white text-[10px] font-semibold text-gray-600"
                      >
                        {initials}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white text-xs font-medium px-4 py-2 hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Invoice
                  </button>
                </div>
              </div>

              {/* Metric widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <p className="text-lg md:text-xl font-bold text-gray-900">
                      <CountUp value={m.value} prefix={m.prefix} />
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">{m.label}</p>
                  </div>
                ))}

                {/* Hours usage widget */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <p className="text-[11px] text-gray-400 mb-2">Team hours &middot; this month</p>
                  <div className="flex h-2 w-full overflow-hidden rounded-full">
                    {hoursBreakdown.map((h) => (
                      <div
                        key={h.label}
                        className={h.tone}
                        style={{ width: `${(h.value / hoursTotal) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-0.5 text-[10px] text-gray-400">
                    {hoursBreakdown.map((h) => (
                      <span key={h.label}>
                        {h.value}h <span className="text-gray-300">{h.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent invoices table */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Recent Invoices</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                        <th className="px-4 py-2 font-medium">Invoice</th>
                        <th className="px-4 py-2 font-medium">Client</th>
                        <th className="px-4 py-2 font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium hidden sm:table-cell">Date</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-t border-gray-100">
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{inv.id}</td>
                          <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{inv.client}</td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            ₹{inv.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap hidden sm:table-cell">
                            {inv.date}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone[inv.status]}`}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default HeroDashboardMockup;
