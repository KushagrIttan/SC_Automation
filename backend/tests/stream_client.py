"""Client-side evidence: timestamps of each real pipeline event."""
import json
import time

import requests

body = {
    "request_text": "Sanction Rs 68000 for six digital storage oscilloscopes for Signals Lab",
    "category": "lab_equipment_purchase",
    "amount": 68000,
    "requester_name": "Dr. A. Sharma",
    "department": "Electronics",
}

start = time.perf_counter()
with requests.post(
    "http://127.0.0.1:8001/api/notesheets/generate/stream", json=body, stream=True, timeout=300
) as resp:
    print("HTTP", resp.status_code)
    for line in resp.iter_lines(decode_unicode=True):
        if not line:
            continue
        event = json.loads(line)
        elapsed = time.perf_counter() - start
        if event.get("stage") == "complete":
            result = event["result"]
            print(f"[{elapsed:7.2f}s] COMPLETE id={result['id']} source={result['draft_source']} "
                  f"precedents={len(result['precedents_used'])} rules={result['rules_cited']}")
        else:
            extra = {k: v for k, v in event.items() if k not in ("stage", "status")}
            print(f"[{elapsed:7.2f}s] {event['stage']:9s} {event['status']:8s} {extra}")
