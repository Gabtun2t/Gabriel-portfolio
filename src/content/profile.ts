/**
 * Professional facts. SOURCE OF TRUTH: Gabriel Olatundun's latest resume (2026).
 * Do not add claims here that are not on the resume or explicitly confirmed by Gabriel.
 * No client is named anywhere (Gabriel's decision); project examples are anonymised.
 */
export const PROFILE = {
  name: 'Gabriel Olatundun',
  /** Primary professional identity. */
  title: 'Senior Financial Systems & Integration Specialist',
  headline: 'Financial Systems. Financial Crime. Data Integrity. Enterprise Integration.',
  specializations: [
    'ERP implementation and enterprise systems consulting',
    'AML and financial crime investigations',
    'ERP financial reconciliation',
    'SQL and financial data analytics',
    'Banking and payment API integration',
    'Solution and integration architecture',
  ],
  location: 'Ottawa, Ontario, Canada',
  email: 'gabriel.olatundun@gmail.com',
  /** Approved for publication by Gabriel (Oct 2026). Set showPhone to false to hide it everywhere on the site. */
  phone: '902-880-9877',
  showPhone: true,
  /** Verified by Gabriel (Oct 2026). */
  linkedinUrl: 'https://www.linkedin.com/in/tunde-o-tech' as string | null,
  resumePdf: 'resume/Gabriel_Olatundun_ERP_Implementation_Resume.pdf',
  intro:
    'I lead and deliver ERP implementations, mainly Sage 300 and Sage X3. At Softcodes International I led an approximately 18-month, phased, estate-wide Sage 300 implementation as Implementation Lead. Today I resolve complex enterprise ERP issues at Acumatica. My work also covers integrations, data migration and reconciliation, payment workflows and AML-related transaction reviews.',
  proposition:
    'I investigate financial and transactional problems across business processes, ERP systems, payments and data; I identify root causes and design reliable integrations and controls.',
  summary:
    'ERP and financial systems professional with 9+ years delivering, integrating and supporting Sage 300, Sage X3 and Acumatica. Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation. Also performed AML-related transaction reviews and KYC-related checks on client workstreams, escalated suspicious findings to compliance teams, and distinguished genuine risk indicators from ERP data-quality and migration defects.',
};

/**
 * Resume tracks: two independently positioned documents, generated as DOCX + PDF by
 * scripts/resumes/build.mjs from scripts/resumes/content.mjs (Oct 2026).
 */
export const RESUMES: { id: 'aml' | 'erp'; label: string; file: string | null }[] = [
  { id: 'erp', label: 'ERP Implementation & Integration resume', file: 'resume/Gabriel_Olatundun_ERP_Implementation_Resume.pdf' },
  { id: 'aml', label: 'AML Technology & Financial Crime Systems resume', file: 'resume/Gabriel_Olatundun_AML_Technology_Resume.pdf' },
];
export const resumeFor = (id: 'aml' | 'erp') => {
  const r = RESUMES.find((x) => x.id === id)!;
  return r.file ? { label: r.label, file: r.file } : { label: 'Current resume (PDF)', file: PROFILE.resumePdf };
};

export const AI_DISCLOSURE =
  'The code for this website and its four labs was written with substantial help from AI coding tools (Anthropic’s Claude), working to requirements Gabriel set and reviewed. Gabriel decided what the labs demonstrate and approved all professional content. His employment history comes from his resume and is separate from these simulations; the labs are not presented as software he wrote unaided.';

export interface Role {
  title: string;
  org: string;
  place: string;
  start: string;
  end: string;
  bullets: string[];
  tracks: ('ERP implementation' | 'ERP support' | 'AML' | 'Data' | 'Architecture')[];
}

