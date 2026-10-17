/**
 * Concise AML methodology reference used by the AML lab. Educational summary of public guidance,
 * not legal advice; Canadian obligations are kept separate from general international terminology.
 */
const REFS = [
  { label: 'FINTRAC — Reporting suspicious transactions to FINTRAC', url: 'https://fintrac-canafe.canada.ca/guidance-directives/transaction-operation/str-dod/str-dod-eng' },
  { label: 'FINTRAC — Reporting large cash transactions to FINTRAC', url: 'https://fintrac-canafe.canada.ca/guidance-directives/transaction-operation/lctr-doie/lctr-doie-eng' },
  { label: 'FINTRAC — Reporting transactions: the 24-hour rule', url: 'https://fintrac-canafe.canada.ca/guidance-directives/transaction-operation/24hour/1-eng' },
  { label: 'FINTRAC — Compliance program requirements', url: 'https://fintrac-canafe.canada.ca/guidance-directives/compliance-conformite/Guide4/4-eng' },
  { label: 'FINTRAC — Obligations and guidance (index)', url: 'https://fintrac-canafe.canada.ca/guidance-directives/client-clientele/1-eng' },
  { label: 'FATF — The FATF Recommendations', url: 'https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html' },
];

export function AmlMethodology() {
  return (
    <div className="stack method">
      <div className="callout info">
        <h4>About this page</h4>
        <p className="small">A short, plain-English summary of how AML monitoring and investigation work, written to explain the design of this lab. It paraphrases public guidance for learning purposes. It is not legal advice and is not endorsed by FINTRAC, FATF or any regulator. Always check the current official guidance linked below.</p>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="eyebrow">General (international)</div>
          <h3 style={{ marginTop: 0 }}>Terms used around the world</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            <li><strong>AML / CFT</strong> — anti-money laundering and countering the financing of terrorism.</li>
            <li><strong>Risk-based approach</strong> — understand the money-laundering and terrorist-financing risks you face and apply controls in proportion to them (FATF Recommendation 1).</li>
            <li><strong>KYC</strong> (know your customer) and <strong>CDD</strong> (customer due diligence) — identify and verify the customer and any beneficial owner, understand the purpose and nature of the relationship, and monitor it over time (FATF Recommendation 10).</li>
            <li><strong>EDD</strong> (enhanced due diligence) — stronger measures for higher-risk customers or situations.</li>
            <li><strong>SAR</strong> — “suspicious activity report”, the term used in the US and UK. Canada calls it an <strong>STR</strong>.</li>
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow">Canada</div>
          <h3 style={{ marginTop: 0 }}>Canadian context</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            <li><strong>PCMLTFA</strong> — the Proceeds of Crime (Money Laundering) and Terrorist Financing Act and its regulations set the obligations of reporting entities.</li>
            <li><strong>FINTRAC</strong> — Canada’s financial intelligence unit and AML/ATF regulator. It publishes the guidance linked below.</li>
            <li><strong>Compliance program</strong> — reporting entities must have one: a compliance officer, approved policies and procedures, a documented risk assessment, ongoing training and a two-year effectiveness review. Where risk is high, they must take enhanced measures.</li>
            <li><strong>Know your client</strong> — FINTRAC’s guidance covers verifying identity, keeping records, and ongoing monitoring of business relationships.</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>The investigation lifecycle used in this lab</h3>
        <ol className="steps">
          <li><strong>Transaction monitoring.</strong> Activity is screened against scenarios that describe behaviour worth a second look: unusual amounts, velocity, cash patterns, pass-through, activity outside the declared profile. A rule hit creates an alert. It is a prompt to review, not a finding.</li>
          <li><strong>Alert triage.</strong> Alerts are ordered by risk so that the most significant are reviewed first. In the lab, the score is a sum of rule weights plus KYC and customer-risk modifiers, and the breakdown is always visible.</li>
          <li><strong>Evidence gathering.</strong> The investigator compares activity with the KYC profile, checks KYC currency, looks at counterparties, documents on file and prior requests, and checks whether the data itself is reliable (lineage, duplicates, source-system cross-checks).</li>
          <li><strong>False-positive investigation.</strong> An alert can be explained by legitimate activity (documented seasonality, a property sale) or by a data defect (a duplicated load, a decimal-scale error). The explanation must be documented and must cover every indicator, not just the most visible one.</li>
          <li><strong>Disposition.</strong> Further investigation, request information, escalate to compliance, or close as an explained exception. In the lab, closing is blocked unless documents explain every triggered rule, and every decision needs a written rationale and reviewed evidence.</li>
          <li><strong>Compliance escalation.</strong> Unresolved concerns go to the compliance function with the evidence. Escalation is not an accusation, and the investigator does not decide whether an offence occurred.</li>
          <li><strong>Documentation.</strong> The case narrative records the alert, the profile, the evidence reviewed, the decision and why. A reviewer should be able to follow the reasoning without asking the investigator.</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Regulatory reporting boundaries (Canada)</h3>
        <p className="small">The lab stops at “escalate to compliance”. It does not file, draft or recommend regulatory reports. For context, FINTRAC’s guidance describes, among other reports:</p>
        <ul className="small" style={{ paddingLeft: 18 }}>
          <li><strong>Suspicious transaction report (STR)</strong> — required when there are “reasonable grounds to suspect” that a transaction is related to a money-laundering or terrorist-financing offence. There is no monetary threshold, and the report must be submitted “as soon as practicable” after the measures that establish those grounds. The contents of an STR must not be disclosed to the client, and FINTRAC cautions against tipping off a client (for example, by asking questions you would not normally ask).</li>
          <li><strong>Large cash transaction report (LCTR)</strong> — required when $10,000 or more in cash is received in a single transaction, or in two or more amounts totalling $10,000 or more within 24 consecutive hours under the 24-hour rule. It is due within 15 calendar days.</li>
          <li>Other reports (for example electronic funds transfer, large virtual currency transaction and terrorist property reports) are outside the scope of this lab.</li>
        </ul>
        <div className="callout warn" style={{ marginTop: 10 }}>
          <p className="small"><strong>How this relates to the lab’s rule R3.</strong> R3 flags three or more cash deposits between $9,000 and $9,999.99 within seven days as a review indicator. It is not the LCTR obligation. In a real Canadian institution, deposits like scenario S6’s would also be assessed under the 24-hour rule, and that assessment belongs to the institution’s compliance function.</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Official references</h3>
        <ul className="small" style={{ paddingLeft: 18 }}>
          {REFS.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a></li>)}
        </ul>
        <p className="small muted" style={{ margin: 0 }}>Links are to public guidance. Their inclusion does not imply endorsement of this portfolio.</p>
      </div>
    </div>
  );
}
