/*
  Open roles listed at /Finathon/careers, with their job descriptions.

  Each role carries a stable ID (FIN-<code>-<yy><nn>). The ID is what an
  applicant picks on the form and what is stored in career_application.role_id,
  so once a role is published its ID must never be reused for a different role —
  retire it instead. Shared by the page, the form and the API route, so the
  three cannot disagree about which IDs exist.
*/

export type Role = {
  id: string;
  title: string;
  team: string;
  location: string;
  type: string;
  experience: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
};

export const ROLES: Role[] = [
  {
    id: "FIN-CSE-2601",
    title: "Cyber Security Engineer",
    team: "Security",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    experience: "Fresher",
    summary:
      "Aczen moves money and financial records for SMBs, so security is the product, not a feature. You will harden our platform, find weaknesses before anyone else does, and help us meet the compliance bar that fintech customers expect.",
    responsibilities: [
      "Run vulnerability assessments and penetration tests across our web apps, APIs and cloud infrastructure.",
      "Review code and pull requests for security issues (OWASP Top 10, auth flaws, secrets in code).",
      "Set up and tune monitoring, alerting and logging to detect suspicious activity early.",
      "Own incident response playbooks and take part in investigating and remediating incidents.",
      "Manage IAM policies, key rotation and secrets management across environments.",
      "Support compliance work (ISO 27001, SOC 2, RBI/CERT-In guidelines) with evidence and controls.",
    ],
    requirements: [
      "Solid understanding of networking, Linux, HTTP and common web vulnerabilities.",
      "Hands-on experience with tools such as Burp Suite, Nmap, OWASP ZAP or Wireshark.",
      "Ability to read and reason about code in at least one language (Python, JavaScript or Go).",
      "Familiarity with authentication standards — OAuth 2.0, JWT, session security.",
      "Clear written communication: you can explain a finding and its fix to a developer.",
    ],
    niceToHave: [
      "CTF experience, bug bounty reports or a security write-up you can share.",
      "Certifications such as CEH, OSCP, CompTIA Security+ or eJPT.",
      "Experience securing AWS, GCP or Azure workloads.",
    ],
  },
  {
    id: "FIN-AIE-2602",
    title: "AI Engineer",
    team: "AI Platform",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    experience: "Fresher",
    summary:
      "We are building AI into the core of Aczen — from reading invoices and reconciling ledgers to answering finance questions in plain language. You will take LLM and ML features from prototype to production, with the reliability that financial data demands.",
    responsibilities: [
      "Build LLM-powered features: document extraction, classification, summarisation and conversational assistants.",
      "Design retrieval-augmented generation (RAG) pipelines over financial and business documents.",
      "Write evaluations that measure accuracy, cost and latency, and use them to choose models and prompts.",
      "Integrate tool calling and agents with our APIs safely, with guardrails and audit trails.",
      "Ship and monitor models in production, and iterate based on real usage.",
    ],
    requirements: [
      "Strong Python; comfortable with TypeScript or willing to learn.",
      "Hands-on experience with LLM APIs (Claude, OpenAI, Gemini or open models) and prompt design.",
      "Understanding of embeddings, vector search and basic ML concepts.",
      "Experience building and consuming REST APIs.",
      "A habit of testing: you check whether the model is right, not just whether it responds.",
    ],
    niceToHave: [
      "Experience with frameworks such as the AI SDK, LangChain or LlamaIndex.",
      "Fine-tuning, OCR or document-understanding projects.",
      "Interest in accounting, payments or finance data.",
    ],
  },
  {
    id: "FIN-FSE-2603",
    title: "Full Stack Engineer",
    team: "Product Engineering",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    experience: "Fresher",
    summary:
      "You will build the screens and services SMBs use every day to run their finances — invoicing, payments, HR and CRM. You will own features end to end, from database schema to the pixel on screen.",
    responsibilities: [
      "Build responsive, accessible interfaces in React and Next.js with TypeScript and Tailwind CSS.",
      "Design and implement APIs and server logic in Node.js, backed by PostgreSQL.",
      "Model data and write migrations that are safe to run on a live system.",
      "Write tests, review pull requests and keep the codebase maintainable.",
      "Work with design and product to turn customer problems into shipped features.",
    ],
    requirements: [
      "Good command of JavaScript/TypeScript, HTML and CSS.",
      "Experience with React (Next.js preferred) and a Node.js backend.",
      "Working knowledge of SQL and relational database design.",
      "Comfortable with Git and pull-request based workflows.",
      "At least one project you built end to end that you can walk us through.",
    ],
    niceToHave: [
      "Experience with Supabase, Prisma or another Postgres toolchain.",
      "Familiarity with payment gateways or financial workflows.",
      "An eye for UI detail and accessibility.",
    ],
  },
  {
    id: "FIN-CLE-2604",
    title: "Cloud Engineer",
    team: "Infrastructure",
    location: "Hyderabad, India (Hybrid)",
    type: "Full-time",
    experience: "Fresher",
    summary:
      "You will keep Aczen fast, available and cost-efficient as we grow. You will design our cloud infrastructure, automate how we ship it, and make sure we know when something breaks before customers do.",
    responsibilities: [
      "Provision and manage cloud infrastructure as code (Terraform or similar).",
      "Build and maintain CI/CD pipelines for fast, safe deployments.",
      "Run containerised workloads with Docker and, where it fits, Kubernetes.",
      "Set up observability — metrics, logs, traces and on-call alerting.",
      "Plan for backups, disaster recovery and data residency requirements.",
      "Track and reduce cloud spend without compromising reliability.",
    ],
    requirements: [
      "Hands-on experience with at least one of AWS, GCP or Azure.",
      "Comfortable on the Linux command line and with shell scripting.",
      "Working knowledge of Docker and a CI/CD tool (GitHub Actions, GitLab CI, Jenkins).",
      "Understanding of networking basics: DNS, load balancers, VPCs, TLS.",
      "A scripting language such as Python or Bash for automation.",
    ],
    niceToHave: [
      "Cloud certifications (AWS Solutions Architect, GCP ACE, Azure Administrator).",
      "Experience with Kubernetes, Helm or serverless platforms such as Vercel.",
      "Database operations experience with PostgreSQL.",
    ],
  },
];

export const ROLE_IDS = ROLES.map((role) => role.id);

export function findRole(id: string | undefined | null): Role | undefined {
  return ROLES.find((role) => role.id === id);
}
