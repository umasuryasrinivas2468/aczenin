/*
  The Finathon 2026 challenge list and seat caps.

  Client-safe: no secrets, imported by both the /Finathon/challenges page and
  the claim API. The API validates a submitted challenge id against this list,
  so a challenge that is not here cannot be claimed.

  CONTENT SOURCE: Finathon_Problem_Statements.xlsx (CRM, HRM and FINATHON
  sheets), transcribed field for field. Text fields keep the sheet's line
  breaks and bullets; the page renders them with white-space: pre-line.

  SEAT CAPS are enforced by public.finathon_claim_challenge in
  supabase/migrations/20260929120000_finathon_challenge_claim.sql. The numbers
  below are for display only — change both in the same commit.

  Keep each `id` stable once teams have started claiming — the id is what is
  stored against a team, so renaming one orphans every claim on it.
*/

export type TrackId = "crm" | "hrm" | "finance";

export type Challenge = {
  id: string;
  // The sheet's own reference, e.g. "FIN-07". Shown on the card.
  code: string;
  title: string;
  // Finance only: the sheet's nine groupings. null for CRM and HRM.
  category: string | null;
  problem: string;
  // CRM/HRM "Requirements (as given)". null for Finance.
  requirements: string | null;
  modules: string;
  // CRM/HRM "Hard Part / Special Requirement". null for Finance.
  hardPart: string | null;
  // The one-paragraph "Hackathon Challenge" — what the team must build.
  challenge: string;
};

export type Track = {
  id: TrackId;
  name: string;
  seats: number;
  blurb: string;
  challenges: Challenge[];
};

