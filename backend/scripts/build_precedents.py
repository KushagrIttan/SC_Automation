"""Build the FAISS precedent corpus (backend/data/<cat>/notesheets.json).

Source of truth: data/<cat>/note_sheet_N.docx — the original note-sheet
records shipped with the project. Amounts there are USD; they are converted
to INR at a fixed rate (83.0) and rounded to the nearest 100 so the corpus is
consistent with the rupee-denominated UI. Every generated entry records its
source file for traceability.
"""

import json
import os
import re
import zipfile

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC_DATA = os.path.join(ROOT, "data")
OUT_DATA = os.path.join(ROOT, "backend", "data")
USD_TO_INR = 83.0


def docx_text(path: str) -> str:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml").decode("utf-8")
    xml = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    return re.sub(r"\n{2,}", "\n", text).strip()


def parse_fields(text: str) -> dict:
    fields = {}
    for line in text.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip().lower()] = value.strip()
    return fields


def usd_to_inr(value: str) -> int:
    digits = re.sub(r"[^\d.]", "", value)
    if not digits:
        return 0
    return int(round(float(digits) * USD_TO_INR / 100.0) * 100)


CHAIN_BY_LEVEL = {
    "department head": ["HoD"],
    "dean": ["HoD", "Dean"],
    "finance committee": ["HoD", "Dean", "Registrar", "Finance Officer"],
}

RULES_LINE = "GFR Rule 153"


def compose(cat: str, n: int, f: dict, source_file: str) -> dict:
    slug_id = f"NS-{cat[:4].upper().replace('_', '')}-{n:03d}"
    level = f.get("approval level", "Department Head")
    chain = CHAIN_BY_LEVEL.get(level.lower(), CHAIN_BY_LEVEL["department head"])

    lines = [f"TO: {chain[-1]}", f"FROM: {f.get('department', 'Department of Student Affairs')}"]

    if cat == "event_expenditure":
        total = usd_to_inr(f.get("total expenditure", "0"))
        subject = f"Sanction of Rs {total:,} for {f.get('event name', 'student event')}"
        lines += [
            f"SUBJECT: {subject}",
            "",
            f"This is to request sanction of Rs {total:,} towards the event '{f.get('event name', '')}' held on {f.get('date', 'N/A')}.",
            f"Budget breakdown: Venue {usd_to_inr(f.get('venue cost', '0')):,}; Catering {usd_to_inr(f.get('catering cost', '0')):,}; Decorations {usd_to_inr(f.get('decorations', '0')):,}.",
            "Justification: The event directly supports student engagement and was reviewed against budget provisions for the academic year.",
            f"Precedent: Recorded as an approved expenditure at {level} level.",
            f"Rules Cited: {RULES_LINE} (procurement of services)",
            f"Approval Chain: {' -> '.join(chain)}",
        ]
    elif cat == "guest_faculty_honorarium":
        total = usd_to_inr(f.get("honorarium amount", "0"))
        subject = f"Honorarium of Rs {total:,} for {f.get('faculty name', 'guest faculty')}"
        lines = [
            f"TO: {chain[-1]}",
            "FROM: Head of Department",
            f"SUBJECT: {subject}",
            "",
            f"Payment of honorarium Rs {total:,} is proposed for {f.get('faculty name', 'the guest faculty')} ({f.get('department', '')} department) for the lecture delivered on {f.get('lecture date', 'N/A')}.",
            "Justification: The session supplemented the regular curriculum with expert instruction and complies with applicable honorarium rates.",
            "Precedent: Recorded as an approved honorarium payment.",
            f"Approval Chain: {' -> '.join(chain)}",
        ]
    elif cat == "student_travel":
        total = usd_to_inr(f.get("total cost", "0"))
        subject = f"TA-DA sanction of Rs {total:,} for {f.get('student name', 'student')} — {f.get('conference name', 'conference')}"
        lines = [
            f"TO: {chain[-1]}",
            "FROM: Faculty Advisor",
            f"SUBJECT: {subject}",
            "",
            f"Reimbursement of Rs {total:,} is requested for {f.get('student name', 'the student')} to attend {f.get('conference name', 'a conference')} at {f.get('destination', 'N/A')}.",
            f"Breakdown: Travel {usd_to_inr(f.get('travel cost', '0')):,}; Accommodation {usd_to_inr(f.get('accommodation', '0')):,}.",
            "Justification: Paper acceptance reflects institutional research quality; TA-DA norms apply.",
            "Precedent: Recorded as an approved travel claim.",
            f"Approval Chain: {' -> '.join(chain)}",
        ]
    elif cat == "club_budget":
        total = usd_to_inr(f.get("budget request", "0"))
        subject = f"Budget of Rs {total:,} for {f.get('club name', 'club')} — {f.get('purpose', 'activity')}"
        lines = [
            f"TO: {chain[-1]}",
            "FROM: Faculty Advisor, " + f.get("club name", "Club"),
            f"SUBJECT: {subject}",
            "",
            f"The {f.get('club name', 'club')} requests Rs {total:,} for '{f.get('purpose', 'activities')}' dated {f.get('date', 'N/A')}.",
            "Justification: Sustains co-curricular activity planned for the session and stays within the allocated club grant.",
            f"Rules Cited: {RULES_LINE} (procurement for club activities)",
            f"Approval Chain: {' -> '.join(chain)}",
        ]
    else:
        raise ValueError(f"Unknown category {cat}")

    lines.append("")
    lines.append(f"Approved Amount: Rs {total:,}")
    lines.append(f"Status: Approved | Source record: {source_file}")
    return {"id": slug_id, "category": cat, "content": "\n".join(lines), "amount": total}


def main() -> None:
    summary = {}
    for cat in sorted(os.listdir(SRC_DATA)):
        src_dir = os.path.join(SRC_DATA, cat)
        if not os.path.isdir(src_dir):
            continue
        docx_files = sorted(
            (f for f in os.listdir(src_dir) if f.endswith(".docx")),
            key=lambda name: int(re.search(r"\d+", name).group()),
        )
        if not docx_files:
            continue
        entries = []
        for i, fname in enumerate(docx_files, start=1):
            path = os.path.join(src_dir, fname)
            fields = parse_fields(docx_text(path))
            entries.append(compose(cat, i, fields, f"data/{cat}/{fname}"))
        out_dir = os.path.join(OUT_DATA, cat)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "notesheets.json")

        # Merge: keep any pre-existing richer entries, drop one-line stubs.
        merged = []
        if os.path.exists(out_path):
            with open(out_path, encoding="utf-8") as fh:
                try:
                    merged = json.load(fh)
                except json.JSONDecodeError:
                    merged = []
        merged = [e for e in merged if len(e.get("content", "")) > 200]
        existing_ids = {e.get("id") for e in merged}
        for e in entries:
            if e["id"] not in existing_ids:
                merged.append(e)

        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(merged, fh, indent=2, ensure_ascii=False)
        summary[cat] = len(merged)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