export const ROLES: Role[] = [
  {
    title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', start: 'Apr 2026', end: 'Present', tracks: ['ERP support', 'Data', 'Architecture'],
    bullets: [
      'Investigate complex ERP production issues involving financial transactions, commerce, configuration and external integrations; use SQL, diagnostic logs and repeatable testing to distinguish data, process and system defects.',
      'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence, and recommend supported corrective actions or engineering escalations.',
      'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risks, business impact, technical constraints and resolution progress to customers and partners.',
      // From Gabriel's earlier statements; flagged for re-confirmation in the private tracker.
      'Diagnose commerce connector (Shopify, Amazon, BigCommerce) and REST/GraphQL API integration issues using Kibana logs and SQL.',
      'Prepare clear case documentation and reusable troubleshooting guidance; mentor support colleagues on complex problem analysis and stakeholder communication.',
    ],
  },
  {
    title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', start: 'Jul 2023', end: 'Mar 2026', tracks: ['ERP support', 'Data'],
    bullets: [
      'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impacts.',
      'Reviewed system configuration, test results and case evidence; worked with engineering and consulting teams to resolve issues and improve supportability.',
      'Communicated practical remediation guidance to customers and documented findings for accurate hand-offs and future investigation.',
    ],
  },
  {
    title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', start: 'Jun 2022', end: 'Jul 2023', tracks: ['ERP implementation', 'AML', 'Data'],
    bullets: [
      // Confirmed by Gabriel (Oct 2026): Sage X3 financial reporting and financial data issues.
      'Analyzed GL, AP, AR and Fixed Assets requirements and supported Sage X3 configuration and test scenarios during ERP implementations; supported financial reporting, validated configuration and resolved financial data issues.',
      'Mapped, validated and reconciled migrated financial and operational records; investigated mismatches and supported correction of data-quality exceptions.',
      'Performed functional testing and UAT for financial transaction flows, documented issues, and supported post-go-live user troubleshooting.',
      'Reviewed financial transactions and performed KYC-related checks on AML-related workstreams; flagged suspicious or inconsistent activity to compliance teams and reconciled transactions against Sage X3 finance records.',
    ],
  },
  {
    title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', start: 'Oct 2016', end: 'Dec 2021', tracks: ['ERP implementation', 'Architecture', 'AML', 'Data'],
    bullets: [
      // Confirmed by Gabriel (Oct 2026).
      'Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation for an estate management organisation in Lagos. Led requirements and process analysis, directed configuration, oversaw data migration and testing, and coordinated training and phased go-live. Coordinated the client\u2019s stakeholders, the development team and a multidisciplinary implementation team.',
      'Coordinated delivery of a custom integration between Sage 300 and the client\u2019s existing estate management software. The integration was developed by the Softcodes team.',
      'Worked on a Sage 300 project for a public-sector water utility (government project).',
      'Delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments, translating client requirements into workable system processes.',
      'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client; helped align payment processing with ERP and finance workflows.',
      'Supported Sage X3 integrations with investment and payroll applications, resolving data mapping, interface and process issues through cross-functional investigation.',
      'Led or supported data migration, validation, reconciliation, functional testing, user acceptance and post-implementation troubleshooting.',
      // Confirmed by Gabriel (Oct 2026): consultant on the upgrade, not the overall project lead.
      'Participated as a consultant in a Sage X3 V11 to V12 upgrade.',
      'Reviewed transactions and performed KYC-related checks on financial institution, microfinance banking, and oil and gas client projects; escalated suspicious findings to compliance teams and traced some exceptions to ERP migration-related data corruption rather than fraud.',
    ],
  },
  {
    title: 'Software Intern', org: 'Sage Software West Africa', place: 'Nigeria', start: 'Jun 2016', end: 'Sep 2016', tracks: ['ERP implementation'],
    bullets: ['Completed structured training in Sage accounting, business-management software, ERP configurations and support.'],
  },
  {
    title: 'IT Consultant', org: 'MDS Logistics', place: 'Lagos, Nigeria', start: 'Mar 2015', end: 'Oct 2015', tracks: ['ERP support', 'Data'],
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
  'Acumatica product badges: Finance, Distribution, Manufacturing, Commerce',
  'Anti-Money Laundering (AML) Training — LinkedIn Learning (completed)',
];

export const SKILLS = {
  'Financial / ERP systems': ['Sage X3 (V11/V12)', 'Sage 300', 'Acumatica', 'General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Fixed Assets', 'Distribution & commerce processes'],
  'Data & analysis': ['SQL Server', 'Microsoft Excel', 'Data validation', 'Source-to-target mapping', 'Reconciliation', 'Migration testing', 'Crystal Reports', 'Sage Enterprise Intelligence'],
  'Payments & integrations': ['Bank payment API / Sage 300 integration', 'ERP interfaces', 'Acumatica commerce connectors (Shopify, Amazon, BigCommerce)', 'REST and GraphQL APIs', 'Kibana log analysis', 'Data-flow troubleshooting', 'Configuration validation', 'Transactional test scenarios'],
  'Delivery & documentation': ['Jira', 'Smartsheet', 'Case and defect documentation', 'Functional specifications', 'UAT', 'User training', 'Knowledge-base content'],
};

/** Skill → where it was used professionally (resume) → where it is demonstrated on this site (simulation). */
export const SKILL_EVIDENCE: { skill: string; professional: string; demo: string; demoLink: string }[] = [
  { skill: 'ERP implementation leadership (Sage 300, Sage X3)', professional: 'Led an approximately 18-month, phased, estate-wide Sage 300 implementation as Implementation Lead; delivered other Sage X3 and Sage 300 implementations and advisory support (Softcodes); supported Sage X3 configuration during implementations (Panni).', demo: 'ERP implementation experience (professional, not a simulation)', demoLink: '/experience' },
  { skill: 'Requirements, configuration, UAT, training & go-live', professional: 'Requirements analysis, GL/AP/AR/FA configuration, functional testing and UAT, user training, post-go-live troubleshooting (Panni; Softcodes).', demo: 'ERP implementation case study (professional)', demoLink: '/case-studies' },
  { skill: 'ERP upgrades & integrations', professional: 'Participated as a consultant in a Sage X3 V11 to V12 upgrade; coordinated delivery of a team-developed Sage 300 ↔ estate management software integration; supported Sage X3 integrations with investment and payroll apps; partnered with an internal developer on a Sage 300 bank payment API integration (Softcodes).', demo: 'Payment API lab (synthetic)', demoLink: '/labs/payments' },
  { skill: 'AML transaction review & exception analysis', professional: 'Transaction reviews and KYC-related checks on AML-related workstreams (Panni; Softcodes client projects).', demo: 'AML investigation lab — alert queue, evidence, dispositions', demoLink: '/labs/aml' },
  { skill: 'Suspicious-activity identification & compliance escalation', professional: 'Flagged suspicious or inconsistent activity and escalated findings to compliance teams (Panni; Softcodes).', demo: 'Escalation workflow and case narrative (scenarios S3, S6)', demoLink: '/labs/aml' },
  { skill: 'Distinguishing risk indicators from data defects', professional: 'Traced some exceptions to ERP migration-related data corruption rather than fraud (Softcodes).', demo: 'Migration-defect vs. unresolved-activity comparison (S5 vs. S6)', demoLink: '/case-studies' },
  { skill: 'Financial data reconciliation & migration integrity', professional: 'Mapped, validated and reconciled migrated financial records (Panni); led or supported data migration and reconciliation (Softcodes).', demo: 'ERP reconciliation & migration integrity lab', demoLink: '/labs/reconciliation' },
  { skill: 'SQL-based investigation', professional: 'SQL, diagnostic logs and repeatable testing to separate data, process and system defects (Acumatica).', demo: 'Reconciliation, AML-rule and model SQL verified against SQLite', demoLink: '/labs/reconciliation' },
  { skill: 'Payment API integration support', professional: 'Partnered with an internal developer on a bank payment API ↔ Sage 300 integration (Softcodes).', demo: 'Mock bank payment API ↔ ERP lab (idempotency, retries, audit)', demoLink: '/labs/payments' },
  { skill: 'Data quality & financial data pipelines', professional: 'Data validation, source-to-target mapping and migration testing (resume skills).', demo: 'Financial data engineering lab', demoLink: '/labs/data' },
  { skill: 'Root-cause analysis & documentation', professional: 'Case documentation and reusable troubleshooting guidance; engineering escalations (Acumatica).', demo: 'Root-cause tracing and technical case studies', demoLink: '/case-studies' },
];

// ---------------------------------------------------------------------------
// ERP implementation experience. Every line maps to the resume or to facts Gabriel
// confirmed in writing (Oct 2026). No client names, project counts or outcomes.
// ---------------------------------------------------------------------------
export const ERP_PLATFORMS: { platform: string; work: string; where: string; kind: 'Implementation & consulting' | 'Implementation support' | 'Enterprise support' | 'Training' }[] = [
  { platform: 'Sage X3 (V11 / V12)', work: 'Implementations and advisory support; GL, AP, AR and Fixed Assets configuration; data migration; UAT; consultant on a V11 → V12 upgrade; supported integrations with investment and payroll applications', where: 'Softcodes International · Panni Management & Technology', kind: 'Implementation & consulting' },
  { platform: 'Sage 300', work: 'Led an approximately 18-month, phased, estate-wide implementation (estate dues, billing, collections) as Implementation Lead; a Sage 300 project for a public-sector water utility (government project); other implementations and advisory support; coordinated delivery of a team-developed custom integration with a client\u2019s estate management software; bank payment API integration with an internal developer', where: 'Softcodes International', kind: 'Implementation & consulting' },
  { platform: 'Acumatica', work: 'Complex production issues across finance, inventory, distribution, commerce and external integrations (support, not implementation ownership)', where: 'Acumatica Canada', kind: 'Enterprise support' },
  { platform: 'Sage accounting & business-management software', work: 'Structured training in configuration and support', where: 'Sage Software West Africa (internship)', kind: 'Training' },
];

/**
 * ERP implementation & consulting capability areas. Each line is backed by the resume or by
 * Gabriel's written statements (Oct 2026). `clients` stays empty until Gabriel confirms both the
 * activity for that client AND that the name may be disclosed publicly.
 */
export const ERP_CAPABILITIES: { area: string; what: string; evidence: string; clients: string[] }[] = [
  { area: 'ERP implementation & deployment', what: 'Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation for an estate management organisation. Delivered other Sage X3 and Sage 300 implementations and advisory support. Supported Sage X3 configuration during implementations.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'ERP upgrades & migration', what: 'Participated as a consultant in a Sage X3 V11 to V12 upgrade (not the overall project lead). Led or supported data migration, mapping, validation and reconciliation; oversaw data migration on the estate-wide implementation.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'Business requirements & process analysis', what: 'Led requirements gathering and process analysis on the estate-wide implementation. Analysed financial business requirements and translated client requirements into workable system processes.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'Financial module configuration & workflows', what: 'Directed Sage 300 configuration for estate dues, billing, collections and property-related transactions. Supported Sage X3 configuration for GL, AP, AR and Fixed Assets; validated configuration and resolved financial data issues.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'Testing, UAT & validation', what: 'Oversaw testing and validation on the estate-wide implementation. Functional testing and UAT of financial transaction flows; migrated data validated against source.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'Integration delivery', what: 'Coordinated delivery of a custom Sage 300 integration with a client\u2019s estate management software, developed by the Softcodes team. Partnered with an internal developer on a bank payment API ↔ Sage 300 integration. Supported Sage X3 integrations with investment and payroll applications.', evidence: 'Softcodes', clients: [] },
  { area: 'Training, go-live & post-go-live support', what: 'Coordinated user training, phased deployment and go-live on the estate-wide implementation. Post-implementation and post-go-live troubleshooting for users.', evidence: 'Softcodes · Panni', clients: [] },
  { area: 'Production troubleshooting', what: 'Complex production issues across finance, distribution, commerce, configuration and external integrations, using SQL, logs and repeatable testing. This is enterprise support, not implementation ownership.', evidence: 'Acumatica', clients: [] },
];

/** Types of ERP work, kept distinct so no engagement is presented as more than it was. */
export const ENGAGEMENT_TYPES: { type: string; examples: string; role: string; where: string }[] = [
  { type: 'Led implementation', examples: 'Estate-wide Sage 300 implementation for an estate management organisation (approximately 18 months, phased)', role: 'Implementation Lead', where: 'Softcodes' },
  { type: 'Implementation or advisory support', examples: 'Other Sage X3 and Sage 300 engagements across finance, manufacturing, distribution and other environments', role: 'Senior Technical Consultant; role varied by engagement', where: 'Softcodes' },
  { type: 'Implementation support', examples: 'Sage X3 configuration for GL, AP, AR and Fixed Assets during ERP implementations', role: 'Finance Analyst (Sage X3)', where: 'Panni' },
  { type: 'Integration', examples: 'Custom Sage 300 ↔ estate management software integration (team-developed; Gabriel coordinated delivery). Bank payment API ↔ Sage 300 (with an internal developer). Sage X3 ↔ investment and payroll applications (supported)', role: 'Delivery coordination and integration support', where: 'Softcodes' },
  { type: 'Upgrade', examples: 'Sage X3 V11 to V12', role: 'Consultant (not the overall project lead)', where: 'Softcodes' },
  { type: 'Other client project', examples: 'Sage 300 project for a public-sector water utility (government project)', role: 'Senior Technical Consultant', where: 'Softcodes' },
  { type: 'Support', examples: 'Post-go-live troubleshooting for users; enterprise ERP production issues', role: 'Consultant / analyst; Senior Support Engineer', where: 'Softcodes · Panni · Acumatica' },
];

/** Kept for the homepage and case study: the same areas in short form. */
export const ERP_LIFECYCLE = ERP_CAPABILITIES.map((c) => ({ stage: c.area, what: c.what, evidence: c.evidence }));

export const ERP_FUNCTIONS = ['General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Fixed Assets', 'Financial reporting', 'Inventory & distribution', 'Manufacturing (implementation environments)', 'Commerce & e-commerce integrations (support)', 'Payroll & investment application integrations', 'Bank payment integration'];

/**
 * Industries, listed separately from project types (see ENGAGEMENT_TYPES). Being listed here
 * says nothing about the type of project delivered in that industry.
 */
export const INDUSTRIES: { industry: string; context: string; where: string }[] = [
  { industry: 'Real estate & estate management', context: 'Featured project: the estate-wide Sage 300 implementation above', where: 'Softcodes' },
  { industry: 'Water utilities (public sector)', context: 'Sage 300 project for a public-sector water utility (government project)', where: 'Softcodes' },
  { industry: 'Manufacturing', context: 'Client environments for Sage X3 / Sage 300 work', where: 'Softcodes' },
  { industry: 'Distribution', context: 'Client environments for Sage X3 / Sage 300 work; distribution workflows in Acumatica support', where: 'Softcodes · Acumatica' },
  { industry: 'Banking & financial services', context: 'Financial-institution and financial-services clients', where: 'Softcodes' },
  { industry: 'Microfinance', context: 'Microfinance banking clients', where: 'Softcodes' },
  { industry: 'Oil & gas (incl. downstream)', context: 'Clients including a downstream oil and gas company', where: 'Softcodes' },
  { industry: 'Investment holding', context: 'An investment holding company', where: 'Softcodes' },
  { industry: 'Construction', context: 'Client organisation', where: 'Softcodes' },
  { industry: 'Food services', context: 'Client organisation', where: 'Panni' },
  { industry: 'Marine', context: 'Client organisation', where: 'Panni' },
  { industry: 'Cannabis', context: 'Client organisation', where: 'Panni' },
  { industry: 'Retail & e-commerce', context: 'Commerce workflows in enterprise ERP support', where: 'Acumatica' },
  { industry: 'Logistics', context: 'Logistics enterprise applications (in-house IT)', where: 'MDS Logistics' },
];

/**
 * Engagements Gabriel has described in detail. `publicName` stays null until he approves
 * disclosure in writing; the anonymised `client` description is shown instead.
 */
export const LED_ENGAGEMENTS: { featured: boolean; role: string; client: string; publicName: string | null; employer: string; platform: string; duration?: string; delivery?: string; summary: string; scope?: string; responsibilities: string[] }[] = [
  {
    featured: true,
    role: 'Sage 300 ERP Implementation Lead',
    client: 'Estate management organisation, Lagos, Nigeria',
    publicName: null,
    employer: 'Softcodes International',
    platform: 'Sage 300',
    duration: 'Approximately 18 months',
    delivery: 'Phased, estate-wide implementation',
    summary: 'Led the Sage 300 implementation across its full lifecycle, coordinating the client\u2019s stakeholders, the development team and a multidisciplinary implementation team.',
    scope: 'Estate-wide financial operations, including estate dues, billing, collections and property-related financial transactions.',
    responsibilities: [
      'Led business requirements gathering and process analysis.',
      'Directed Sage 300 configuration and implementation activities.',
      'Oversaw data migration, testing and validation.',
      'Coordinated delivery of a custom integration with the client\u2019s existing estate management software, developed by the Softcodes team.',
      'Coordinated the client\u2019s stakeholders and the development team throughout delivery.',
      'Coordinated user training, phased deployment and go-live.',
      'Managed implementation activities across the project team.',
    ],
  },
];

/**
 * Decision (Gabriel): no client is named anywhere on the site. Keep this empty.
 */
export const PUBLIC_CLIENTS: { name: string; employer: 'Softcodes' | 'Panni'; industry: string }[] = [];