export const TRACKS: Track[] = [
  {
    id: "finance",
    name: "Finance",
    seats: 80,
    blurb: "Finance and business operations: procurement, payables, payments, treasury, spend, accounting, SME intelligence, working capital and risk.",
    challenges: [
      {
        id: "fin-01",
        code: "FIN-01",
        title: "Intelligent Procurement Decision & Sourcing Platform",
        category: "1. Procurement & Supplier Intelligence",
        problem: "SMEs frequently make procurement decisions based on the immediate quotation received from a supplier. However, the lowest quoted price does not necessarily represent the lowest actual procurement cost.\n\nA supplier offering a lower unit price may have higher transportation costs, longer delivery times, larger minimum order quantities, stricter payment terms, poor historical delivery performance, or higher rejection rates. Conversely, a slightly more expensive supplier may provide better payment terms, reliability, and lower overall procurement cost.\n\nBusinesses therefore need a system that can evaluate procurement options across multiple financial and operational parameters rather than simply comparing quoted prices.\n\nDevelop a procurement decision platform that receives a business requirement and evaluates multiple supplier options using price, taxes, delivery, payment terms, historical supplier performance, order quantities, and other configurable parameters.",
        requirements: null,
        modules: "1. Purchase Requirement Engine:\n  • Define product/service requirements\n  • Specify quantity, target delivery date, budget and business constraints\n  • Support multiple line items\n\n2. Supplier & Quotation Management:\n  • Store supplier profiles\n  • Upload or enter supplier quotations\n  • Maintain historical quotation data\n\n3. Total Procurement Cost Engine:\n  • Calculate effective procurement cost\n  • Consider product price, taxes, logistics, discounts and other costs\n  • Compare payment-term implications\n\n4. Supplier Performance Engine:\n  • Incorporate historical delivery and quality performance\n  • Track previous purchase prices\n  • Consider supplier reliability\n\n5. Procurement Decision Engine:\n  • Allow configurable evaluation criteria\n  • Generate comparative procurement scenarios\n  • Explain why different supplier options produce different outcomes\n\n6. Procurement Dashboard:\n  • Compare suppliers\n  • Display cost breakdowns\n  • Show historical supplier performance\n  • Provide procurement decision reports",
        hardPart: null,
        challenge: "Build a working procurement decision platform that takes a purchasing requirement and multiple supplier options and produces a structured comparison based on total cost, commercial terms, and supplier performance, rather than simply selecting the lowest quotation.",
      },
      {
        id: "fin-02",
        code: "FIN-02",
        title: "Dynamic Supplier Allocation & Procurement Planning System",
        category: "1. Procurement & Supplier Intelligence",
        problem: "Businesses that purchase materials or services regularly often depend on multiple suppliers. Allocating all purchases to a single supplier may create dependency, while distributing orders without considering capacity, pricing, lead times, and historical performance can increase costs.\n\nThe business therefore needs to determine how much should be purchased from each supplier while satisfying its demand and operational constraints.\n\nDevelop a supplier allocation and procurement planning system that determines an appropriate procurement plan based on demand, supplier capacity, pricing, lead time, minimum order quantities, historical reliability, and business constraints.",
        requirements: null,
        modules: "1. Demand Planning:\n  • Define expected demand\n  • Support multiple products/categories\n  • Define required delivery periods\n\n2. Supplier Capacity Management:\n  • Maintain supplier capacity\n  • Minimum and maximum order quantities\n  • Lead times\n\n3. Supplier Cost Model:\n  • Unit pricing\n  • Volume discounts\n  • Logistics costs\n  • Payment terms\n\n4. Allocation Engine:\n  • Distribute demand across suppliers\n  • Respect supplier constraints\n  • Compare alternative allocations\n\n5. Scenario Analysis:\n  • Simulate supplier failure\n  • Simulate price changes\n  • Simulate increased demand\n\n6. Procurement Plan:\n  • Generate recommended purchase quantities\n  • Provide supplier-wise allocation\n  • Display expected cost and delivery schedule",
        hardPart: null,
        challenge: "Build a procurement planning system that takes business demand and supplier constraints and produces an optimized or rule-based supplier allocation plan while handling real-world procurement constraints.",
      },
      {
        id: "fin-03",
        code: "FIN-03",
        title: "Supplier Risk & Dependency Management Platform",
        category: "1. Procurement & Supplier Intelligence",
        problem: "An SME may become financially or operationally vulnerable when a large portion of its purchases depends on a small number of suppliers. Supplier failure, sudden price increases, delayed deliveries, or deterioration in quality can significantly affect the business.\n\nHowever, supplier dependency is often not visible from individual purchase transactions.\n\nDevelop a supplier risk platform that analyzes procurement history and identifies concentration, dependency, performance deterioration, and financial exposure across the supplier base.",
        requirements: null,
        modules: "1. Supplier Exposure Analysis:\n  • Calculate spending concentration\n  • Identify dependence on individual suppliers\n  • Measure category-wise dependency\n\n2. Supplier Performance Analysis:\n  • Delivery delays\n  • Rejection/return rates\n  • Price changes\n  • Order fulfillment history\n\n3. Risk Indicator Engine:\n  • Define configurable risk indicators\n  • Combine multiple supplier attributes\n  • Generate supplier risk profiles\n\n4. Dependency Mapping:\n  • Identify critical products dependent on single suppliers\n  • Map alternative suppliers\n\n5. Risk Scenario Simulation:\n  • Simulate supplier unavailability\n  • Estimate affected procurement volume\n  • Identify alternative sourcing options",
        hardPart: null,
        challenge: "Build a supplier-risk platform that analyzes historical procurement data, identifies critical supplier dependencies, and demonstrates the financial or operational impact of supplier disruption.",
      },
      {
        id: "fin-04",
        code: "FIN-04",
        title: "Procurement Spend Leakage Detection System",
        category: "1. Procurement & Supplier Intelligence",
        problem: "Large organizations can lose significant amounts of money through procurement inefficiencies that are not necessarily fraudulent. Examples include purchasing the same item from different suppliers at significantly different prices, missing negotiated discounts, unnecessary urgent purchases, duplicate suppliers, fragmented purchasing, or transactions occurring outside approved procurement channels.\n\nThese issues are often difficult to identify manually because they are distributed across thousands of transactions.\n\nDevelop a procurement spend analysis system capable of identifying potential areas of spend leakage.",
        requirements: null,
        modules: "1. Procurement Data Consolidation:\n  • Import historical procurement transactions\n  • Normalize supplier and product information\n\n2. Price Benchmarking:\n  • Compare prices for similar products\n  • Identify abnormal price differences\n\n3. Supplier Consolidation Analysis:\n  • Identify fragmented purchasing\n  • Detect multiple suppliers providing similar products\n\n4. Contract/Discount Analysis:\n  • Compare actual purchase prices against negotiated terms\n  • Identify missed discounts\n\n5. Leakage Detection:\n  • Detect unusual procurement patterns\n  • Identify potentially avoidable expenditure\n\n6. Management Dashboard:\n  • Categorize identified leakage\n  • Estimate financial impact\n  • Provide supporting transaction evidence",
        hardPart: null,
        challenge: "Build a system that analyzes a historical procurement dataset and identifies potential financial leakage, explains the underlying transactions, and estimates the associated financial impact.",
      },
      {
        id: "fin-05",
        code: "FIN-05",
        title: "Procurement-to-Budget Impact Planning System",
        category: "1. Procurement & Supplier Intelligence",
        problem: "Procurement decisions directly affect future cash requirements. A purchase that appears affordable today may create significant financial obligations over the coming weeks or months.\n\nSMEs therefore need to understand not just whether a purchase fits within a procurement budget, but also how the purchase will affect future cash commitments.\n\nDevelop a procurement planning system that connects purchasing decisions with organizational budgets and future financial obligations.",
        requirements: null,
        modules: "• Departmental budgets\n• Purchase commitments\n• Supplier payment terms\n• Expected payment dates\n• Budget utilization\n• Future cash obligations\n• Purchase scenario comparison\n• Budget-overrun detection\n• Cash-impact visualization",
        hardPart: null,
        challenge: "Build a system where a finance/procurement manager can evaluate alternative purchasing plans and understand their impact on both budget utilization and future cash obligations.",
      },
      {
        id: "fin-06",
        code: "FIN-06",
        title: "End-to-End Accounts Payable Control System",
        category: "2. Accounts Payable & Financial Obligation Management",
        problem: "A vendor invoice should not automatically become a payable obligation simply because it has been received.\n\nThe business needs to establish whether the invoice corresponds to an approved purchase, whether the goods or services were received, whether the amount is correct, whether the vendor is valid, whether the invoice has already been submitted, and whether the payment is authorized.\n\nDevelop an end-to-end accounts payable control system that evaluates invoices before they become approved financial obligations.",
        requirements: null,
        modules: "1. Invoice Intake:\n  • Upload or import invoices\n  • Capture invoice details\n\n2. Purchase Verification:\n  • Match invoice with purchase orders\n  • Verify goods/service receipt\n\n3. Duplicate Detection:\n  • Identify duplicate invoices\n  • Detect suspicious invoice similarities\n\n4. Financial Validation:\n  • Verify quantity, pricing, taxes and totals\n  • Compare against agreed terms\n\n5. Approval Workflow:\n  • Route exceptions to appropriate personnel\n  • Support approval thresholds\n\n6. Payable Ledger:\n  • Maintain approved obligations\n  • Track due dates and payment status\n\n7. Audit Trail:\n  • Record every verification and approval action",
        hardPart: null,
        challenge: "Build a complete payable-control workflow that determines whether submitted invoices can become valid payable obligations and routes exceptions for review.",
      },
      {
        id: "fin-07",
        code: "FIN-07",
        title: "Dynamic Vendor Payment Prioritization Engine",
        category: "2. Accounts Payable & Financial Obligation Management",
        problem: "A business may have many outstanding vendor obligations but insufficient cash to pay all of them simultaneously.\n\nSimply paying invoices according to their due dates may not always be the most appropriate strategy. The business may need to consider late-payment penalties, supplier criticality, available discounts, cash position, payment terms, and business continuity.\n\nDevelop a payment-prioritization engine that creates a recommended payment queue based on configurable financial and operational factors.",
        requirements: null,
        modules: "• Outstanding invoice management\n• Due-date analysis\n• Cash availability\n• Early-payment discount calculation\n• Late-payment penalty calculation\n• Supplier criticality\n• Payment-term analysis\n• Priority scoring\n• Scenario comparison\n• Payment queue generation",
        hardPart: null,
        challenge: "Given a set of outstanding vendor obligations and a constrained cash position, build a system that generates and explains alternative payment priorities based on configurable business rules.",
      },
      {
        id: "fin-08",
        code: "FIN-08",
        title: "Accounts Payable Cash Optimization System",
        category: "2. Accounts Payable & Financial Obligation Management",
        problem: "Accounts payable decisions directly affect a company's cash position.\n\nPaying a supplier early may result in a discount but reduce available cash. Paying later may preserve liquidity but potentially result in penalties or damaged supplier relationships.\n\nDevelop a system that evaluates different payment timing strategies and shows their financial consequences.",
        requirements: null,
        modules: "• Vendor payment terms\n• Early-payment discounts\n• Late-payment penalties\n• Available cash\n• Payment due dates\n• Payment scheduling\n• Scenario simulation\n• Cost-of-payment-delay calculation\n• Cash-position projection\n• Comparative recommendations",
        hardPart: null,
        challenge: "Build a payment-planning system that allows a finance user to compare alternative payment schedules and understand the trade-off between cash preservation and payment-related costs.",
      },
      {
        id: "fin-09",
        code: "FIN-09",
        title: "Vendor Invoice Dispute Management System",
        category: "2. Accounts Payable & Financial Obligation Management",
        problem: "Invoice disputes can occur because of incorrect quantities, pricing differences, missing goods, tax discrepancies, damaged goods, or contractual disagreements.\n\nOnce a dispute occurs, businesses often rely on emails and spreadsheets to track communication, evidence, ownership, and resolution.\n\nDevelop a structured invoice-dispute management platform that connects disputed invoices with their supporting financial and procurement information.",
        requirements: null,
        modules: "• Invoice dispute creation\n• Dispute categorization\n• PO/invoice/receipt evidence\n• Vendor communication records\n• Internal ownership\n• Dispute status\n• Partial payment handling\n• Resolution tracking\n• Financial exposure tracking\n• Dispute analytics",
        hardPart: null,
        challenge: "Build a dispute-management system that allows finance teams to create, investigate, assign, resolve, and financially track vendor invoice disputes.",
      },
      {
        id: "fin-10",
        code: "FIN-10",
        title: "Accounts Payable Fraud & Duplicate Obligation Detection",
        category: "2. Accounts Payable & Financial Obligation Management",
        problem: "Businesses can lose money through duplicate invoices, fictitious vendors, manipulated invoice amounts, repeated payment requests, altered bank details, and other forms of accounts-payable abuse.\n\nDetecting these issues is difficult when the relevant evidence is distributed across vendor records, invoices, purchase orders, payment history, and employee actions.\n\nDevelop a system that identifies suspicious accounts-payable obligations using transaction relationships and configurable detection rules.",
        requirements: null,
        modules: "• Vendor master analysis\n• Invoice analysis\n• Duplicate detection\n• Vendor-bank-account comparison\n• Invoice/PO relationships\n• Historical payment analysis\n• Suspicious-pattern detection\n• Risk scoring\n• Investigation workflow\n• Evidence dashboard",
        hardPart: null,
        challenge: "Build a system that processes a simulated accounts-payable dataset and identifies potentially fraudulent, duplicate, or anomalous obligations while showing the evidence behind each alert.",
      },
      {
        id: "fin-11",
        code: "FIN-11",
        title: "End-to-End Payment Reconciliation & Settlement Engine",
        category: "3. Business Payments & Settlement",
        problem: "A business may record a customer payment internally while the payment processor, bank, and settlement system maintain separate records.\n\nA single payment can therefore generate multiple financial events:\n\nThese events may occur at different times and may use different transaction identifiers.\n\nDevelop a reconciliation engine that reconstructs this lifecycle and determines whether the expected financial outcome matches the actual settlement.",
        requirements: null,
        modules: "• Internal transaction records\n• Payment gateway records\n• Bank settlement records\n• Transaction-ID matching\n• Reference matching\n• Partial matching\n• Fee calculation\n• Refund/reversal handling\n• Settlement matching\n• Exception management\n• Reconciliation report",
        hardPart: null,
        challenge: "Build a system capable of taking multiple simulated financial datasets and determining which transactions have successfully settled, which contain discrepancies, and what caused those discrepancies.",
      },
      {
        id: "fin-12",
        code: "FIN-12",
        title: "Payment Failure Recovery & Exception Orchestration Platform",
        category: "3. Business Payments & Settlement",
        problem: "A failed payment can trigger a chain of business consequences. A vendor may remain unpaid, a customer order may remain pending, a subscription may fail, or an internal financial record may incorrectly indicate that payment was successful.\n\nBusinesses need more than a simple \"payment failed\" notification.\n\nDevelop a payment exception platform that manages failed, reversed, delayed, or disputed transactions from detection through resolution.",
        requirements: null,
        modules: "• Payment state tracking\n• Failure classification\n• Automatic retry rules\n• Retry scheduling\n• Alternative payment route\n• Duplicate-payment prevention\n• Business transaction status synchronization\n• Exception assignment\n• Resolution tracking\n• Complete transaction timeline",
        hardPart: null,
        challenge: "Build a system that takes simulated payment failures and determines appropriate recovery actions while preventing duplicate financial transactions.",
      },
      {
        id: "fin-13",
        code: "FIN-13",
        title: "Payment Routing & Cost Optimization Engine",
        category: "3. Business Payments & Settlement",
        problem: "Businesses may have access to multiple payment channels with different processing costs, transaction limits, settlement times, failure rates, and operational characteristics.\n\nChoosing a payment route manually can result in unnecessary transaction costs or poor settlement performance.\n\nDevelop a payment-routing engine that evaluates available payment channels and determines an appropriate route according to configurable business requirements.",
        requirements: null,
        modules: "• Payment-channel configuration\n• Transaction constraints\n• Processing-fee model\n• Channel limits\n• Settlement-time model\n• Historical failure rates\n• Routing rules\n• Cost comparison\n• Fallback routing\n• Routing decision logs",
        hardPart: null,
        challenge: "Build a system that receives payment requests and determines an appropriate payment route while balancing cost, transaction constraints, reliability, and settlement requirements.",
      },
      {
        id: "fin-14",
        code: "FIN-14",
        title: "Merchant Settlement & Revenue Leakage Detection System",
        category: "3. Business Payments & Settlement",
        problem: "Businesses accepting digital payments can experience revenue leakage through incorrect fees, failed settlements, refunds, chargebacks, duplicate deductions, incorrect settlement amounts, or missing transactions.\n\nThese issues can remain unnoticed because payment volume is large and settlement records are difficult to manually compare.\n\nDevelop a merchant settlement system that identifies differences between expected transaction revenue and actual settlement amounts.",
        requirements: null,
        modules: "• Transaction ingestion\n• Expected settlement calculation\n• Actual settlement import\n• Fee validation\n• Refund/chargeback handling\n• Settlement matching\n• Missing settlement detection\n• Revenue leakage calculation\n• Exception investigation\n• Settlement analytics",
        hardPart: null,
        challenge: "Given simulated payment and settlement data, build a system that identifies cases where the merchant received less than the expected settlement and explains the financial difference.",
      },
      {
        id: "fin-15",
        code: "FIN-15",
        title: "Business Payment Risk & Transaction Control Engine",
        category: "3. Business Payments & Settlement",
        problem: "Businesses process large numbers of financial transactions, but not every transaction should be treated equally.\n\nA transaction may be unusual because of its amount, frequency, beneficiary, timing, destination, transaction history, or relationship with other transactions.\n\nBusinesses need a transaction-control layer capable of evaluating transactions before or during processing and determining whether they should proceed normally, require additional approval, or be investigated.\n\nDevelop a configurable payment-risk and transaction-control engine.",
        requirements: null,
        modules: "1. Transaction Rules:\n  • Amount thresholds\n  • Frequency limits\n  • Beneficiary rules\n  • Time-based restrictions\n  • Category restrictions\n\n2. Transaction Relationship Analysis:\n  • Historical beneficiary activity\n  • Repeated transaction patterns\n  • Related transaction detection\n\n3. Risk Evaluation:\n  • Rule-based risk scoring\n  • Multiple risk indicators\n  • Configurable risk thresholds\n\n4. Transaction Actions:\n  • Approve\n  • Hold\n  • Escalate\n  • Reject\n\n5. Investigation Workflow:\n  • Review flagged transactions\n  • Record decisions\n  • Maintain audit history\n\n6. Monitoring Dashboard:\n  • Transaction volumes\n  • Flagged transactions\n  • Risk categories\n  • Resolution status",
        hardPart: null,
        challenge: "Build a configurable transaction-control engine that evaluates simulated business payments against multiple financial controls and determines whether each transaction should proceed, be held, or require investigation.",
      },
      {
        id: "fin-16",
        code: "FIN-16",
        title: "Multi-Bank Cash Position & Liquidity Management System",
        category: "4. Cash, Treasury & Bank Operations",
        problem: "SMEs frequently maintain multiple bank accounts for different business purposes. One account may handle collections, another payroll, another vendor payments, while additional accounts may exist for branches or business units.\n\nThis makes it difficult to determine the company's true consolidated cash position. A high balance in one account does not necessarily mean the business has sufficient usable cash because other accounts may have upcoming obligations or committed funds.\n\nDevelop a treasury management platform that consolidates bank balances, transactions, committed payments, expected receipts, and internal transfers to provide a unified view of business liquidity.",
        requirements: null,
        modules: "1. Bank Account Management:\n  • Multiple business accounts\n  • Account purpose and ownership\n  • Bank-wise transaction records\n\n2. Consolidated Cash Position:\n  • Account-wise balances\n  • Total business cash\n  • Available versus committed cash\n\n3. Upcoming Obligations:\n  • Vendor payments\n  • Payroll\n  • Recurring expenses\n  • Other scheduled obligations\n\n4. Expected Inflows:\n  • Customer collections\n  • Scheduled settlements\n  • Other expected receipts\n\n5. Liquidity Monitoring:\n  • Minimum cash thresholds\n  • Account-level shortages\n  • Upcoming liquidity gaps\n\n6. Treasury Dashboard:\n  • Consolidated cash position\n  • Account-level analysis\n  • Inflows and outflows\n  • Future liquidity position",
        hardPart: null,
        challenge: "Build a multi-bank treasury system using simulated account, transaction, receivable, and payable data that determines the business's consolidated cash position and identifies potential short-term liquidity gaps.",
      },
      {
        id: "fin-17",
        code: "FIN-17",
        title: "Short-Term Cash Flow Forecasting & Stress Testing Platform",
        category: "4. Cash, Treasury & Bank Operations",
        problem: "A business can have strong revenue and still face a cash shortage because customer collections, vendor payments, payroll, taxes, and other obligations occur at different times.\n\nHistorical cash flow alone does not provide enough information. Finance teams must also consider known future obligations and expected collections.\n\nDevelop a cash-flow forecasting platform that combines historical transaction behavior with known future financial commitments and allows businesses to test different cash-flow scenarios.",
        requirements: null,
        modules: "• Historical cash-flow analysis\n• Income and expense categorization\n• Recurring transaction identification\n• Expected customer collections\n• Upcoming vendor payments\n• Payroll and recurring obligations\n• Daily/weekly cash forecasting\n• Minimum cash threshold\n• Stress scenarios\n• Forecast-versus-actual tracking",
        hardPart: null,
        challenge: "Build a system that generates a short-term business cash-flow forecast and allows users to simulate scenarios such as delayed customer payments, increased expenses, or unexpected financial obligations.",
      },
      {
        id: "fin-18",
        code: "FIN-18",
        title: "Inter-Bank Cash Allocation & Fund Movement Planner",
        category: "4. Cash, Treasury & Bank Operations",
        problem: "Businesses with multiple bank accounts may have excess cash in one account while another account requires funds for payroll, vendor payments, or operational expenses.\n\nMoving funds between accounts manually can result in idle balances, unnecessary transfers, or insufficient funds in operational accounts.\n\nDevelop a cash-allocation system that analyzes account-level balances and upcoming requirements and creates a planned internal fund-movement schedule.",
        requirements: null,
        modules: "1. Account Position Analysis:\n  • Current balances\n  • Minimum required balances\n  • Upcoming obligations\n\n2. Cash Requirement Calculation:\n  • Account-level future requirements\n  • Expected inflows\n  • Funding gaps\n\n3. Transfer Planning:\n  • Source account selection\n  • Destination account selection\n  • Transfer amount calculation\n\n4. Constraint Management:\n  • Minimum account balance\n  • Transfer limits\n  • Timing requirements\n\n5. Scenario Simulation:\n  • Delayed collections\n  • Unexpected expenses\n  • Changes in payment schedules\n\n6. Fund Movement Dashboard:\n  • Planned transfers\n  • Account surplus/deficit\n  • Transfer history",
        hardPart: null,
        challenge: "Build a system that analyzes multiple business bank accounts and produces a fund-movement plan that maintains required balances while reducing idle cash across accounts.",
      },
      {
        id: "fin-19",
        code: "FIN-19",
        title: "Bank Transaction Intelligence & Financial Data Processing Engine",
        category: "4. Cash, Treasury & Bank Operations",
        problem: "Bank statements contain large numbers of transactions but often provide inconsistent descriptions and limited business context.\n\nA single transaction may need to be identified as a customer receipt, vendor payment, internal transfer, bank charge, loan repayment, tax payment, salary payment, or another financial activity.\n\nDevelop a transaction intelligence engine that converts raw bank data into structured financial information while preserving traceability to the original transaction.",
        requirements: null,
        modules: "• Bank statement ingestion\n• Transaction normalization\n• Counterparty identification\n• Transaction categorization\n• Internal transfer detection\n• Recurring transaction identification\n• Duplicate detection\n• Rule-based classification\n• Transaction review workflow\n• Financial analytics",
        hardPart: null,
        challenge: "Build a transaction-processing engine that takes simulated bank statements from different formats and converts them into a standardized, categorized financial dataset with traceable transaction classifications.",
      },
      {
        id: "fin-20",
        code: "FIN-20",
        title: "Cash Commitment & Future Obligation Management System",
        category: "4. Cash, Treasury & Bank Operations",
        problem: "A company's current bank balance does not represent all of its financially available cash. A portion may already be committed to future vendor payments, salaries, taxes, subscriptions, loan repayments, purchase commitments, or other obligations.\n\nBusinesses need to distinguish between cash that is available and cash that is already economically committed.\n\nDevelop a cash-commitment platform that connects current balances with future financial obligations and provides a forward-looking view of available funds.",
        requirements: null,
        modules: "• Bank balance integration\n• Payable obligations\n• Scheduled payments\n• Payroll commitments\n• Tax/recurring obligations\n• Purchase commitments\n• Expected customer receipts\n• Available cash calculation\n• Future committed cash\n• Obligation calendar",
        hardPart: null,
        challenge: "Build a system that takes current cash balances and future financial obligations and calculates how much cash is actually available across upcoming time periods.",
      },
      {
        id: "fin-21",
        code: "FIN-21",
        title: "Enterprise Expense Verification & Reimbursement Platform",
        category: "5. Expense & Corporate Spend Management",
        problem: "Employee expense management becomes difficult when organizations have hundreds of employees submitting travel, food, accommodation, transportation, client-meeting, and operational expenses.\n\nThe challenge is not simply recording expenses. Finance teams must verify whether the expense actually occurred, whether it is supported by appropriate documentation, whether it complies with company policy, whether it has already been claimed, and whether it has been approved by the correct person.\n\nDevelop an end-to-end expense verification and reimbursement platform.",
        requirements: null,
        modules: "1. Expense Submission:\n  • Employee expense claims\n  • Receipt/document attachment\n  • Business purpose\n  • Expense category\n\n2. Expense Validation:\n  • Amount validation\n  • Date validation\n  • Receipt verification\n  • Duplicate claim detection\n\n3. Policy Engine:\n  • Category limits\n  • Employee-level policies\n  • Department rules\n  • Travel-specific policies\n\n4. Approval Workflow:\n  • Manager approval\n  • Finance verification\n  • Exception approval\n\n5. Reimbursement Processing:\n  • Approved reimbursement amount\n  • Payment status\n  • Reimbursement history\n\n6. Audit Trail:\n  • Complete claim history\n  • Changes and approvals\n  • Exception records",
        hardPart: null,
        challenge: "Build an expense-management system capable of processing employee claims, validating them against company policies and supporting records, detecting exceptions, and moving valid claims through approval and reimbursement.",
      },
      {
        id: "fin-22",
        code: "FIN-22",
        title: "Corporate Spend Control & Budget Enforcement System",
        category: "5. Expense & Corporate Spend Management",
        problem: "Organizations often establish budgets for departments and spending categories, but budget information is not always connected to actual transactions.\n\nAs a result, departments may continue spending even after their budgets have been substantially consumed, while finance teams discover overruns only after the reporting period.\n\nDevelop a spend-control system that connects employee and business spending with departmental budgets and enforces configurable financial controls.",
        requirements: null,
        modules: "• Department budgets\n• Category budgets\n• Employee spending\n• Real-time budget utilization\n• Committed vs actual spending\n• Approval thresholds\n• Budget exception rules\n• Overspending alerts\n• Budget forecasting\n• Management dashboard",
        hardPart: null,
        challenge: "Build a system that evaluates business spending against departmental budgets and detects both current and projected budget violations before they become financial-reporting problems.",
      },
      {
        id: "fin-23",
        code: "FIN-23",
        title: "Corporate Card & Controlled Spending Platform",
        category: "5. Expense & Corporate Spend Management",
        problem: "Corporate cards provide employees with convenient access to company funds, but uncontrolled usage can create significant financial and compliance risks.\n\nOrganizations need to control where, when, how much, and for what purpose employees can spend while still allowing legitimate business expenses.\n\nDevelop a corporate-card control platform that simulates card accounts, employee limits, transaction restrictions, and spending policies.",
        requirements: null,
        modules: "• Employee/cardholder management\n• Card assignment\n• Spending limits\n• Category restrictions\n• Merchant restrictions\n• Daily/monthly limits\n• Temporary spending limits\n• Real-time transaction evaluation\n• Exception handling\n• Card utilization reporting",
        hardPart: null,
        challenge: "Build a simulated corporate-card control system that evaluates transactions against employee-specific and organization-wide spending policies and handles approved and restricted transactions appropriately.",
      },
      {
        id: "fin-24",
        code: "FIN-24",
        title: "Recurring Expense & Subscription Financial Management",
        category: "5. Expense & Corporate Spend Management",
        problem: "Modern businesses may have dozens or hundreds of recurring financial commitments covering software, cloud infrastructure, rent, insurance, maintenance, subscriptions, communication services, and other operational requirements.\n\nThese expenses often grow gradually and become difficult to monitor because they are spread across different departments, payment methods, and vendors.\n\nDevelop a recurring-expense management system that identifies, tracks, forecasts, and analyzes recurring financial commitments.",
        requirements: null,
        modules: "• Recurring transaction identification\n• Subscription/contract registry\n• Monthly and annual cost calculation\n• Renewal tracking\n• Department allocation\n• Price-change tracking\n• Duplicate subscription detection\n• Utilization information\n• Future expense forecasting\n• Renewal decision workflow",
        hardPart: null,
        challenge: "Build a system that processes historical business transactions, identifies recurring financial commitments, forecasts upcoming expenses, and highlights potentially unnecessary or duplicated commitments.",
      },
      {
        id: "fin-25",
        code: "FIN-25",
        title: "Employee & Department Spend Optimization Platform",
        category: "5. Expense & Corporate Spend Management",
        problem: "A company may have thousands of expense transactions but little understanding of how spending behavior differs across departments and employees.\n\nSimply showing total expenditure does not reveal whether spending is driven by legitimate business activity, inefficient purchasing practices, repeated low-value transactions, or unusual spending patterns.\n\nDevelop a spend-analysis platform that analyzes employee and department spending and identifies patterns requiring management attention.",
        requirements: null,
        modules: "• Employee-level spend analysis\n• Department-level spend analysis\n• Category-level analysis\n• Merchant analysis\n• Recurring spending patterns\n• Transaction aggregation\n• Budget comparison\n• Unusual spending identification\n• Spending trend analysis\n• Management investigation tools",
        hardPart: null,
        challenge: "Build a system that processes historical employee and department spending and identifies significant spending patterns, exceptions, and areas requiring financial review.",
      },
      {
        id: "fin-26",
        code: "FIN-26",
        title: "Multi-Source Financial Reconciliation Engine",
        category: "6. Accounting, Reconciliation & Financial Operations",
        problem: "Businesses maintain financial information across banks, payment gateways, accounting systems, invoicing platforms, and internal databases.\n\nThe same economic event may therefore appear multiple times, under different identifiers, amounts, dates, or formats.\n\nDevelop a generalized reconciliation engine capable of comparing multiple financial data sources and determining whether records represent the same underlying financial event.",
        requirements: null,
        modules: "• Multi-source data ingestion\n• Data normalization\n• Entity matching\n• Transaction matching\n• Exact matching\n• Fuzzy/partial matching\n• Duplicate detection\n• Missing-record detection\n• Amount discrepancies\n• Date discrepancies\n• Manual reconciliation\n• Reconciliation audit trail",
        hardPart: null,
        challenge: "Build a reconciliation engine that accepts multiple simulated financial datasets and automatically identifies matched, partially matched, missing, duplicate, and conflicting financial records.",
      },
      {
        id: "fin-27",
        code: "FIN-27",
        title: "Financial Data Quality & Master Data Management System",
        category: "6. Accounting, Reconciliation & Financial Operations",
        problem: "Financial systems depend heavily on the quality of master data such as customer names, vendor identities, bank accounts, tax identifiers, product information, account codes, and transaction categories.\n\nInconsistent master data can lead to duplicate customers, incorrect payments, failed reconciliation, inaccurate reports, and incorrect financial analysis.\n\nDevelop a financial master-data management system that identifies inconsistencies and maintains a reliable canonical record.",
        requirements: null,
        modules: "• Customer master\n• Vendor master\n• Bank account master\n• Product/service master\n• Duplicate entity detection\n• Name normalization\n• Identifier validation\n• Conflict resolution\n• Master-record approval\n• Change history\n• Data-quality dashboard",
        hardPart: null,
        challenge: "Build a system that takes inconsistent financial master data and identifies duplicate or conflicting entities before creating a validated, standardized master dataset.",
      },
      {
        id: "fin-28",
        code: "FIN-28",
        title: "Financial Period Closing & Exception Resolution Platform",
        category: "6. Accounting, Reconciliation & Financial Operations",
        problem: "Closing a financial period requires finance teams to complete many interconnected activities. Bank accounts need reconciliation, receivables and payables must be reviewed, transactions need to be classified, outstanding exceptions need to be resolved, and adjustments may need to be recorded.\n\nThe challenge is that these activities depend on one another. A period cannot be considered complete simply because individual tasks have been marked as finished.\n\nDevelop a period-close management platform that tracks financial closing activities, dependencies, exceptions, approvals, and completion status.",
        requirements: null,
        modules: "• Period creation\n• Closing checklist\n• Account reconciliation status\n• Receivables review\n• Payables review\n• Exception tracking\n• Task dependencies\n• Adjustment tracking\n• Review/approval\n• Period-close status\n• Audit trail",
        hardPart: null,
        challenge: "Build a financial closing system that manages a simulated month-end close and determines whether the period is genuinely ready to be closed based on outstanding reconciliations, exceptions, dependencies, and approvals.",
      },
      {
        id: "fin-29",
        code: "FIN-29",
        title: "Financial Transaction Classification & Ledger Integrity System",
        category: "6. Accounting, Reconciliation & Financial Operations",
        problem: "Raw financial transactions cannot directly be used to produce reliable financial statements. They need to be classified into appropriate accounts and financial categories.\n\nIncorrect classification can distort revenue, expenses, assets, liabilities, and profitability.\n\nDevelop a transaction-classification and ledger-integrity system that converts raw transactions into structured accounting entries while enforcing basic accounting controls.",
        requirements: null,
        modules: "• Chart of accounts\n• Transaction ingestion\n• Account classification\n• Debit/credit representation\n• Journal entry creation\n• Double-entry validation\n• Account balance calculation\n• Classification rules\n• Manual review\n• Adjustment tracking\n• Ledger reporting",
        hardPart: null,
        challenge: "Build a system that converts simulated business transactions into accounting records, validates the resulting ledger, and identifies classification or balancing errors.",
      },
      {
        id: "fin-30",
        code: "FIN-30",
        title: "Financial Reporting & Management Decision Platform",
        category: "6. Accounting, Reconciliation & Financial Operations",
        problem: "SME management often receives financial information from multiple systems but lacks a consolidated way to understand the business.\n\nA meaningful management-finance system should connect revenue, expenses, receivables, payables, cash, and business-unit information rather than simply displaying individual reports.\n\nDevelop a financial reporting platform that creates a connected management view of the business and allows users to trace high-level financial figures back to their underlying data.",
        requirements: null,
        modules: "1. Financial Data Aggregation:\n  • Revenue\n  • Expenses\n  • Cash\n  • Receivables\n  • Payables\n  • Business-unit information\n\n2. Financial Reporting:\n  • Profit and loss\n  • Cash-flow position\n  • Receivables and payables\n  • Expense trends\n\n3. Financial Metrics:\n  • Revenue growth\n  • Expense growth\n  • Margins\n  • Collection position\n  • Payable exposure\n\n4. Comparative Analysis:\n  • Month-on-month comparison\n  • Business-unit comparison\n  • Budget-versus-actual comparison\n\n5. Drill-Down:\n  • Trace financial figures to categories and transactions\n  • Provide supporting financial records",
        hardPart: null,
        challenge: "Build a connected financial reporting platform using a simulated SME dataset that produces management-level financial information and allows users to investigate the transactions underlying important financial figures.",
      },
      {
        id: "fin-31",
        code: "FIN-31",
        title: "SME Financial Control Tower",
        category: "7. SME Financial Intelligence",
        problem: "An SME's financial information is usually distributed across bank accounts, invoices, expenses, receivables, payables, inventory, and operational systems. The business owner may have access to all this information but still lack a single, consistent view of the company's financial position.\n\nThe challenge is to build a financial control tower that brings together these different sources and allows a business to understand its current financial position, identify emerging issues, and trace important figures back to their underlying transactions.\n\nThe system should not merely display financial data. It should connect the different financial components so that changes in one area can be understood in relation to others.",
        requirements: null,
        modules: "1. Financial Data Layer:\n  • Import bank, sales, expense, payable, receivable, and other financial datasets\n  • Normalize data from different sources\n\n2. Financial Position Engine:\n  • Calculate cash position\n  • Track receivables and payables\n  • Track revenue and expenses\n  • Calculate selected financial indicators\n\n3. Cross-Module Analysis:\n  • Connect sales with collections\n  • Connect purchases with payables\n  • Connect expenses with budgets\n  • Connect cash balances with future obligations\n\n4. Financial Alerts:\n  • Identify unusual changes\n  • Detect upcoming financial pressure\n  • Flag overdue receivables or large obligations\n\n5. Drill-Down Dashboard:\n  • Start from a financial metric\n  • Trace it back to underlying transactions\n  • Provide period-wise comparisons",
        hardPart: null,
        challenge: "Build a financial control tower using a simulated SME dataset that provides a consolidated financial view while allowing users to investigate the underlying transactions behind important financial indicators.",
      },
      {
        id: "fin-32",
        code: "FIN-32",
        title: "SME Financial Scenario & Decision Simulator",
        category: "7. SME Financial Intelligence",
        problem: "Business decisions often have financial consequences that are difficult to understand beforehand.\n\nFor example, hiring additional employees increases recurring costs, offering customers longer credit periods may increase sales but delay collections, purchasing inventory in bulk may reduce unit cost but consume cash, and taking a large order may require additional working capital.\n\nDevelop a financial scenario simulator that allows an SME to model hypothetical business decisions and understand their potential impact on revenue, expenses, cash flow, receivables, payables, and profitability.",
        requirements: null,
        modules: "• Baseline financial model\n• Revenue assumptions\n• Expense assumptions\n• Customer credit-period assumptions\n• Supplier payment assumptions\n• Inventory assumptions\n• Scenario creation\n• Multiple scenario comparison\n• Cash-flow impact\n• Profitability impact\n• Key financial indicators",
        hardPart: null,
        challenge: "Build a system that allows a business user to modify multiple financial assumptions and compare how alternative business scenarios affect the company's projected financial position.",
      },
      {
        id: "fin-33",
        code: "FIN-33",
        title: "Business Unit Financial Performance Analysis",
        category: "7. SME Financial Intelligence",
        problem: "Businesses operating across multiple branches, departments, products, or business units often know their consolidated revenue and expenses but have limited visibility into the financial performance of individual units.\n\nA profitable business overall may contain individual units that are losing money, consuming disproportionate resources, or generating strong revenue but weak margins.\n\nDevelop a system that allocates financial activity across business units and provides comparative performance analysis.",
        requirements: null,
        modules: "• Business-unit configuration\n• Revenue allocation\n• Expense allocation\n• Shared-cost allocation\n• Unit-level profitability\n• Revenue and expense trends\n• Margin analysis\n• Unit comparison\n• Contribution analysis\n• Drill-down to transactions",
        hardPart: null,
        challenge: "Build a system that processes multi-unit financial data and determines the financial performance of individual business units while handling shared revenues or expenses.",
      },
      {
        id: "fin-34",
        code: "FIN-34",
        title: "Product & Customer Profitability Analysis Platform",
        category: "7. SME Financial Intelligence",
        problem: "Revenue alone does not tell a business whether a product or customer is financially valuable. A customer generating large sales may also require substantial discounts, support, logistics, credit, or collection effort.\n\nSimilarly, a product with high sales may have a low contribution margin after direct and indirect costs.\n\nDevelop a profitability analysis platform that determines the economic contribution of individual products and customers.",
        requirements: null,
        modules: "1. Revenue Allocation:\n  • Product-wise revenue\n  • Customer-wise revenue\n\n2. Cost Allocation:\n  • Direct product costs\n  • Customer-specific costs\n  • Logistics and operational costs\n  • Configurable shared-cost allocation\n\n3. Profitability Engine:\n  • Gross margin\n  • Contribution margin\n  • Customer profitability\n  • Product profitability\n\n4. Comparative Analysis:\n  • Most/least profitable products\n  • Customer profitability groups\n  • Margin trends\n\n5. Drill-Down:\n  • Trace profitability calculations back to revenue and cost components",
        hardPart: null,
        challenge: "Build a system that processes sample sales and cost data and determines the profitability of individual customers and products using configurable cost-allocation rules.",
      },
      {
        id: "fin-35",
        code: "FIN-35",
        title: "Financial Data Integration & Normalization Platform for SMEs",
        category: "7. SME Financial Intelligence",
        problem: "SMEs increasingly use multiple digital platforms for banking, payments, accounting, invoicing, payroll, procurement, and sales. These systems often represent the same business entity differently.\n\nFor example, one system may identify a supplier by its legal name while another uses a shortened name. Transaction categories may also differ across platforms.\n\nDevelop a financial-data integration platform that takes data from multiple simulated business systems and converts it into a consistent financial data model.",
        requirements: null,
        modules: "• Multi-source data ingestion\n• Schema mapping\n• Transaction normalization\n• Customer/vendor matching\n• Duplicate detection\n• Category mapping\n• Data validation\n• Conflict resolution\n• Unified financial dataset\n• Data-quality reporting",
        hardPart: null,
        challenge: "Build a prototype capable of ingesting multiple heterogeneous financial datasets, normalizing them into a common model, resolving entity inconsistencies, and producing a unified financial dataset.",
      },
      {
        id: "fin-36",
        code: "FIN-36",
        title: "SME Working Capital Optimization Platform",
        category: "8. Working Capital, Credit & Business Finance",
        problem: "A business may have strong sales and positive accounting profits while still facing a shortage of working capital.\n\nThis can happen when customers take a long time to pay, inventory remains unsold, or suppliers require payment before customer collections are received.\n\nDevelop a working-capital optimization platform that analyzes the relationship between receivables, inventory, payables, and cash and identifies areas contributing to working-capital pressure.",
        requirements: null,
        modules: "• Receivables analysis\n• Inventory analysis\n• Payables analysis\n• Cash analysis\n• Operating-cycle analysis\n• Collection-period analysis\n• Payable-period analysis\n• Inventory-period analysis\n• Working-capital requirement\n• Scenario simulation",
        hardPart: null,
        challenge: "Build a system that analyzes an SME's operating-cycle data and allows users to simulate changes in collections, inventory, and supplier terms to understand their impact on working capital.",
      },
      {
        id: "fin-37",
        code: "FIN-37",
        title: "SME Credit Assessment & Business Financial Profile",
        category: "8. Working Capital, Credit & Business Finance",
        problem: "Traditional credit assessment may require financial information from multiple sources, while SMEs often maintain their business information across banking, accounting, sales, and transaction systems.\n\nDevelop a financial profiling platform that organizes an SME's financial history and generates a structured credit assessment based on configurable financial indicators.\n\nThe system should not make unexplained lending decisions. Instead, it should provide a transparent assessment based on the financial information supplied to it.",
        requirements: null,
        modules: "• Business financial profile\n• Revenue history\n• Cash-flow analysis\n• Receivables analysis\n• Payables analysis\n• Debt/obligation information\n• Banking transaction analysis\n• Financial ratio calculation\n• Credit indicators\n• Explainable assessment report",
        hardPart: null,
        challenge: "Build a platform that accepts simulated SME financial data and produces a transparent financial profile showing the factors that affect the business's creditworthiness.",
      },
      {
        id: "fin-38",
        code: "FIN-38",
        title: "Invoice Financing & Receivables Funding Simulator",
        category: "8. Working Capital, Credit & Business Finance",
        problem: "An SME may have substantial outstanding invoices but insufficient cash to operate while waiting for customers to pay.\n\nInvoice-based financing can provide liquidity against eligible receivables, but determining the financing requirement requires understanding invoice maturity, customer concentration, expected collections, outstanding exposure, and financing costs.\n\nDevelop a financing simulator that allows an SME to analyze potential funding against its receivables.",
        requirements: null,
        modules: "• Invoice portfolio management\n• Eligible receivables identification\n• Customer concentration analysis\n• Invoice maturity analysis\n• Financing percentage configuration\n• Funding amount calculation\n• Financing-cost calculation\n• Repayment/collection scenarios\n• Outstanding exposure\n• Funding comparison",
        hardPart: null,
        challenge: "Build a simulator where an SME can provide its outstanding invoice portfolio and evaluate different receivables-financing scenarios, including available liquidity and financing costs.",
      },
      {
        id: "fin-39",
        code: "FIN-39",
        title: "SME Loan Repayment & Cash-Flow Planning System",
        category: "8. Working Capital, Credit & Business Finance",
        problem: "A business with multiple loans or financial obligations must manage repayment schedules alongside payroll, vendor payments, taxes, and operating expenses.\n\nA repayment schedule that looks affordable in isolation may create a cash shortage when combined with other business obligations.\n\nDevelop a system that integrates financing obligations with projected business cash flows and allows SMEs to evaluate their repayment capacity under different scenarios.",
        requirements: null,
        modules: "• Loan/financing account management\n• Principal and interest schedules\n• Repayment calendar\n• Business cash-flow projection\n• Other financial obligations\n• Repayment-to-cash-flow analysis\n• Liquidity stress scenarios\n• Upcoming obligation alerts\n• Repayment schedule comparison\n• Financial exposure dashboard",
        hardPart: null,
        challenge: "Build a system that combines simulated business cash flows with financing obligations and identifies periods where repayment commitments may create liquidity pressure.",
      },
      {
        id: "fin-40",
        code: "FIN-40",
        title: "Dynamic Credit Limit Management for B2B Businesses",
        category: "8. Working Capital, Credit & Business Finance",
        problem: "Businesses selling on credit must decide how much outstanding exposure they are willing to allow each customer to accumulate.\n\nA fixed credit limit may not reflect changes in customer payment behavior, outstanding invoices, sales volume, or business exposure.\n\nDevelop a B2B credit-management platform that continuously evaluates customer exposure against configurable credit policies.",
        requirements: null,
        modules: "• Customer credit profiles\n• Credit limits\n• Outstanding invoice tracking\n• Payment history\n• Customer exposure\n• Credit utilization\n• Overdue amounts\n• Credit-limit review workflow\n• Exposure alerts\n• Historical credit analysis",
        hardPart: null,
        challenge: "Build a B2B credit-management system that evaluates customer exposure using simulated sales, invoice, and payment histories and identifies when credit policies require review.",
      },
      {
        id: "fin-41",
        code: "FIN-41",
        title: "Business Transaction Anomaly Investigation Platform",
        category: "9. Financial Risk, Fraud & Internal Controls",
        problem: "Not every unusual transaction is fraudulent. A transaction may simply differ from normal business activity because of seasonality, a new customer, a large purchase, or an exceptional business event.\n\nFinancial teams therefore need more than a system that simply labels transactions as suspicious.\n\nDevelop an investigation platform that identifies unusual financial activity and provides the surrounding evidence needed for a finance professional to investigate it.",
        requirements: null,
        modules: "• Historical transaction analysis\n• Normal transaction-pattern modelling\n• Unusual amount detection\n• Frequency analysis\n• Counterparty analysis\n• Time-based anomaly detection\n• Related-transaction identification\n• Investigation workspace\n• Evidence collection\n• Investigation outcome tracking",
        hardPart: null,
        challenge: "Build a system that identifies unusual transactions within a simulated business dataset and allows investigators to examine related transactions and supporting evidence before making a decision.",
      },
      {
        id: "fin-42",
        code: "FIN-42",
        title: "Financial Approval & Segregation-of-Duties Control System",
        category: "9. Financial Risk, Fraud & Internal Controls",
        problem: "Financial processes often require different individuals to perform different actions.\n\nFor example, the person who creates a vendor should not necessarily be the same person who approves a payment to that vendor. Similarly, the person who creates an expense should not necessarily be the person who approves it.\n\nWhen these controls are not enforced systematically, businesses can become vulnerable to errors and financial abuse.\n\nDevelop a financial-control system that models organizational roles, permissions, approval hierarchies, and segregation-of-duties conflicts.",
        requirements: null,
        modules: "• User and role management\n• Permission configuration\n• Financial action definitions\n• Approval hierarchy\n• Segregation-of-duties rules\n• Conflict detection\n• Exception approval\n• Access history\n• Control dashboard\n• Audit trail",
        hardPart: null,
        challenge: "Build a system that evaluates user permissions and financial workflows and identifies situations where organizational roles create potential conflicts with predefined segregation-of-duties policies.",
      },
      {
        id: "fin-43",
        code: "FIN-43",
        title: "Vendor Master Integrity & Fraud Prevention System",
        category: "9. Financial Risk, Fraud & Internal Controls",
        problem: "The vendor master is one of the most sensitive components of a business's financial infrastructure.\n\nIncorrect or manipulated vendor information can result in payments being sent to the wrong account, duplicate suppliers being created, or suspicious relationships being hidden within apparently legitimate records.\n\nDevelop a vendor-master control system that validates vendor records and identifies potentially risky changes or relationships.",
        requirements: null,
        modules: "• Vendor master management\n• Duplicate vendor identification\n• Bank-account verification fields\n• Tax/business identifier validation fields\n• Vendor change history\n• Bank-detail change tracking\n• Related-vendor detection\n• Approval workflow\n• Risk indicators\n• Vendor audit trail",
        hardPart: null,
        challenge: "Build a system that processes a simulated vendor master and transaction history and identifies duplicate, inconsistent, or potentially risky vendor records while maintaining a complete change history.",
      },
      {
        id: "fin-44",
        code: "FIN-44",
        title: "Financial Control & Policy Compliance Engine",
        category: "9. Financial Risk, Fraud & Internal Controls",
        problem: "Businesses establish financial policies covering transaction limits, approval requirements, spending categories, vendor payments, reimbursements, and other activities.\n\nAs transaction volume increases, manually checking whether each transaction follows these policies becomes difficult.\n\nDevelop a configurable financial control engine that evaluates financial transactions against business policies and creates actionable exceptions.",
        requirements: null,
        modules: "• Policy configuration\n• Rule engine\n• Transaction validation\n• Amount thresholds\n• Approval requirements\n• Category restrictions\n• Department-level policies\n• Exception creation\n• Exception resolution\n• Compliance reports\n• Policy execution history",
        hardPart: null,
        challenge: "Build a configurable financial-policy engine capable of applying multiple business rules to a simulated transaction dataset and generating explainable exceptions when transactions violate those rules.",
      },
      {
        id: "fin-45",
        code: "FIN-45",
        title: "Connected Financial Risk Graph",
        category: "9. Financial Risk, Fraud & Internal Controls",
        problem: "Financial risk is often difficult to detect when each transaction is examined individually.\n\nConsider a situation where several vendors share bank details, multiple employees approve transactions involving the same vendor, a customer receives multiple unusual refunds, or several transactions are split into smaller amounts to avoid approval thresholds.\n\nEach individual record may appear normal, but the relationships between records may reveal a significant risk.\n\nDevelop a connected financial-risk analysis system that represents relationships between businesses, employees, vendors, customers, bank accounts, invoices, approvals, and transactions.",
        requirements: null,
        modules: "1. Financial Entity Graph:\n  • Customers\n  • Vendors\n  • Employees\n  • Bank accounts\n  • Invoices\n  • Transactions\n  • Approvals\n\n2. Relationship Detection:\n  • Shared bank accounts\n  • Shared identifiers\n  • Common addresses/details\n  • Transaction relationships\n  • Approval relationships\n\n3. Pattern Detection:\n  • Transaction splitting\n  • Circular transactions\n  • Unusual vendor relationships\n  • Repeated counterparties\n  • Multiple entities sharing financial attributes\n\n4. Risk Investigation:\n  • Entity relationship visualization\n  • Transaction history\n  • Connected-record exploration\n  • Investigation notes\n\n5. Risk Reporting:\n  • Identified patterns\n  • Supporting transactions\n  • Relationship evidence\n  • Risk cases and resolution status",
        hardPart: null,
        challenge: "Build a financial-risk investigation platform using a simulated dataset in which participants must identify potentially significant relationships and transaction patterns that cannot be detected by examining individual transactions independently.",
      },
    ],
  },
  {
    id: "crm",
    name: "CRM",
    seats: 10,
    blurb: "Customer relationship management: the system a company sells through.",
    challenges: [
      {
        id: "crm-01",
        code: "CRM-01",
        title: "AI-Powered Customer Churn, Revenue Risk & CRM Fraud Intelligence Engine",
        category: null,
        problem: "Companies often discover that a customer is about to churn only after the customer has already disengaged, while CRM data can also be deliberately or accidentally manipulated to make customer and sales performance appear healthier than it is.\n\nChurn rarely happens suddenly. Before a customer leaves, there are usually early signals spread across different systems: fewer logins, slower replies to emails, rising complaint volume, delayed payments, smaller repeat orders, negative sentiment in support tickets, or a key contact leaving the customer's organization. Because these signals live in separate tools, no single person sees the full picture until the renewal is lost.\n\nAt the same time, the CRM itself cannot always be trusted. Salespeople under target pressure may create fake leads, log activities that never happened, move deals to later stages without real progress, repeatedly push close dates forward, or create duplicate customer records. Management then plans on a pipeline and a customer base that look healthier than they really are.\n\nBuild an intelligent CRM risk engine that continuously analyzes emails, calls, support tickets, purchase history, payment behavior, product usage, complaints, sales activity, customer behavior, and CRM activity patterns to identify both genuine customer churn/revenue risk and suspicious CRM manipulation.",
        requirements: "Must include:\n• Customer health score\n• Churn-risk prediction\n• Revenue-at-risk calculation\n• Root-cause identification\n• Recommended intervention\n• Salesperson/manager alerts\n• Detection of fake leads and duplicate customers\n• Detection of artificial pipeline inflation, suspicious stage changes, repeatedly postponed deals, fake activities, unusual salesperson behavior, and potential collusion patterns\n• Explainable anomaly and risk reports\n\nWhat-if simulation:\n  “What happens to revenue risk if we offer a 10% discount?”\n  “What happens if a high-risk customer receives a retention intervention?”",
        modules: "1. Customer Signal Ingestion:\n  • Import emails, call logs, support tickets, purchases, payments and product-usage data\n  • Link every signal to the correct customer and account\n  • Maintain a time-ordered event history per customer\n\n2. Customer Health & Churn Engine:\n  • Calculate a customer health score from engagement, usage, sentiment, payments and complaints\n  • Predict churn probability over a defined period\n  • Separate temporary dissatisfaction from sustained decline\n\n3. Revenue-at-Risk Calculator:\n  • Estimate recurring and expected revenue exposed to churn\n  • Aggregate revenue at risk by segment, region and salesperson\n  • Rank customers by financial impact, not just churn probability\n\n4. Root-Cause & Intervention Engine:\n  • Identify the main contributing signals for each at-risk customer\n  • Recommend interventions such as a call, discount, service review or escalation\n  • Track whether interventions improved the health score\n\n5. CRM Integrity & Fraud Detection:\n  • Detect fake and duplicate leads and customer records\n  • Flag suspicious stage jumps, repeatedly postponed close dates and inflated deal values\n  • Detect fake or bulk-logged activities and unusual salesperson or collusion patterns\n\n6. What-If Simulator:\n  • Simulate discounts, retention offers and service interventions\n  • Show the change in churn probability and revenue at risk\n  • Compare multiple intervention scenarios side by side\n\n7. Alerts & Explainable Reports:\n  • Send alerts to salespeople and managers when risk crosses thresholds\n  • Show the evidence and contributing signals behind every prediction or anomaly\n  • Provide customer-level and portfolio-level risk reports",
        hardPart: "Hard part: The system must distinguish temporary dissatisfaction from genuine churn signals and normal CRM activity from potentially manipulated behavior. Every major prediction or anomaly should show the evidence and contributing signals behind the decision.",
        challenge: "Build a CRM risk engine that processes a simulated customer and CRM activity dataset, produces explainable customer health scores, churn-risk predictions and revenue-at-risk figures, flags suspicious CRM manipulation with supporting evidence, and lets users run what-if retention scenarios.",
      },
      {
        id: "crm-02",
        code: "CRM-02",
        title: "Autonomous Lead-to-Deal Intelligence System",
        category: null,
        problem: "Sales teams receive thousands of leads but cannot determine which opportunities deserve immediate attention.\n\nLeads arrive from websites, campaigns, referrals, events, partners and cold outreach. Most CRMs treat them as a static list, and salespeople decide whom to call based on gut feeling, recency or deal size alone. High-intent buyers wait too long for a response, while time is spent on leads that were never going to convert.\n\nLead quality also changes over time. A lead that looked weak last week may become urgent after visiting the pricing page three times, requesting a demo or replying to an email. A promising opportunity may silently stall when the prospect stops responding. A fixed score assigned at the time of capture cannot reflect this.\n\nBuild an intelligent CRM that continuously evaluates leads using company information, communication history, engagement, previous interactions, deal size, buying signals, and salesperson activity.",
        requirements: "The system should dynamically:\n• Score leads\n• Detect buying intent\n• Identify stalled opportunities\n• Recommend next actions\n• Assign leads to appropriate salespeople\n• Predict expected deal value\n• Detect duplicate/fake leads\n• Automatically update pipeline stages",
        modules: "1. Lead Capture & Enrichment:\n  • Capture leads from multiple sources\n  • Enrich with company size, industry, location and other firmographic data\n  • Normalize and deduplicate incoming records\n\n2. Event Stream & Engagement Tracking:\n  • Record emails, calls, meetings, website visits and content downloads as events\n  • Track response times and engagement frequency\n  • Maintain a complete interaction timeline per lead\n\n3. Dynamic Lead Scoring & Intent Detection:\n  • Recalculate the lead score every time a new event occurs\n  • Detect buying-intent signals such as pricing-page visits and demo requests\n  • Explain which events raised or lowered the score\n\n4. Opportunity & Pipeline Engine:\n  • Identify stalled opportunities from inactivity and missed follow-ups\n  • Automatically move pipeline stages based on defined evidence\n  • Predict expected deal value and close probability\n\n5. Assignment & Next-Best-Action:\n  • Assign leads to salespeople based on skills, territory, workload and past win rate\n  • Recommend the next action for each lead or deal\n  • Re-assign neglected leads\n\n6. Lead Quality Control:\n  • Detect duplicate and fake leads\n  • Flag suspicious or low-quality lead sources\n  • Report lead-source quality over time\n\n7. Sales Dashboard:\n  • Prioritized lead queue for each salesperson\n  • Pipeline view with stage movement history\n  • Conversion and response-time analytics",
        hardPart: "Hard constraint: The score must change dynamically as new events occur.",
        challenge: "Build a lead-to-deal system that consumes a simulated stream of lead and engagement events, updates lead scores and pipeline stages in real time as each event arrives, assigns and prioritizes leads, and explains every score change and recommended action.",
      },
      {
        id: "crm-03",
        code: "CRM-03",
        title: "Revenue Forecasting Under Uncertainty",
        category: null,
        problem: "Traditional CRM forecasts often depend on salespeople manually updating opportunity stages.\n\nWhen the forecast is simply the sum of deal values multiplied by a fixed stage probability, it inherits every bias in the pipeline. Optimistic salespeople leave deals in late stages, pessimistic ones sandbag, and deals that have been silent for weeks are still counted. Management only discovers the gap at the end of the quarter.\n\nReal revenue depends on many uncertain factors: how long deals actually take to close, how often they slip into the next period, how reliable each salesperson's historical commitments have been, seasonal buying patterns, the concentration of revenue in a few large deals, and whether customers pay on time after signing.\n\nBuild a CRM forecasting engine that predicts 30/60/90-day revenue using historical and real-time pipeline data.",
        requirements: "The system should account for:\n• Deal probability\n• Sales-cycle length\n• Customer segment\n• Historical salesperson performance\n• Seasonality\n• Deal slippage\n• Lost-deal patterns\n• Payment delays\n• Pipeline concentration\n\nOutput:\n• Best case\n• Expected case\n• Worst case",
        modules: "1. Pipeline & History Data Layer:\n  • Import current opportunities and historical won/lost deals\n  • Track stage-change history and close-date changes\n  • Link deals to customers, segments and salespeople\n\n2. Deal Probability Model:\n  • Estimate win probability from deal attributes and history, not only stage\n  • Adjust for deal age, inactivity and stage duration\n  • Learn lost-deal patterns\n\n3. Timing & Slippage Model:\n  • Model sales-cycle length by segment and deal size\n  • Estimate the probability that a deal slips into a later period\n  • Apply seasonality to expected close dates\n\n4. Salesperson Calibration:\n  • Compare each salesperson's past forecasts with actual outcomes\n  • Correct for optimism or sandbagging\n  • Show calibration scores per salesperson and team\n\n5. Cash-Realization Adjustment:\n  • Account for payment terms and historical payment delays\n  • Separate booked revenue from collected revenue\n  • Highlight revenue at risk of late collection\n\n6. Scenario & Range Output:\n  • Produce best, expected and worst-case forecasts for 30/60/90 days\n  • Measure pipeline concentration risk\n  • Show confidence ranges\n\n7. Forecast Change Explanation:\n  • Compare the current forecast with the previous one\n  • Attribute changes to specific deals, stage moves and model factors\n  • Track forecast accuracy against actuals over time",
        hardPart: "Requirement: The system must explain why the forecast changed.",
        challenge: "Build a forecasting engine that uses a simulated historical and live pipeline dataset to produce best, expected and worst-case 30/60/90-day revenue forecasts, and clearly explains which deals and factors caused the forecast to change between runs.",
      },
      {
        id: "crm-04",
        code: "CRM-04",
        title: "Customer 360° Digital Twin",
        category: null,
        problem: "Customer information is fragmented across CRM, email, WhatsApp, invoices, support systems, websites and payment systems.\n\nA salesperson preparing for a renewal call may not know that the customer raised three unresolved complaints last week. A support agent may not know the customer has an overdue invoice or a large open opportunity. Finance may chase payment from a customer who is in the middle of an escalation. Every team sees only its own slice.\n\nThe same customer may also appear under different names, email addresses or phone numbers in each system, which makes it hard to even know that records belong to the same relationship.\n\nBuild a Customer 360° intelligence layer that creates a continuously updated customer profile.",
        requirements: "For every customer, show:\n• Relationship timeline\n• Purchases\n• Complaints\n• Payments\n• Communication\n• Sentiment\n• Product usage\n• Open opportunities\n• Customer lifetime value\n• Churn probability",
        modules: "1. Multi-Source Data Ingestion:\n  • Import data from CRM, email, WhatsApp, invoices, support, website and payment systems\n  • Normalize data into a common customer-event model\n  • Support incremental updates as new events arrive\n\n2. Identity Resolution:\n  • Match records belonging to the same customer across systems\n  • Merge duplicates using names, emails, phone numbers and company identifiers\n  • Keep a traceable link to every source record\n\n3. Unified Customer Profile:\n  • Relationship timeline across all touchpoints\n  • Purchases, payments, complaints and open opportunities in one view\n  • Key contacts and their roles\n\n4. Sentiment & Engagement Analysis:\n  • Analyze sentiment in emails, chats and tickets\n  • Track engagement and product-usage trends\n  • Detect sudden changes in behavior\n\n5. Customer Value & Risk Metrics:\n  • Calculate customer lifetime value\n  • Estimate churn probability\n  • Highlight overdue payments and unresolved issues\n\n6. Dynamic Relationship State:\n  • Define relationship states such as growing, stable, at risk, recovering or lost\n  • Update the state automatically whenever a new event occurs\n  • Explain which events triggered each state change\n\n7. Customer 360° Dashboard:\n  • Search and open any customer profile\n  • Drill down from any metric to the underlying events\n  • Portfolio view of customers by relationship state",
        hardPart: "Advanced challenge: Give the customer a dynamic “relationship state” that changes whenever new events occur.",
        challenge: "Build a Customer 360° layer that ingests simulated data from multiple customer-facing systems, resolves them into unified customer profiles, and maintains a live relationship state that updates and explains itself whenever a new event arrives.",
      },
    ],
  },
  {
    id: "hrm",
    name: "HRM",
    seats: 10,
    blurb: "Human resource management: the system a company runs its people on.",
    challenges: [
      {
        id: "hrm-01",
        code: "HRM-01",
        title: "AI Workforce Capacity & Hiring Optimization Engine",
        category: null,
        problem: "Companies frequently hire based on intuition instead of actual workload.\n\nHiring requests are often raised when a manager feels overloaded, when someone resigns, or when a large project is announced. These requests are rarely checked against actual workload data. Some teams end up overstaffed while others burn out, and new hires arrive too late because the shortage was not predicted early enough.\n\nCapacity also depends on more than headcount. Skills, availability, planned leave, project timelines and productivity all affect whether a team can deliver. A team of ten may still lack the one skill a new project needs, while another team has spare capacity that could be redistributed or reskilled.",
        requirements: "Build an HRM system that analyzes:\n• Employee workload\n• Skills\n• Projects\n• Working hours\n• Productivity signals\n• Leave patterns\n• Upcoming projects\n• Employee availability\n\nThen determine:\n• Where capacity shortages will occur\n• Which skills are missing\n• Whether to hire, reskill or redistribute employees\n• Number of employees required\n• Required skills\n• When hiring should happen",
        modules: "1. Workforce Data Layer:\n  • Employee profiles, skills and roles\n  • Project assignments, working hours and leave records\n  • Upcoming project pipeline with required skills and effort\n\n2. Capacity Model:\n  • Calculate available capacity per employee, team and skill\n  • Account for leave, holidays and part-time availability\n  • Compare demand with supply over future weeks and months\n\n3. Demand Forecasting:\n  • Convert upcoming projects into skill-wise effort requirements\n  • Include historical workload patterns and seasonality\n  • Identify periods of peak demand\n\n4. Gap Analysis:\n  • Identify future capacity shortages by team and skill\n  • Identify missing skills\n  • Detect over-utilized and under-utilized employees\n\n5. Hire / Reskill / Redistribute Recommendation:\n  • Compare the cost and time of hiring, reskilling and redistributing\n  • Recommend the number of employees and skills required\n  • Recommend when hiring should start, given recruitment lead time\n\n6. Scenario Simulation:\n  • Simulate winning or losing projects\n  • Simulate attrition and changes in leave\n  • Compare the capacity impact of different scenarios\n\n7. Workforce Planning Dashboard:\n  • Capacity versus demand timeline\n  • Skill-gap heatmap\n  • Explanation behind every hiring recommendation",
        hardPart: "Advanced challenge: Allow HR to simulate: “What happens if we win 3 new projects next month?”",
        challenge: "Build a workforce-planning system that uses simulated employee, project and leave data to forecast capacity shortages and skill gaps, recommends whether to hire, reskill or redistribute (with numbers and timing), and lets HR simulate scenarios such as winning three new projects next month.",
      },
      {
        id: "hrm-02",
        code: "HRM-02",
        title: "Employee Flight-Risk & Retention Intelligence",
        category: null,
        problem: "HR usually learns that an employee is leaving only after the resignation.\n\nBy the time a resignation letter arrives, the decision has usually been made weeks or months earlier. The signals were often visible: a long period without promotion, compensation falling behind peers, a sudden change of manager or project, rising overtime, declining training participation, or lower engagement-survey scores.\n\nHowever, a single metric can be misleading. One high-workload month or one missed training session does not mean an employee is disengaged. A useful system must combine multiple signals carefully, treat people fairly, and give HR evidence they can act on, not a black-box label.\n\nBuild a system that identifies early organizational signals associated with employee disengagement, while avoiding simplistic conclusions from any single metric.",
        requirements: "Analyze:\n• Workload\n• Project changes\n• Career progression\n• Compensation history\n• Internal mobility\n• Absence patterns\n• Engagement surveys\n• Manager interactions\n• Training participation\n\nGenerate:\n• Risk indicators\n• Contributing factors\n• Suggested retention interventions\n• Organizational-level trends",
        modules: "1. Employee Data Integration:\n  • Combine HR, payroll, project, attendance, survey and training data\n  • Maintain a timeline of employee events\n  • Handle missing or incomplete data\n\n2. Signal Engineering:\n  • Workload and overtime trends\n  • Time since last promotion or pay revision, compared with peers\n  • Changes in project, manager, absence and training patterns\n\n3. Risk Indicator Engine:\n  • Combine multiple signals into risk indicators\n  • Avoid conclusions from any single metric\n  • Configurable thresholds and weights\n\n4. Evidence & Explanation:\n  • Show the contributing factors behind every risk indicator\n  • Show how each factor compares with the employee's own history and peers\n  • Record the data source for each piece of evidence\n\n5. Retention Intervention Recommendations:\n  • Suggest interventions such as career conversations, compensation review, workload rebalancing or internal mobility\n  • Track interventions and their outcomes\n  • Measure whether risk decreased afterwards\n\n6. Organizational Trend Analysis:\n  • Risk trends by team, manager, role and location\n  • Identify systemic causes such as a department with consistently high workload\n  • Compare trends over time\n\n7. Fairness & Privacy Controls:\n  • Role-based access to sensitive employee data\n  • Avoid using protected attributes in risk scoring\n  • Audit trail of who viewed risk information",
        hardPart: "Hard requirement: The system must show the evidence behind every risk indicator.",
        challenge: "Build a retention-intelligence platform that processes a simulated employee dataset, generates explainable flight-risk indicators backed by multiple signals, recommends retention interventions, and shows organizational-level trends, with the supporting evidence visible for every indicator.",
      },
      {
        id: "hrm-03",
        code: "HRM-03",
        title: "Dynamic Skill Graph & Internal Talent Marketplace",
        category: null,
        problem: "Companies often hire externally for skills that already exist internally.\n\nSkill information inside most organizations is outdated and unreliable. Resumes collected at hiring time are never updated, self-declared skill lists are inconsistent, and managers only know the skills of people on their own team. As a result, the organization cannot answer a simple question: who here has actually done this before?\n\nThe real evidence of skill lies in the work people have done: projects delivered, technologies used, code contributed, certifications earned and feedback received. Connecting this evidence into a graph makes internal talent visible and lets managers staff projects from inside before hiring externally.\n\nBuild an HR platform that creates a dynamic skill graph of the organization.\n\nThe system should identify candidates based on actual demonstrated experience, not just resume keywords.",
        requirements: "It should map:\n  Employee → Skills → Experience → Projects → Certifications → Proficiency\n\nThen allow managers to ask:\n  “Find employees capable of building a React + Node.js fintech application.”",
        modules: "1. Skill Data Collection:\n  • Import employee profiles, project history, certifications and training records\n  • Extract skills from project descriptions and work artifacts\n  • Maintain a standard skill taxonomy with synonyms\n\n2. Skill Graph Construction:\n  • Build the Employee → Skills → Experience → Projects → Certifications → Proficiency graph\n  • Link related skills and domains\n  • Update the graph automatically when new projects or certifications are added\n\n3. Proficiency Estimation:\n  • Estimate proficiency from demonstrated experience, recency and project complexity\n  • Weight evidence higher than self-declared skills\n  • Show the evidence behind each proficiency level\n\n4. Natural-Language Talent Search:\n  • Accept manager queries in plain language\n  • Break queries into required skills and domain experience\n  • Rank candidates with an explanation of why each one matches\n\n5. Near-Qualified Matching:\n  • Identify employees missing only a few required skills\n  • Calculate the gap between current and required proficiency\n  • Consider availability and current workload\n\n6. Personalized Upskilling Paths:\n  • Recommend training, projects or mentors to close each gap\n  • Estimate time to become qualified\n  • Track upskilling progress\n\n7. Internal Talent Marketplace:\n  • Publish internal roles and project openings\n  • Let employees express interest\n  • Show skill coverage and gaps for the whole organization",
        hardPart: "Advanced challenge: Identify employees who are near-qualified and recommend a personalized upskilling path.",
        challenge: "Build a skill-graph platform using simulated employee, project and certification data that answers natural-language staffing queries with evidence-based candidate rankings, and recommends personalized upskilling paths for near-qualified employees.",
      },
      {
        id: "hrm-04",
        code: "HRM-04",
        title: "Workforce Scheduling Under Multiple Constraints",
        category: null,
        problem: "Scheduling employees becomes extremely difficult when organizations have shifts, skills, availability, leave, work division, labor constraints and project requirements.\n\nSchedulers usually build rosters in spreadsheets, fixing one conflict at a time. A change such as an employee taking leave or a new deadline can break the entire schedule. Constraints conflict with one another: minimum staffing may require overtime, overtime increases cost, and employee preferences may clash with coverage requirements.\n\nSome constraints are hard rules that can never be broken, such as legal limits on working hours or required certifications for a task. Others are soft preferences that should be satisfied where possible. A good system must respect the hard rules, balance the soft ones fairly, and be honest when no schedule can satisfy everything.",
        requirements: "Build an optimization engine that automatically generates employee schedules while considering:\n• Employee availability\n• Skills\n• Work division / department allocation\n• Shift requirements\n• Leave\n• Maximum working hours\n• Minimum staffing\n• Employee preferences\n• Project deadlines\n• Overtime cost\n\nOptimize for multiple objectives such as:\n• Coverage\n• Cost\n• Work-division requirements\n• Employee preference\n• Fairness",
        modules: "1. Scheduling Data Setup:\n  • Employees, skills, departments and cost rates\n  • Shift templates and staffing requirements\n  • Leave, availability and preferences\n\n2. Constraint Configuration:\n  • Define hard constraints such as maximum hours, rest periods and required skills\n  • Define soft constraints such as preferences and fairness targets\n  • Assign weights and priorities to soft constraints\n\n3. Optimization Engine:\n  • Generate schedules using optimization or constraint-solving techniques\n  • Balance coverage, cost, work division, preference and fairness\n  • Produce alternative schedules for comparison\n\n4. Conflict Detection:\n  • Identify when constraints cannot all be satisfied\n  • Show exactly which constraints conflict and where\n  • Suggest the smallest changes needed to resolve conflicts\n\n5. Decision Explanation:\n  • Explain why each employee was assigned to each shift\n  • Show which constraints and objectives influenced the decision\n  • Show trade-offs between alternative schedules\n\n6. Re-Scheduling:\n  • Handle sudden leave, absences and new deadlines\n  • Re-optimize with minimal disruption to the existing schedule\n  • Notify affected employees\n\n7. Schedule Dashboard:\n  • Calendar view by employee, department and shift\n  • Coverage, cost and overtime metrics\n  • Fairness metrics such as distribution of night and weekend shifts",
        hardPart: "Requirement: The system must also explain why each scheduling decision was made and identify conflicts when all constraints cannot be satisfied.",
        challenge: "Build a scheduling engine that takes simulated employee, shift, leave and project data and generates an optimized schedule across coverage, cost, work division, preference and fairness, explains each assignment, and clearly reports conflicts when all constraints cannot be satisfied.",
      },
      {
        id: "hrm-05",
        code: "HRM-05",
        title: "AI-Based Performance & Promotion Intelligence",
        category: null,
        problem: "Employee performance reviews can become inconsistent because managers rely heavily on subjective judgments.\n\nTwo employees with similar results can receive very different ratings depending on their manager, how well the manager remembers recent work, and how visible each person's contributions were. Some managers rate everyone generously and others strictly. Promotion decisions built on these ratings can feel unfair and cause good employees to leave.\n\nMuch of the evidence needed for a fair review already exists: goals and whether they were met, project outcomes, deliverables, peer and manager feedback, training completed and business impact. The challenge is to bring this evidence together and present it in a consistent way, while still leaving the final decision to people.",
        requirements: "Build an HRM platform that creates an evidence-based performance profile using:\n• Goals\n• Project outcomes\n• Deliverables\n• Peer feedback\n• Manager feedback\n• Skill development\n• Attendance\n• Training\n• Business impact\n\nThe system should generate:\n  Performance evidence → Skill assessment → Development gaps → Suggested career path",
        modules: "1. Performance Evidence Collection:\n  • Import goals, project outcomes, deliverables and business-impact data\n  • Collect peer and manager feedback\n  • Include attendance, training and skill-development records\n\n2. Evidence-Based Performance Profile:\n  • Summarize achievements against goals\n  • Link every statement to its supporting evidence\n  • Show performance trends across review cycles\n\n3. Skill Assessment:\n  • Assess skills from demonstrated work and feedback\n  • Compare skills with role expectations\n  • Track skill growth over time\n\n4. Development Gap Analysis:\n  • Identify gaps between current skills and next-level requirements\n  • Recommend training and stretch assignments\n  • Track development-plan progress\n\n5. Career Path & Promotion Readiness:\n  • Suggest possible career paths\n  • Assess readiness for promotion against defined criteria\n  • Explain what is still needed for the next level\n\n6. Evaluation Consistency Analysis:\n  • Compare rating distributions across managers\n  • Detect lenient, strict or inconsistent raters\n  • Flag cases where ratings disagree strongly with the evidence\n\n7. Review & Calibration Dashboard:\n  • Employee performance profiles for managers and HR\n  • Calibration view across teams and managers\n  • Audit trail of ratings and changes",
        hardPart: "Requirement: It should also identify inconsistencies in evaluations across managers rather than simply ranking employees.",
        challenge: "Build a performance-intelligence platform that processes simulated goals, project, feedback and training data to generate evidence-based performance profiles and career-path suggestions, and identifies inconsistencies in evaluations across managers rather than simply ranking employees.",
      },
    ],
  },
];

