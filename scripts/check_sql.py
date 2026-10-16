#!/usr/bin/env python3
"""
SQL parity check (Python standard library only).

1. Loads data/seed_sqlite.sql into an in-memory SQLite database.
2. Runs sql/reconciliation.sql, sql/aml_rules.sql and sql/pipeline_model.sql.
3. Asserts the SQL results equal the TypeScript engine results in data/expected/.
4. Writes src/generated/sql_snapshot.json — the real SQLite output shown on the website.

Run:  npm run seed && npm run test:sql
"""
import json
import pathlib
import re
import sqlite3
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" — {detail}"))
    if not ok:
        failures.append(name)


def split_queries(text):
    """Return (setup_sql, [(id, title, sql)]) using '-- @query id: title' markers."""
    parts = re.split(r"^-- @query ([a-z0-9_]+): (.*)$", text, flags=re.M)
    setup, queries = parts[0], []
    for i in range(1, len(parts), 3):
        queries.append((parts[i], parts[i + 1].strip(), parts[i + 2].strip().rstrip(";")))
    return setup, queries


def run_file(db, path):
    setup, queries = split_queries((ROOT / path).read_text(encoding="utf8"))
    db.executescript(setup)
    out = {}
    for qid, title, sql in queries:
        cur = db.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = [list(r) for r in cur.fetchall()]
        out[qid] = {"title": title, "sql": sql + ";", "columns": cols, "rows": rows}
    return out


def main():
    db = sqlite3.connect(":memory:")
    db.executescript((ROOT / "data" / "seed_sqlite.sql").read_text(encoding="utf8"))
    print(f"SQLite {sqlite3.sqlite_version}")

    snapshot = {"sqlite_version": sqlite3.sqlite_version, "files": {}}

    # --- Reconciliation parity -------------------------------------------------------------
    recon = run_file(db, "sql/reconciliation.sql")
    snapshot["files"]["reconciliation.sql"] = recon
    key = lambda t: tuple("" if x is None else x for x in t)
    sql_rows = sorted(((r[0], r[1], r[3]) for r in db.execute("SELECT src_id, je_id, matched_by, status FROM recon_result")), key=key)
    ts_rows = sorted(((r["src_id"], r["je_id"], r["status"]) for r in json.loads((ROOT / "data/expected/reconciliation.json").read_text())), key=key)
    check("reconciliation: SQL rows == TypeScript rows", sql_rows == ts_rows,
          f"{len(sql_rows)} SQL vs {len(ts_rows)} TS rows; first diff {set(sql_rows) ^ set(ts_rows)}")

    # --- AML rule parity ---------------------------------------------------------------------
    aml = run_file(db, "sql/aml_rules.sql")
    snapshot["files"]["aml_rules.sql"] = aml
    expected = json.loads((ROOT / "data/expected/aml_rules.json").read_text())
    for qid in ["r1_high_velocity", "r2_large_vs_profile", "r3_cash_below_threshold", "r4_monthly_inflow", "r5_duplicates"]:
        cols = aml[qid]["columns"]
        idx = cols.index("customer_id")
        got = sorted({r[idx] for r in aml[qid]["rows"]})
        check(f"aml {qid}: SQL customers == TypeScript customers", got == expected[qid], f"SQL {got} vs TS {expected[qid]}")
    erp = aml["erp_cross_check"]["rows"]
    check("aml erp_cross_check finds exactly the decimal-shift row", len(erp) == 1 and erp[0][2] == "RCPT-55821", str(erp))

    # --- Pipeline parity -----------------------------------------------------------------------
    pipe = run_file(db, "sql/pipeline_model.sql")
    snapshot["files"]["pipeline_model.sql"] = pipe
    exp = json.loads((ROOT / "data/expected/pipeline.json").read_text())
    got = [{"month": r[0], "channel": r[1], "amountCad": r[2], "count": r[3]} for r in pipe["monthly_volume_by_channel"]["rows"]]
    ok = len(got) == len(exp) and all(g["month"] == e["month"] and g["channel"] == e["channel"] and g["count"] == e["count"] and abs(g["amountCad"] - e["amountCad"]) < 0.011 for g, e in zip(got, exp))
    check("pipeline monthly_volume_by_channel: SQL == TypeScript", ok, f"{got[:2]} vs {exp[:2]}")

    out = ROOT / "src" / "generated" / "sql_snapshot.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False), encoding="utf8")
    print(f"Wrote {out.relative_to(ROOT)}")
    if failures:
        print(f"\n{len(failures)} check(s) failed")
        sys.exit(1)
    print("\nAll SQL parity checks passed")


if __name__ == "__main__":
    main()
