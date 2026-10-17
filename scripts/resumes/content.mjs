// Resume content for both tracks. SOURCE OF TRUTH: Gabriel's resume (2026) plus facts he confirmed
// in writing (Oct 2026). All lines are verified; course subjects for the teaching roles are pending
// in the private tracker for re-confirmation. No client names, metrics, budgets or team sizes.

const CONTACT = {
  name: 'GABRIEL OLATUNDUN',
  line: 'Ottawa, Ontario, Canada | 902-880-9877 | gabriel.olatundun@gmail.com',
  links: 'linkedin.com/in/tunde-o-tech | gabtun2t.github.io/Gabriel-portfolio',
};

const EDUCATION = [
  'Master of Technology Entrepreneurship and Innovation (MTEI) | Saint Mary’s University, Halifax, NS | 2022 – 2023',
  'Bachelor of Technology, Computer Engineering | Ladoke Akintola University of Technology, Nigeria | 2008 – 2014',
];

const SAGE_CERTS = 'Sage X3 Certified Technical Consultant | Sage X3 Certified Financial Consultant | Sage X3 Certified Distribution Consultant | Sage CRM Certification';
const BADGES = 'Acumatica product badges: Finance, Distribution, Manufacturing, Commerce';

const EARLIER = [
  { title: 'Software Intern', org: 'Sage Software West Africa', place: 'Nigeria', dates: 'Jun 2016 – Sep 2016', text: 'Structured training in Sage accounting and business-management software, ERP configuration and support.' },
  { title: 'IT Consultant', org: 'MDS Logistics', place: 'Lagos, Nigeria', dates: 'Mar 2015 – Oct 2015', text: 'Supported logistics enterprise applications, data validation, documentation, and inventory and order-processing workflows.' },
];

