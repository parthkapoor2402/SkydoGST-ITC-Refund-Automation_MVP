"""
GST ITC Refund MVP — Streamlit shell for Streamlit Community Cloud.

The React+Vite UI cannot be reached on a separate port from browsers on Cloud.
This app runs the Express API on 127.0.0.1 inside the container and calls it
from Python (server-side only).

Deploy on Streamlit Cloud:
  Main file path: streamlit_app.py
  Python 3.11+

Secrets (Settings → Secrets):
  GROK_API_KEY = "your-xai-api-key"

Optional local env instead of secrets: set GROK_API_KEY before `streamlit run`.
"""

from __future__ import annotations

import atexit
import hashlib
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import streamlit as st

REPO_ROOT = Path(__file__).resolve().parent
API = "http://127.0.0.1:3001"


def _grok_fingerprint() -> str:
    try:
        s = st.secrets.get("GROK_API_KEY", "") if hasattr(st, "secrets") else ""
    except Exception:
        s = ""
    env = os.environ.get("GROK_API_KEY", "")
    raw = (s or env) or ""
    return raw[:12] + str(len(raw))


def _backend_build_stamp() -> str:
    """Bust Streamlit cache when server code changes so Node is rebuilt (avoids stale /api routes)."""
    paths = [
        REPO_ROOT / "server" / "src" / "app.ts",
        REPO_ROOT / "server" / "src" / "routes" / "sessionRoutes.ts",
        REPO_ROOT / "server" / "package.json",
        REPO_ROOT / "streamlit_app.py",
    ]
    h = hashlib.sha256()
    h.update(b"spawn_kill_port_v1")
    for p in paths:
        try:
            h.update(p.read_bytes())
        except OSError:
            h.update(str(p).encode())
    return h.hexdigest()[:24]


def _free_listeners_on_port(port: int) -> None:
    """Release :port so a new Node server can bind (avoids stale API without /api/session/*)."""
    p = str(port)
    try:
        if os.name == "nt":
            r = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            for line in (r.stdout or "").splitlines():
                if f":{p}" not in line or "LISTENING" not in line.upper():
                    continue
                parts = line.split()
                if not parts:
                    continue
                pid = parts[-1]
                if pid.isdigit():
                    subprocess.run(
                        ["taskkill", "/F", "/PID", pid],
                        capture_output=True,
                        timeout=15,
                    )
        else:
            subprocess.run(
                f"fuser -k {p}/tcp 2>/dev/null || true",
                shell=True,
                timeout=25,
            )
    except (OSError, subprocess.TimeoutExpired, subprocess.SubprocessError):
        pass
    time.sleep(0.6)