export const TRACK_IDS: TrackId[] = TRACKS.map((track) => track.id);

export function findTrack(id: string): Track | undefined {
  return TRACKS.find((track) => track.id === id);
}

export function findChallenge(trackId: string, challengeId: string): Challenge | undefined {
  return findTrack(trackId)?.challenges.find((challenge) => challenge.id === challengeId);
}

/* A track's challenges grouped by category, in sheet order. CRM and HRM have
   no categories and come back as one group with a null name. */
export function groupByCategory(track: Track): { name: string | null; challenges: Challenge[] }[] {
  const groups: { name: string | null; challenges: Challenge[] }[] = [];
  for (const challenge of track.challenges) {
    const last = groups[groups.length - 1];
    if (last && last.name === challenge.category) last.challenges.push(challenge);
    else groups.push({ name: challenge.category, challenges: [challenge] });
  }
  return groups;
}

/*
  When teams may start claiming. null = open now.

  First come, first served is only fair if everyone knows when "first" starts.
  Set this to an announced instant (with the +05:30 offset written out) and both
  the page and the API hold claims until then.
*/
export const CLAIMS_OPEN_AT: Date | null = null;

export function claimsAreOpen(now: number = Date.now()): boolean {
  return CLAIMS_OPEN_AT === null || now >= CLAIMS_OPEN_AT.getTime();
}

/* Seats taken per track, as the API returns them. */
export type SeatCounts = Record<TrackId, number>;