export const ERP = {
  file: 'Gabriel_Olatundun_ERP_Implementation_Resume',
  ...CONTACT,
  headline: 'ERP IMPLEMENTATION LEAD | FINANCIAL SYSTEMS INTEGRATION | SAGE 300 | SAGE X3 | ACUMATICA',
  sections: [
    { h: 'PROFESSIONAL SUMMARY', p: [
      'ERP and financial systems professional with 9+ years delivering, integrating and supporting Sage 300, Sage X3 and Acumatica for finance and operations teams. Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation, coordinating the client, the development team and a multidisciplinary implementation team from requirements through go-live. Led the Sage X3 finance workstream on each Panni client implementation. Sage X3 Certified Technical, Financial and Distribution Consultant with hands-on depth in business process analysis, GL, AP, AR and Fixed Assets configuration, data migration and reconciliation, UAT and custom integration coordination, including consultant participation in a Sage X3 V11 to V12 upgrade. Now a Senior Support Engineer at Acumatica, resolving complex finance, commerce and integration issues with SQL, Kibana diagnostic logs and repeatable testing, and a contract instructor delivering technical instruction since 2024.',
    ] },
    { h: 'CORE COMPETENCIES', p: [
      'ERP Implementation Leadership | Full-Lifecycle ERP Delivery | Client-Facing Consulting | Business Process & Requirements Analysis | Financial Module Configuration (GL, AP, AR, Fixed Assets) | Financial Systems Integration | Data Migration & Conversion, Validation & Reconciliation | Functional Testing & UAT | Training & Phased Go-Live | Post-Go-Live Support | ERP Upgrade Support | SQL Troubleshooting & Root-Cause Analysis | Stakeholder Coordination | Functional Specifications',
    ] },
    { h: 'SELECTED PROJECT LEADERSHIP', project: {
      title: 'Sage 300 ERP Implementation Lead | Estate management organisation, Lagos, Nigeria', right: 'Softcodes International',
      meta: 'Approximately 18 months | Phased, estate-wide implementation | Estate dues, billing, collections and property-related financial transactions',
      bullets: [
        'Led the implementation across its full lifecycle: requirements gathering and process analysis, configuration, data migration and testing, through coordinated user training and phased go-live.',
        'Directed Sage 300 configuration for estate-wide financial operations, including estate dues, billing, collections and property-related financial transactions.',
        'Coordinated the client’s stakeholders, the development team and a multidisciplinary implementation team, managing implementation activities throughout delivery.',
        'Coordinated delivery of a custom integration between Sage 300 and the client’s existing estate management software, developed by the Softcodes development team.',
        'Oversaw data migration, testing and validation of estate-wide financial data and processes.',
      ],
    } },
    { h: 'TECHNICAL SKILLS', kv: [
      ['ERP & financial systems', 'Sage 300; Sage X3 (V11/V12); Acumatica; General Ledger, Accounts Payable, Accounts Receivable, Fixed Assets, financial reporting; distribution, inventory and commerce workflows'],
      ['Data & analysis', 'SQL Server; SQL troubleshooting; data validation; source-to-target mapping; reconciliation; migration testing; Microsoft Excel; Crystal Reports; Sage Enterprise Intelligence'],
      ['Integration', 'ERP interfaces; bank payment API to Sage 300 integration; Sage X3 investment and payroll integrations; commerce connector troubleshooting (Shopify, Amazon, BigCommerce); REST/GraphQL API-related integration troubleshooting'],
      ['Diagnostics', 'Kibana log analysis (since 2025); SQL-based root-cause analysis; diagnostic logs; reproducible test scenarios'],
      ['Delivery', 'Jira; Smartsheet; functional specifications; UAT; user training; case and defect documentation; knowledge-base content'],
    ] },
    { h: 'PROFESSIONAL EXPERIENCE', roles: [
      { title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Apr 2026 – Present', bullets: [
        'Investigate complex ERP production issues across financial transactions, commerce, configuration and external integrations, using SQL, diagnostic logs and repeatable testing to separate data, process and system defects.',
        'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence and recommend supported corrective actions or engineering escalations.',
        'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risk, business impact, technical constraints and resolution progress to customers and partners.',
        'Troubleshoot Shopify, Amazon and BigCommerce commerce connector issues and REST/GraphQL API-related integration failures, correlating Kibana diagnostic logs with SQL queries and transaction data to isolate root cause.',
        'Create reusable troubleshooting guidance and mentor support colleagues on complex problem analysis and stakeholder communication.',
      ] },
      { title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Jul 2023 – Mar 2026', bullets: [
        'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impact.',
        'Since 2025, used Kibana log analysis with SQL and reproducible tests to trace errors, integration failures and transaction behaviour to root cause.',
        'Reviewed configuration, test results and case evidence with engineering and consulting teams to resolve issues, improve supportability and document findings for accurate hand-offs.',
      ] },
      { title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', dates: 'Jun 2022 – Jul 2023', bullets: [
        // Confirmed by Gabriel (17 Oct 2026): led the Sage X3 finance workstream on every Panni project.
        'Led the Sage X3 finance workstream on each client implementation, for food services, marine and cannabis clients: GL, AP, AR and Fixed Assets requirements, configuration and test scenarios, and financial reporting; validated configuration and resolved financial data issues.',
        'Led mapping, validation and reconciliation of migrated financial and operational records, investigating mismatches and correcting data-quality exceptions.',
        'Led functional testing and UAT of financial transaction flows for the finance workstream; supported post-go-live user troubleshooting.',
      ] },
      { title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', dates: 'Oct 2016 – Dec 2021', bullets: [
        'Implementation Lead for the estate-wide Sage 300 implementation (see Selected Project Leadership).',
        'Delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments, including a Sage 300 project for a public-sector water utility; translated client requirements into workable system processes.',
        'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client, aligning payment processing with ERP and finance workflows.',
        'Supported Sage X3 integrations with investment and payroll applications, resolving data mapping, interface and process issues through cross-functional investigation.',
        'Led or supported data migration, validation, reconciliation, functional testing, UAT and post-implementation troubleshooting; participated as a consultant in a Sage X3 V11 to V12 upgrade.',
      ] },
    ] },
    // Confirmed by Gabriel (17 Oct 2026).
    { h: 'TEACHING EXPERIENCE', roles: [
      { title: 'Contract Instructor', org: 'Cambrooks College', place: 'Canada', dates: 'Feb 2024 – Present', bullets: [] },
      { title: 'Contract Instructor', org: 'SAIT', place: 'Canada', dates: 'Jan 2025 – Aug 2026', bullets: [] },
    ], afterBullets: [
      'Technical instruction and knowledge transfer for adult learners: complex material turned into clear, structured lessons, the same skills behind ERP user training and stakeholder communication.',
    ] },
    { h: 'PORTFOLIO PROJECTS (SIMULATED, SYNTHETIC DATA)', note: 'Independent portfolio simulations built with AI-assisted development; not client engagements. gabtun2t.github.io/Gabriel-portfolio', p: [
      'ERP migration reconciliation lab with root-cause tracing and a corrections journal; mock bank payment API to ERP integration with idempotency keys, retries and an audit trail; SQL checked against SQLite.',
    ] },
    { h: 'EARLIER EXPERIENCE', earlier: EARLIER },
    { h: 'EDUCATION', p: EDUCATION },
    { h: 'CERTIFICATIONS, TRAINING & PRODUCT BADGES', p: [
      SAGE_CERTS + ' | Sage X3 Project Management Training',
      BADGES,
    ] },
  ],
};

