/**
 * Professional facts. SOURCE OF TRUTH: Gabriel Olatundun's latest resume (2026).
 * Do not add claims here that are not on the resume or explicitly confirmed by Gabriel.
 * Client names are withheld pending Gabriel's approval (see README "Open questions").
 */
export const PROFILE = {
  name: 'Gabriel Olatundun',
  headline: 'Financial Systems, AML Investigations & Integration Architecture',
  location: 'Ottawa, Ontario, Canada',
  email: 'gabriel.olatundun@gmail.com',
  /** Set to the verified URL to show LinkedIn in the header, footer and contact page. */
  linkedinUrl: null as string | null,
  resumePdf: 'resume/Gabriel_Olatundun_Resume.pdf',
  proposition:
    'I investigate financial and transactional problems across business processes, ERP systems, payments and data; I identify root causes and design reliable integrations and controls.',
  summary:
    'Senior ERP and financial systems professional with 9+ years across financial transaction workflows, enterprise applications, data quality, implementations and systems integration. Performed AML-related transaction reviews and KYC-related checks in client projects, escalated relevant findings to compliance teams, and distinguished potential risk indicators from ERP data-quality and migration errors.',
};

export interface Role {
  title: string;
  org: string;
  place: string;
  start: string;
  end: string;
  bullets: string[];
  tracks: ('AML' | 'ERP' | 'Data' | 'Architecture')[];
}

export const ROLES: Role[] = [
  {
    title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', start: 'Apr 2026', end: 'Present', tracks: ['ERP', 'Data', 'Architecture'],
    bullets: [
      'Investigate complex ERP production issues involving financial transactions, commerce, configuration and external integrations; use SQL, diagnostic logs and repeatable testing to distinguish data, process and system defects.',
      'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence, and recommend supported corrective actions or engineering escalations.',
      'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risks, business impact, technical constraints and resolution progress to customers and partners.',
      'Prepare clear case documentation and reusable troubleshooting guidance; mentor support colleagues on complex problem analysis and stakeholder communication.',
    ],
  },
  {
    title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', start: 'Jul 2023', end: 'Mar 2026', tracks: ['ERP', 'Data'],
    bullets: [
      'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impacts.',
      'Reviewed system configuration, test results and case evidence; worked with engineering and consulting teams to resolve issues and improve supportability.',
      'Communicated practical remediation guidance to customers and documented findings for accurate hand-offs and future investigation.',
    ],
  },
  {
    title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', start: 'Jun 2022', end: 'Jul 2023', tracks: ['AML', 'ERP', 'Data'],
    bullets: [
      'Analyzed financial business requirements and supported Sage X3 configurations for GL, AP, AR and Fixed Assets during ERP implementations.',
      'Mapped, validated and reconciled migrated financial and operational records; investigated mismatches and supported correction of data-quality exceptions.',
      'Performed functional testing and UAT for financial transaction flows, documented issues, and supported post-go-live user troubleshooting.',
      'Reviewed financial transactions and performed KYC-related checks on AML-related workstreams; flagged suspicious or inconsistent activity to compliance teams and reconciled transactions against Sage X3 finance records.',
    ],
  },
  {
    title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', start: 'Oct 2016', end: 'Dec 2021', tracks: ['AML', 'ERP', 'Architecture', 'Data'],
    bullets: [
      'Delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments, translating client requirements into workable system processes.',
      'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client; helped align payment processing with ERP and finance workflows.',
      'Supported Sage X3 integrations with investment and payroll applications, resolving data mapping, interface and process issues through cross-functional investigation.',
      'Led or supported data migration, validation, reconciliation, functional testing, user acceptance, upgrade delivery (Sage X3 V11 to V12) and post-implementation troubleshooting.',
      'Reviewed transactions and performed KYC-related checks on financial institution, microfinance banking, and oil and gas client projects; escalated suspicious findings to compliance teams and traced some exceptions to ERP migration-related data corruption rather than fraud.',
    ],
  },
  {
    title: 'Software Intern', org: 'Sage Software West Africa', place: 'Nigeria', start: 'Jun 2016', end: 'Sep 2016', tracks: ['ERP'],
    bullets: ['Completed structured training in Sage accounting, business-management software, ERP configurations and support.'],
  },
  {
    title: 'IT Consultant', org: 'MDS Logistics', place: 'Lagos, Nigeria', start: 'Mar 2015', end: 'Oct 2015', tracks: ['ERP', 'Data'],
    bullets: ['Supported logistics enterprise applications, data validation, documentation, and inventory / order-processing workflows.'],
  },
];

