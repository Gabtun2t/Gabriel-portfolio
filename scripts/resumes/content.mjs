// Resume content for both tracks. SOURCE OF TRUTH: Gabriel's resume (2026) plus facts he confirmed
// in writing (Oct 2026). Lines marked [confirm] come from his earlier statements and are flagged
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
      'ERP and financial systems professional with 9+ years delivering, integrating and supporting Sage 300, Sage X3 and Acumatica for finance and operations teams. Implementation Lead for an approximately 18-month, phased, estate-wide Sage 300 implementation, coordinating the client, the development team and a multidisciplinary implementation team from requirements through go-live. Sage X3 Certified Technical, Financial and Distribution Consultant with hands-on depth in business process analysis, GL, AP, AR and Fixed Assets configuration, data migration and reconciliation, UAT and custom integration coordination, including consultant participation in a Sage X3 V11 to V12 upgrade. Now a Senior Support Engineer at Acumatica, resolving complex finance, commerce and integration issues with SQL, diagnostic logs and repeatable testing.',
    ] },
    { h: 'CORE COMPETENCIES', p: [
      'ERP Implementation Leadership | Full-Lifecycle ERP Delivery | Client-Facing Consulting | Business Process & Requirements Analysis | Financial Module Configuration (GL, AP, AR, Fixed Assets) | Financial Systems Integration | Data Migration & Conversion, Validation & Reconciliation | Functional Testing & UAT | Training & Phased Go-Live | Post-Go-Live Support | ERP Upgrades | SQL Troubleshooting & Root-Cause Analysis | Stakeholder Coordination | Functional Specifications',
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
      // [confirm] connectors, REST/GraphQL and Kibana come from Gabriel's earlier statements about his Acumatica work.
      ['Integration', 'ERP interfaces; bank payment API to Sage 300 integration; Sage X3 investment and payroll integrations; Acumatica commerce connectors (Shopify, Amazon, BigCommerce); REST and GraphQL APIs; Kibana log analysis'],
      ['Delivery', 'Jira; Smartsheet; functional specifications; UAT; user training; case and defect documentation; knowledge-base content'],
    ] },
    { h: 'PROFESSIONAL EXPERIENCE', roles: [
      { title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Apr 2026 – Present', bullets: [
        'Investigate complex ERP production issues across financial transactions, commerce, configuration and external integrations, using SQL, diagnostic logs and repeatable testing to separate data, process and system defects.',
        'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence and recommend supported corrective actions or engineering escalations.',
        'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risk, business impact, technical constraints and resolution progress to customers and partners.',
        // [confirm] connector, API and Kibana detail from Gabriel's earlier statements.
        'Diagnose commerce connector (Shopify, Amazon, BigCommerce) and REST/GraphQL API integration issues using Kibana logs and SQL.',
        'Create reusable troubleshooting guidance and mentor support colleagues on complex problem analysis and stakeholder communication.',
      ] },
      { title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Jul 2023 – Mar 2026', bullets: [
        'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impact.',
        'Reviewed configuration, test results and case evidence with engineering and consulting teams to resolve issues, improve supportability and document findings for accurate hand-offs.',
      ] },
      { title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', dates: 'Jun 2022 – Jul 2023', bullets: [
        'Analyzed GL, AP, AR and Fixed Assets requirements and supported Sage X3 configuration and test scenarios during ERP implementations; supported financial reporting, validated configuration and resolved financial data issues.',
        'Mapped, validated and reconciled migrated financial and operational records, investigating mismatches and correcting data-quality exceptions.',
        'Performed functional testing and UAT of financial transaction flows and supported post-go-live user troubleshooting.',
      ] },
      { title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', dates: 'Oct 2016 – Dec 2021', bullets: [
        'Implementation Lead for the estate-wide Sage 300 implementation (see Selected Project Leadership).',
        'Delivered Sage X3 and Sage 300 implementations and advisory support across finance, manufacturing, distribution and other enterprise environments, including a Sage 300 project for a public-sector water utility; translated client requirements into workable system processes.',
        'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client, aligning payment processing with ERP and finance workflows.',
        'Supported Sage X3 integrations with investment and payroll applications, resolving data mapping, interface and process issues through cross-functional investigation.',
        'Led or supported data migration, validation, reconciliation, functional testing, UAT and post-implementation troubleshooting; participated as a consultant in a Sage X3 V11 to V12 upgrade.',
      ] },
    ] },
    { h: 'PORTFOLIO PROJECTS (SIMULATED, SYNTHETIC DATA)', note: 'Independent portfolio simulations built with AI-assisted development; not client engagements. gabtun2t.github.io/Gabriel-portfolio', p: [
      'ERP migration reconciliation lab with root-cause tracing and a corrections journal; mock bank payment API to ERP integration with idempotency keys, retries and an audit trail; SQL checked against SQLite.',
    ] },
    { h: 'EARLIER EXPERIENCE', earlier: EARLIER },
    { h: 'EDUCATION', p: EDUCATION },
    { h: 'CERTIFICATIONS, TRAINING & PRODUCT BADGES', p: [
      SAGE_CERTS,
      'Training: Sage X3 Project Management Training',
      BADGES,
    ] },
  ],
};