@st.cache_resource
def ensure_backend(_grok_fp: str, _backend_stamp: str) -> subprocess.Popen:
    env = os.environ.copy()
    try:
        gk = st.secrets.get("GROK_API_KEY", "")
        if gk:
            env["GROK_API_KEY"] = str(gk)
    except Exception:
        pass
    env["PORT"] = "3001"
    env.setdefault("E2E_MOCK_GROK", "0")

    # npm ci skips devDependencies when NODE_ENV=production — TypeScript (tsc) is a devDep.
    env_install = {**env, "NODE_ENV": "development"}
    env_run = {**env, "NODE_ENV": "production"}

    with st.spinner("Installing dependencies (first run can take several minutes)…"):
        r = subprocess.run(
            ["npm", "ci"],
            cwd=REPO_ROOT,
            env=env_install,
            capture_output=True,
            text=True,
            timeout=900,
        )
        if r.returncode != 0:
            raise RuntimeError(
                "npm ci failed:\n" + (r.stderr or r.stdout or "")[:8000]
            )

    with st.spinner("Building server…"):
        r = subprocess.run(
            ["npm", "run", "build", "-w", "server"],
            cwd=REPO_ROOT,
            env=env_install,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if r.returncode != 0:
            raise RuntimeError(
                "server build failed:\n" + (r.stderr or r.stdout or "")[:8000]
            )

    _free_listeners_on_port(int(env["PORT"]))

    proc = subprocess.Popen(
        ["npm", "run", "start", "-w", "server"],
        cwd=REPO_ROOT,
        env=env_run,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    def _cleanup() -> None:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()

    atexit.register(_cleanup)

    deadline = time.time() + 120
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(
                f"API process exited early (code {proc.returncode}). "
                "Check server logs locally with npm run start -w server."
            )
        try:
            res = requests.get(f"{API}/api/health", timeout=2)
            if res.ok:
                return proc
        except OSError:
            pass
        time.sleep(0.5)

    _cleanup()
    raise RuntimeError("API did not become healthy in time.")


def api_clear_firas() -> None:
    r = requests.post(f"{API}/api/session/clear-firas", timeout=60)
    r.raise_for_status()


def api_clear_invoices() -> None:
    r = requests.post(f"{API}/api/session/clear-invoices", timeout=60)
    r.raise_for_status()


def api_session_reset() -> None:
    url = f"{API}/api/session/reset"
    r = requests.post(
        url,
        timeout=60,
        headers={"Content-Type": "application/json"},
        json={},
    )
    if r.ok:
        return
    if r.status_code == 404 or "Cannot POST" in (r.text or ""):
        g = requests.get(url, timeout=60)
        g.raise_for_status()
        return
    r.raise_for_status()


def api_upload_fira(files: list[tuple[str, bytes]]) -> dict[str, Any]:
    mp = [("files", (name, data, "application/json")) for name, data in files]
    r = requests.post(f"{API}/api/fira/upload", files=mp, timeout=120)
    r.raise_for_status()
    return r.json()


def api_upload_invoices(files: list[tuple[str, bytes]]) -> dict[str, Any]:
    mp = [("files", (name, data, "application/json")) for name, data in files]
    r = requests.post(f"{API}/api/invoices/upload", files=mp, timeout=120)
    r.raise_for_status()
    return r.json()


def api_list_firas() -> list[dict[str, Any]]:
    r = requests.get(f"{API}/api/fira/list", timeout=60)
    r.raise_for_status()
    return r.json().get("items") or []


def api_list_invoices() -> list[dict[str, Any]]:
    r = requests.get(f"{API}/api/invoices/list", timeout=60)
    r.raise_for_status()
    return r.json().get("items") or []


def api_match_run() -> dict[str, Any]:
    r = requests.post(f"{API}/api/match/run", json={}, timeout=300)
    r.raise_for_status()
    return r.json()


def api_match_results() -> list[dict[str, Any]]:
    r = requests.get(f"{API}/api/match/results", timeout=60)
    r.raise_for_status()
    return r.json().get("items") or []


def api_approve(row_id: str) -> None:
    r = requests.put(f"{API}/api/match/{row_id}/approve", timeout=60)
    r.raise_for_status()


def api_reject(row_id: str) -> None:
    r = requests.put(f"{API}/api/match/{row_id}/reject", timeout=60)
    r.raise_for_status()


def api_override(row_id: str, invoice_number: str) -> None:
    r = requests.put(
        f"{API}/api/match/{row_id}/override",
        json={"invoiceNumber": invoice_number.strip()},
        timeout=60,
    )
    r.raise_for_status()


def map_fira_record(item: dict[str, Any]) -> dict[str, Any]:
    p = item["parsed"]
    return {
        "id": item["id"],
        "sourceFileName": item.get("sourceFileName") or "fira.json",
        "amountInr": p["creditedAmountInr"]["value"],
        "valueDate": p["valueDateIso"],
        "remitterNameRaw": p["remitterName"],
        "referenceNo": p["referenceNumber"],
        "parseConfidence": 0.95,
        "currencyOriginal": p["amountForeign"]["currency"],
        "amountOriginal": p["amountForeign"]["value"],
    }


def map_invoice_record(item: dict[str, Any]) -> dict[str, Any]:
    p = item["parsed"]
    iv = p["taxableValueInr"] + p["igstAmount"]
    return {
        "id": item["id"],
        "sourceFileName": item.get("sourceFileName") or "inv.json",
        "supplierGstin": p["exporterGSTIN"],
        "invoiceNo": p["invoiceNumber"],
        "invoiceDate": p["invoiceDate"],
        "invoiceValue": iv,
        "taxableValue": p["taxableValueInr"],
        "integratedTax": p["igstAmount"],
        "clientNameRaw": p["client"]["name"],
        "parseConfidence": 0.9,
        "currency": p["totalAmount"]["currency"],
        "amountOriginal": p["totalAmount"]["value"],
    }


def tier_to_method(tier: Any) -> str:
    t = int(tier) if tier is not None else 0
    if t == 1:
        return "Exact"
    if t == 4:
        return "AI"
    if t in (2, 3):
        return "Fuzzy"
    return "Manual"


def build_approved_matches(
    firas: list[dict[str, Any]],
    invoices: list[dict[str, Any]],
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    out: list[dict[str, Any]] = []
    for row in rows:
        if row.get("decision") not in ("approved", "overridden"):
            continue
        m = row["match"]
        inv_no = row.get("overrideInvoiceNumber") or m.get("matchedInvoiceNumber")
        if not inv_no:
            continue
        ref = m.get("firaReferenceNumber")
        sf = next(
            (f for f in firas if f.get("parsed", {}).get("referenceNumber") == ref),
            None,
        )
        si = next(
            (
                i
                for i in invoices
                if i.get("parsed", {}).get("invoiceNumber") == inv_no
            ),
            None,
        )
        if not sf or not si:
            continue
        out.append(
            {
                "fira": map_fira_record(sf),
                "invoice": map_invoice_record(si),
                "matchMethod": tier_to_method(m.get("tier")),
                "matchConfidence": str(m.get("confidence", "")),
                "approvedBy": "Exporter",
                "approvedAt": now,
            }
        )
    return out


def api_report_generate(payload: list[dict[str, Any]]) -> dict[str, Any]:
    r = requests.post(
        f"{API}/api/report/generate",
        json={"approvedMatches": payload},
        timeout=120,
    )
    r.raise_for_status()
    return r.json()


def api_report_preview() -> dict[str, Any]:
    r = requests.get(f"{API}/api/report/preview", timeout=60)
    r.raise_for_status()
    return r.json()


def api_download_bundle() -> tuple[bytes, str]:
    r = requests.get(f"{API}/api/download/bundle", timeout=180)
    r.raise_for_status()
    cd = r.headers.get("Content-Disposition") or ""
    name = "ca-bundle.zip"
    if "filename=" in cd:
        part = cd.split("filename=", 1)[-1].strip().strip('"')
        if part:
            name = part
    return r.content, name


def main() -> None:
    st.set_page_config(
        page_title="Skydo GST ITC Refund MVP",
        layout="wide",
    )
    st.title("GST ITC refund automation (MVP)")
    st.caption(
        "Streamlit hosts this page; the Node API runs only inside this app’s server "
        "and is not exposed on a separate public URL."
    )

    try:
        ensure_backend(_grok_fingerprint(), _backend_build_stamp())
    except Exception as e:
        st.error("Could not start the API backend.")
        st.code(str(e), language="text")
        st.info(
            "On **Streamlit Cloud**, add **packages.txt** (nodejs, npm) and set "
            "**GROK_API_KEY** in Secrets. Main file path must be **streamlit_app.py**."
        )
        return

    try:
        h = requests.get(f"{API}/api/health", timeout=5).json()
        st.success(f"API ready: {h}")
    except OSError as e:
        st.warning(f"Health check: {e}")

    tab_up, tab_mt, tab_rp = st.tabs(
        ["1. Upload", "2. Match & review", "3. Report & download"]
    )

    with tab_up:
        if st.session_state.pop("streamlit_reset_done", False):
            st.success(
                "All session data cleared: FIRAs, invoices, match results, and report."
            )

        st.subheader("Upload FIRA and invoice JSON files")
        ff = st.file_uploader(
            "FIRA JSON files",
            type=["json"],
            accept_multiple_files=True,
            key="fira_ul",
        )
        if ff and st.button("Upload FIRA files", key="btn_fira"):
            pairs = [(f.name, f.getvalue()) for f in ff]
            try:
                api_clear_firas()
                res = api_upload_fira(pairs)
                err = res.get("errors") or []
                if err:
                    st.warning(err)
                nf = len(api_list_firas())
                st.success(
                    f"Uploaded FIRA set replaced. Session: **{nf}** FIRA(s) (deduplicated by reference)."
                )
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

        inf = st.file_uploader(
            "Invoice JSON files",
            type=["json"],
            accept_multiple_files=True,
            key="inv_ul",
        )
        if inf and st.button("Upload invoice files", key="btn_inv"):
            pairs = [(f.name, f.getvalue()) for f in inf]
            try:
                api_clear_invoices()
                res = api_upload_invoices(pairs)
                err = res.get("errors") or []
                if err:
                    st.warning(err)
                ni = len(api_list_invoices())
                st.success(
                    f"Uploaded invoice set replaced. Session: **{ni}** invoice(s) (deduplicated by invoice #)."
                )
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

        try:
            nf = len(api_list_firas())
            ni = len(api_list_invoices())
            st.info(f"Session: **{nf}** FIRAs, **{ni}** invoices loaded.")
        except requests.HTTPError as e:
            st.caption(str(e))

        if st.button("🔄 Reset everything", key="btn_reset_all"):
            try:
                api_session_reset()
                st.session_state["streamlit_reset_done"] = True
                st.rerun()
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

    with tab_mt:
        st.subheader("Run matcher, then approve or override rows")
        if st.button("Run matching", type="primary", key="btn_match"):
            try:
                with st.spinner("Matching (AI calls may take a minute)…"):
                    batch = api_match_run()
                st.json(batch.get("summary", batch))
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

        try:
            rows = api_match_results()
        except requests.HTTPError:
            rows = []

        if not rows:
            st.caption("No match rows yet. Upload files and run matching.")
        else:
            for row in rows:
                m = row.get("match") or {}
                rid = row["id"]
                label = (
                    f"**{m.get('firaReferenceNumber', '?')}** → "
                    f"`{m.get('matchedInvoiceNumber')}` — "
                    f"{m.get('status', '')} / **{row.get('decision', '')}**"
                )
                with st.expander(label):
                    st.json(m)
                    c1, c2 = st.columns(2)
                    with c1:
                        if st.button("Approve", key=f"ap-{rid}"):
                            api_approve(rid)
                            st.rerun()
                    with c2:
                        if st.button("Reject", key=f"rj-{rid}"):
                            api_reject(rid)
                            st.rerun()
                    ov = st.text_input(
                        "Override invoice number",
                        key=f"ov-{rid}",
                        placeholder="e.g. INV-HP-02",
                    )
                    if st.button("Apply override", key=f"ao-{rid}"):
                        if ov.strip():
                            api_override(rid, ov)
                            st.rerun()
                        else:
                            st.error("Enter an invoice number.")

    with tab_rp:
        st.subheader("Generate RFD-01 data and download CA bundle")
        if st.button("Generate report from approved rows", key="btn_gen"):
            try:
                firas = api_list_firas()
                invoices = api_list_invoices()
                rows = api_match_results()
                payload = build_approved_matches(firas, invoices, rows)
                if not payload:
                    st.error(
                        "No approved/overridden rows with resolved FIRA+invoice pairs. "
                        "Approve matches in the previous tab."
                    )
                else:
                    api_report_generate(payload)
                    st.success(f"Report generated ({len(payload)} pair(s)).")
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

        if st.button("Load preview", key="btn_preview"):
            try:
                prev = api_report_preview()
                st.json(prev)
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))

        if st.button("Download CA bundle (ZIP)", key="btn_zip"):
            try:
                data, fname = api_download_bundle()
                st.download_button(
                    label=f"Save {fname}",
                    data=data,
                    file_name=fname,
                    mime="application/zip",
                    key="dl_zip_confirm",
                )
            except requests.HTTPError as e:
                st.error(e.response.text if e.response is not None else str(e))


if __name__ == "__main__":
    main()