export const AML = {
  file: 'Gabriel_Olatundun_AML_Technology_Resume',
  ...CONTACT,
  headline: 'AML COMPLIANCE & FINANCIAL CRIME | TRANSACTION REVIEW & KYC | FINANCIAL SYSTEMS',
  sections: [
    { h: 'PROFESSIONAL SUMMARY', p: [
      'AML and financial crime professional whose 9+ years in financial systems include AML-related transaction reviews, KYC checks, suspicious transaction identification and compliance escalation, strengthened by ERP, SQL and payment integration experience. Performed AML-related reviews across financial-institution, microfinance banking, and oil and gas client engagements at Softcodes International and on AML-related Sage X3 workstreams at Panni Management & Technology. Applies investigative judgment to separate genuine risk indicators from ERP data-quality and migration defects before escalation, and reconciles reviewed transactions against finance records. As Senior Support Engineer at Acumatica, investigates complex transaction anomalies with SQL and Kibana and coordinates high-impact cases across Product, Engineering and Consulting.',
    ] },
    { h: 'CORE COMPETENCIES', p: [
      'AML Compliance & Transaction Review | Exception Analysis | KYC Checks | Suspicious Transaction Identification | Compliance Escalation | Risk Indicator Analysis | Financial Data Investigations | Financial Controls & Transaction Reconciliation | SQL-Based Investigation | Root-Cause Analysis | Payment API Integration | Case Documentation | Stakeholder Coordination',
    ] },
    { h: 'AML & FINANCIAL CRIME EXPERIENCE', bulletsOnly: [
      'Transaction review and KYC: AML-related reviews and KYC checks across financial-institution, microfinance banking and oil and gas client engagements (Softcodes, 2016–2021) and AML-related Sage X3 workstreams (Panni, 2022–2023).',
      'Suspicious activity and escalation: identified suspicious or inconsistent transactions and escalated findings to compliance teams.',
      'Financial data investigations and controls: separated ERP migration data corruption from genuine risk indicators, and reconciled reviewed transactions against finance records.',
      'Systems advantage: SQL investigation, Kibana log analysis and payment API integration experience applied to complex transaction anomalies (Acumatica, 2023–present).',
    ] },
    { h: 'TECHNICAL SKILLS', kv: [
      ['Investigation & data', 'SQL Server; SQL-based investigation; data validation; source-to-target mapping; reconciliation; migration testing; Microsoft Excel; Crystal Reports'],
      ['Financial systems', 'Sage X3 (V11/V12), Sage 300, Acumatica; General Ledger, Accounts Payable, Accounts Receivable, Fixed Assets; commerce and distribution transaction flows'],
      ['Investigation tools', 'Kibana log analysis (since 2025); SQL; diagnostic logs; reproducible test scenarios'],
      ['Payments & integration', 'Bank payment API to Sage 300 integration; ERP interfaces; REST/GraphQL API-related integration troubleshooting; commerce connector troubleshooting (Shopify, Amazon, BigCommerce); transactional test scenarios'],
      ['Documentation', 'Case and defect documentation; functional specifications; UAT; Jira; Smartsheet'],
    ] },
    { h: 'PROFESSIONAL EXPERIENCE', roles: [
      { title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Apr 2026 – Present', bullets: [
        'Investigate complex ERP production issues involving financial transactions, commerce and external integrations, using SQL, Kibana log analysis and repeatable testing to distinguish data, process and system defects.',
        'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence and recommend supported corrective actions or engineering escalations.',
        'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risk, business impact and resolution progress to customers and partners.',
        'Prepare clear, evidence-based case documentation and reusable troubleshooting guidance; mentor colleagues on complex problem analysis.',
      ] },
      { title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Jul 2023 – Mar 2026', bullets: [
        'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impact.',
        'Since 2025, used Kibana log analysis with SQL and reproducible tests to trace errors, integration failures and transaction behaviour to root cause.',
        'Reviewed configuration, test results and case evidence with engineering and consulting teams; documented findings for accurate hand-offs and future investigation.',
      ] },
      { title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', dates: 'Jun 2022 – Jul 2023', bullets: [
        'Performed AML-related transaction reviews and KYC checks; flagged suspicious or inconsistent activity to compliance teams.',
        'Reconciled reviewed transactions against Sage X3 finance records; led validation and reconciliation of migrated financial and operational records and correction of data-quality exceptions.',
        'Led the Sage X3 finance workstream on each client implementation (GL, AP, AR, Fixed Assets, migration and UAT) for food services, marine and cannabis clients.',
      ] },
      { title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', dates: 'Oct 2016 – Dec 2021', bullets: [
        'Performed AML-related transaction reviews and KYC checks for financial-institution, microfinance banking, and oil and gas clients; traced some exceptions to migration data corruption rather than fraud before escalating suspicious findings.',
        'Implementation Lead for an approximately 18-month, phased Sage 300 implementation, coordinating the client, the development team and the implementation team.',
        'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client, aligning payment processing with ERP and finance workflows.',
        'Led or supported data migration, validation, reconciliation, functional testing and UAT across Sage X3 and Sage 300 engagements.',
      ] },
    ] },
    { h: 'PORTFOLIO PROJECTS (SIMULATED, SYNTHETIC DATA)', note: 'Demonstrations on synthetic data, built with AI-assisted development; not client or production AML platform work. gabtun2t.github.io/Gabriel-portfolio', p: [
      'AML transaction monitoring and investigation lab: seven explainable monitoring rules, alert scoring, KYC-related profile review, evidence checklist, disposition workflow with rationale, and exportable case narrative; five of the rules written in SQL and parity-checked against the application logic, plus a SQL ledger-to-ERP cross-check verified to isolate a seeded decimal-shift posting error.',
    ] },
    { h: 'EARLIER EXPERIENCE', earlier: EARLIER },
    { h: 'TEACHING EXPERIENCE', p: [
      'Contract Instructor | Cambrooks College | Feb 2024 – Present. Contract Instructor | SAIT | Jan 2025 – Aug 2026. Technical instruction and knowledge transfer for adult learners.',
    ] },
    { h: 'EDUCATION', p: EDUCATION },
    { h: 'TRAINING, CERTIFICATIONS & PRODUCT BADGES', p: [
      'Anti-Money Laundering (AML) Training | LinkedIn Learning | Completed',
      SAGE_CERTS + ' | Sage X3 Project Management Training',
      BADGES,
    ] },
  ],
};