export const AML = {
  file: 'Gabriel_Olatundun_AML_Technology_Resume',
  ...CONTACT,
  headline: 'FINANCIAL CRIME SYSTEMS | AML TRANSACTION REVIEW | TRANSACTION DATA INTEGRITY | PAYMENTS INTEGRATION',
  sections: [
    { h: 'PROFESSIONAL SUMMARY', p: [
      'Financial systems professional with 9+ years across ERP, payments and financial transaction data, bringing hands-on AML-related transaction review experience to financial crime technology roles. Performed AML-related transaction reviews and KYC-related checks on client workstreams at Panni Management & Technology and Softcodes International, escalated suspicious or inconsistent activity to compliance teams, and distinguished genuine risk indicators from ERP data-quality and migration defects. Strengths in SQL-based investigation, transaction reconciliation, payment API integration and ERP data integrity. Now a Senior Support Engineer at Acumatica, investigating transaction anomalies with SQL, diagnostic logs and repeatable testing. Completed AML training (LinkedIn Learning).',
    ] },
    { h: 'CORE COMPETENCIES', p: [
      'AML Transaction Review & Exception Analysis | KYC-Related Checks | Suspicious Activity Identification & Compliance Escalation | Transaction Data Integrity & Reconciliation | SQL-Based Investigation | Root-Cause Analysis | Distinguishing Risk Indicators from Data Defects | Source-to-Target Data Mapping & Validation | Payment API Integration | Business Requirements, Functional Specifications & UAT | Case Documentation | Stakeholder Communication',
    ] },
    { h: 'TECHNICAL SKILLS', kv: [
      ['Investigation & data', 'SQL Server; SQL-based investigation; data validation; source-to-target mapping; reconciliation; migration testing; Microsoft Excel; Crystal Reports'],
      ['Financial systems', 'Sage X3 (V11/V12), Sage 300, Acumatica; General Ledger, Accounts Payable, Accounts Receivable, Fixed Assets; commerce and distribution transaction flows'],
      // [confirm] REST/GraphQL and Kibana come from Gabriel's earlier statements about his Acumatica work.
      ['Payments & integration', 'Bank payment API to Sage 300 integration; ERP interfaces; data-flow troubleshooting; REST and GraphQL APIs; Kibana log analysis; transactional test scenarios'],
      ['Documentation', 'Case and defect documentation; functional specifications; UAT; Jira; Smartsheet'],
      ['Portfolio (simulated)', 'Rule-based transaction monitoring logic, alert scoring, disposition workflow, data lineage and data-quality metrics'],
    ] },
    { h: 'PROFESSIONAL EXPERIENCE', roles: [
      { title: 'Senior Support Engineer', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Apr 2026 – Present', bullets: [
        'Investigate complex ERP production issues involving financial transactions, commerce and external integrations, using SQL, diagnostic logs and repeatable testing to distinguish data, process and system defects.',
        'Analyze expected versus actual transaction behaviour and trace interdependent workflows to isolate anomalies, document evidence and recommend supported corrective actions or engineering escalations.',
        'Coordinate with Product, Engineering, Professional Services and Consulting on high-impact cases; communicate risk, business impact and resolution progress to customers and partners.',
        'Prepare clear, evidence-based case documentation and reusable troubleshooting guidance; mentor colleagues on complex problem analysis.',
      ] },
      { title: 'Product Support Specialist', org: 'Acumatica Canada Inc.', place: 'Canada', dates: 'Jul 2023 – Mar 2026', bullets: [
        'Supported enterprise finance, inventory, distribution and related transactional workflows, reproducing complex behaviour and assessing process and data impact.',
        'Reviewed configuration, test results and case evidence with engineering and consulting teams; documented findings for accurate hand-offs and future investigation.',
      ] },
      { title: 'Finance Analyst (Sage X3)', org: 'Panni Management & Technology', place: 'Remote, Canada', dates: 'Jun 2022 – Jul 2023', bullets: [
        'Reviewed financial transactions and performed KYC-related checks on AML-related workstreams; flagged suspicious or inconsistent activity to compliance teams.',
        'Reconciled reviewed transactions against Sage X3 finance records; mapped, validated and reconciled migrated financial and operational records and corrected data-quality exceptions.',
        'Analyzed financial business requirements and supported Sage X3 configuration for GL, AP, AR and Fixed Assets during ERP implementations; performed functional testing and UAT of financial transaction flows.',
      ] },
      { title: 'Senior Technical Consultant', org: 'Softcodes International Ltd.', place: 'Lagos, Nigeria', dates: 'Oct 2016 – Dec 2021', bullets: [
        'Reviewed transactions and performed KYC-related checks for financial-institution, microfinance banking, and oil and gas client projects; traced some exceptions to ERP migration-related data corruption rather than fraud before escalating suspicious findings to compliance teams.',
        'Implementation Lead for an approximately 18-month, phased Sage 300 implementation, coordinating the client, the development team and the implementation team.',
        'Partnered with an internal developer and client stakeholders to integrate a bank payment API with Sage 300 for a financial-services client, aligning payment processing with ERP and finance workflows.',
        'Led or supported data migration, validation, reconciliation, functional testing and UAT across Sage X3 and Sage 300 engagements.',
      ] },
    ] },
    { h: 'PORTFOLIO PROJECTS (SIMULATED, SYNTHETIC DATA)', note: 'Independent portfolio simulations built with AI-assisted development. These are demonstrations, not client engagements or production AML platform experience. gabtun2t.github.io/Gabriel-portfolio', p: [
      'AML transaction monitoring and investigation lab: seven explainable monitoring rules, alert scoring, KYC-related profile review, evidence checklist, disposition workflow with rationale, and exportable case narrative; five of the rules, plus a ledger-to-ERP cross-check that isolates a decimal-shift posting error, also written in SQL and parity-checked against the application logic.',
      'Supporting labs: ERP migration reconciliation with root-cause tracing; mock bank payment API with idempotency, retries and audit trail; financial data pipeline with validation, lineage and data-quality metrics; SQL checked against SQLite.',
    ] },
    { h: 'EARLIER EXPERIENCE', earlier: EARLIER },
    { h: 'EDUCATION', p: EDUCATION },
    { h: 'TRAINING, CERTIFICATIONS & PRODUCT BADGES', p: [
      'Anti-Money Laundering (AML) Training | LinkedIn Learning | Completed',
      SAGE_CERTS + ' | Sage X3 Project Management Training',
      BADGES,
    ] },
  ],
};