export const EDUCATION = [
  { credential: 'Master of Technology Entrepreneurship and Innovation (MTEI)', school: 'Saint Mary’s University, Halifax, NS', years: '2022–2023' },
  { credential: 'Bachelor of Technology, Computer Engineering', school: 'Ladoke Akintola University of Technology, Nigeria', years: '2008–2014' },
];

export const CREDENTIALS = [
  'Sage X3 Certified Technical Consultant',
  'Sage X3 Certified Financial Consultant',
  'Sage X3 Certified Distribution Consultant',
  'Sage CRM Certification',
  'Sage X3 Project Management Training',
  'Acumatica Finance, Distribution, Manufacturing & Commerce Product Badges',
  'Anti-Money Laundering (AML) Training — LinkedIn Learning (completed)',
];

export const SKILLS = {
  'Financial / ERP systems': ['Sage X3 (V11/V12)', 'Sage 300', 'Acumatica', 'General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Fixed Assets', 'Distribution & commerce processes'],
  'Data & analysis': ['SQL Server', 'Microsoft Excel', 'Data validation', 'Source-to-target mapping', 'Reconciliation', 'Migration testing', 'Crystal Reports', 'Sage Enterprise Intelligence'],
  'Payments & integrations': ['Bank payment API / Sage 300 integration collaboration', 'ERP interfaces', 'Data-flow troubleshooting', 'Configuration validation', 'Transactional test scenarios'],
  'Delivery & documentation': ['Jira', 'Smartsheet', 'Case and defect documentation', 'Functional specifications', 'UAT', 'User training', 'Knowledge-base content'],
};

/** Skill → where it was used professionally (resume) → where it is demonstrated on this site (simulation). */
export const SKILL_EVIDENCE: { skill: string; professional: string; demo: string; demoLink: string }[] = [
  { skill: 'AML transaction review & exception analysis', professional: 'Transaction reviews and KYC-related checks on AML-related workstreams (Panni; Softcodes client projects).', demo: 'AML investigation lab — alert queue, evidence, dispositions', demoLink: '/labs/aml' },
  { skill: 'Suspicious-activity identification & compliance escalation', professional: 'Flagged suspicious or inconsistent activity and escalated findings to compliance teams (Panni; Softcodes).', demo: 'Escalation workflow and case narrative (scenarios S3, S6)', demoLink: '/labs/aml' },
  { skill: 'Distinguishing risk indicators from data defects', professional: 'Traced some exceptions to ERP migration-related data corruption rather than fraud (Softcodes).', demo: 'Migration-defect vs. unresolved-activity comparison (S5 vs. S6)', demoLink: '/case-studies' },
  { skill: 'Financial data reconciliation & migration integrity', professional: 'Mapped, validated and reconciled migrated financial records (Panni); led or supported data migration and reconciliation (Softcodes).', demo: 'ERP reconciliation & migration integrity lab', demoLink: '/labs/reconciliation' },
  { skill: 'SQL-based investigation', professional: 'SQL, diagnostic logs and repeatable testing to separate data, process and system defects (Acumatica).', demo: 'Reconciliation, AML-rule and model SQL verified against SQLite', demoLink: '/labs/reconciliation' },
  { skill: 'Payment API integration support', professional: 'Partnered with an internal developer on a bank payment API ↔ Sage 300 integration (Softcodes).', demo: 'Mock bank payment API ↔ ERP lab (idempotency, retries, audit)', demoLink: '/labs/payments' },
  { skill: 'Data quality & financial data pipelines', professional: 'Data validation, source-to-target mapping and migration testing (resume skills).', demo: 'Financial data engineering lab', demoLink: '/labs/data' },
  { skill: 'Root-cause analysis & documentation', professional: 'Case documentation and reusable troubleshooting guidance; engineering escalations (Acumatica).', demo: 'Root-cause tracing and technical case studies', demoLink: '/case-studies' },
];
