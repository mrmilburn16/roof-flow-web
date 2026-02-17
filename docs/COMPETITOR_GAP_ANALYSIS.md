# RoofFlow vs Strety & Ninety — Gap Analysis

Quick reference for what RoofFlow has today vs the two main EOS-style competitors, and what’s **critical** to add for credibility and parity.

---

## What RoofFlow Has Today

| Area | RoofFlow |
|------|----------|
| **Meetings** | Run-mode agenda: Segue → Scorecard → Goals → To-Dos → Issues → Conclude. Template-driven. No timer, ratings, or recap. |
| **Scorecard** | KPIs with weekly entries, goal vs actual, on/off track. |
| **Goals** | Quarterly goals, on track / off track / done, owner. |
| **To-Dos** | Create, assign owner, toggle done. |
| **Issues** | Create, resolve, priority (1 = highest). |
| **Home** | Next meeting, open to-dos count, off-track goals + open issues. |
| **Auth** | Optional Firebase email/password; protected routes. |
| **Data** | Mock DB + optional Firestore; seed roofing data. |
| **UI** | Sidebar nav, Dawn/Slate/Onyx themes, shared components. |

---

## What Strety & Ninety Have That We Don’t

### Critical (must-have for “real” EOS-style BOS)

| Gap | Strety | Ninety | Why it matters |
|-----|--------|--------|-----------------|
| **Vision / V/TO** | ✅ V/TO™ | ✅ Vision (V/TO) | Core EOS artifact: shared vision, 1‑year/3‑year picture. Without it we’re “meetings + scorecard” but not full EOS. |
| **Accountability Chart** | ✅ | ✅ | Who’s accountable for what. Org structure and roles. Expected by any EOS user. |
| **Rocks (quarterly priorities)** | ✅ Rocks | ✅ Rocks + milestones | We have “Goals” but not the formal EOS “Rocks” framing (1–3 per person, 90-day). Rocks are the main EOS differentiator. |
| **Meeting: Headlines / Rock Review** | ✅ L10 style | ✅ Headlines, Rock Review | Standard L10 has “Headlines” (quick wins) and “Rock Review” before To-Dos/Issues. We only have Segue → Scorecard → Goals → To-Dos → Issues → Conclude. |
| **Meeting recap / follow-up** | ✅ | ✅ Recap emails | We have a “Finish” that alerts; no recap email or export. Users expect “meeting recap” with to-dos and decisions. |

### High value (strong expectation from EOS users)

| Gap | Strety | Ninety | Why it matters |
|-----|--------|--------|-----------------|
| **Meeting rating (1–10)** | ✅ | ✅ | “Rate the meeting” is standard; drives discipline and improvement. |
| **Meeting timer / duration** | ✅ | ✅ | Per-section timing keeps L10 to 90 min. We have `durationMinutes` in template but no timer in run UI. |
| **1-on-1s / Feedback** | ✅ Performance, 1:1s | ✅ Feedback (1-on-1s) | Recurring 1:1s with talking points and notes. Expected in “people/performance” layer. |
| **Process / Playbooks** | ✅ Playbooks | ✅ Process | Document how things get done (EOS “Process” or playbooks). We have no doc/knowledge area. |

### Important for scale and trust

| Gap | Strety | Ninety | Why it matters |
|-----|--------|--------|-----------------|
| **People Analyzer / right people** | ✅ People Analyzer™ | — | EOS tool for “right person, right seat.” More important if we target multi-company later. |
| **Integrations** | Teams, Slack, Asana, HubSpot, etc. | Google, MS365, Teams, Planner, Tasks, ConnectWise | SSO, calendar, task sync. Not blocking for one roofing co, but expected for “platform” positioning. |
| **Multi-level scorecards** | — | ✅ Individual → team → department → leadership → org | We have one level. Ninety’s hierarchy supports larger orgs. |
| **Assessments / surveys** | ✅ Engagement surveys | ✅ Assessments | Pulse, engagement, or EOS ID. Nice for “people” and adoption. |

### Nice-to-have

| Gap | Strety | Ninety |
|-----|--------|--------|
| **Mobile app** | ✅ | ✅ |
| **API** | ✅ | — |
| **Knowledge portal / library** | — | ✅ |
| **EOS Implementer / coach portal** | ✅ | ✅ Coaches |

---

## Terminology Alignment

- **Rocks** = 90-day priorities (we call them “Goals”; consider renaming or adding a “Rocks” view that maps to the same data).
- **L10** = Level 10 Meeting ≈ our “Weekly Leadership Meeting” with Segue, Scorecard, Rocks/Goals, To-Dos, Issues, Conclude. We’re close; adding **Headlines** and **Rock Review** (and optionally **V/TO Review**) gets us to “L10.”
- **V/TO** = Vision/Traction Organizer = Vision + 1‑year + 3‑year (we have none).

---

## Recommended Priorities (Next Steps)

1. **Vision / V/TO** — One page or section: company vision, 1‑year goal, 3‑year picture. Can be simple text/blocks at first.
2. **Accountability Chart** — Org chart / role list (names + roles). Can be a single editable page or list.
3. **Meeting: Headlines + Rock Review** — Add two agenda sections: “Headlines” (quick wins) and “Rock Review” (review Rocks/Goals). Optionally use existing `MeetingSectionKind` and template.
4. **Rocks framing** — Either rename “Goals” to “Rocks” in UI and docs, or add a “Rocks” concept (1–3 per person per quarter) and map it to current goals.
5. **Meeting recap** — On “Finish”: generate recap (to-dos, issues resolved, notes) and either in-app view or “Copy/Email” (no need for email infra day one).
6. **Meeting rating** — Single 1–10 at end of meeting; store with meeting instance (once we have meeting instances).
7. **Meeting timer** — Show countdown or elapsed per section using `durationMinutes`; optional sound at time’s up.

After that, in order: **timer**, **1-on-1s**, **Process/Playbooks**, then **integrations** and **multi-level scorecards** as we scale.

---

## Summary

We’re **not** missing the basics (Scorecard, Goals, To-Dos, Issues, runnable meeting). We’re missing the **distinctly EOS** pieces that Strety and Ninety lead with:

- **Vision/V/TO**
- **Accountability Chart**
- **Rocks** (and Rock Review in the meeting)
- **Headlines** in the meeting
- **Meeting recap** (and ideally **rating** + **timer**)

Adding Vision, Accountability Chart, Headlines, Rock Review, and a real recap will make RoofFlow feel “complete” as an EOS-style BOS for one company; then we can layer in 1-on-1s, Process, and integrations.
