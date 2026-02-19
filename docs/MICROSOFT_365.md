# Microsoft 365 integration

What you can do with Microsoft 365 (Outlook, SharePoint, Teams) in Roof Flow, what’s implemented, and what’s next.

## What you can build with Microsoft 365

Everything goes through **Microsoft Graph** (`https://graph.microsoft.com/v1.0/`). You register one app in **Azure Portal** (App registrations) and use **OAuth 2.0** to get tokens, then call REST APIs.

### Outlook (email + calendar)

| Capability | API / Permission | Use in Roof Flow |
|------------|------------------|-------------------|
| **Read mail** | `Mail.Read` | Pull customer/job-related emails (future) |
| **Send mail** | `Mail.Send` | Send meeting recap email after L10 (Phase 3) |
| **Read calendar** | `Calendars.Read` | — |
| **Write calendar** | `Calendars.ReadWrite` | Sync L10 meeting to Outlook (done) |

### SharePoint (sites, lists, files)

| Capability | API / Permission | Use in Roof Flow |
|------------|------------------|-------------------|
| **Sites / drives** | `Sites.ReadWrite.All` or site-specific | List sites, pick a document library |
| **Files** | Drive items | Upload meeting notes, scorecard CSV (Phase 4) |
| **Lists** | Lists / list items | Sync jobs, customers, or EOS data (future) |
| **Search** | Search API | Find docs by customer or job (future) |

### Teams (channels, messages)

| Capability | API / Permission | Use in Roof Flow |
|------------|------------------|-------------------|
| **List teams/channels** | `Channel.ReadBasic.All`, etc. | Channel picker (like Slack) |
| **Send channel message** | `ChannelMessage.Send` | Post L10 recap to a channel (Phase 3) |
| **Bots** | RSC permissions | Optional “L10 status” bot (future) |

---

## What’s implemented

- **OAuth**: Connect / Disconnect / Status (tokens in file fallback or Firestore). Scopes include **Mail.Send**, **Team.ReadBasic.All**, **Channel.ReadBasic.All**, **ChannelMessage.Send** for recap.
- **Outlook calendar**: “Sync L10 to Calendar” creates a recurring (or one-time) event from the default meeting template, with:
  - Correct **timezone** (9:00 = 9 AM local).
  - **Duration** from the template (sum of section minutes, e.g. 110 mins).
- **Meeting recap (Phase 3)**  
  After “Rate this meeting” in the recap modal: if Microsoft is connected, you can **Send recap to my email** (Outlook) and/or **Post recap to Teams channel**.  
  - **Email**: `POST /me/sendMail` with recap text (title, week, notes, open to-dos, resolved issues). Optional Roof Flow link appended.  
  - **Teams**: Integrations page has a **Post meeting recap to Teams** section: pick a team and channel; recap is posted via `POST /teams/{teamId}/channels/{channelId}/messages` when you conclude an L10 with “Post recap to Teams channel” checked.  
  - APIs: `POST /api/microsoft/send-recap`, `GET /api/microsoft/teams`, `GET /api/microsoft/teams/[teamId]/channels`, `POST /api/microsoft/set-teams-channel`.
- **Integrations page**: Microsoft 365 section, calendar sync, Teams channel picker, error display.

---

## What’s next (optional)

1. **SharePoint (Phase 4)**  
   Save meeting notes or scorecard export to a SharePoint folder.  
   - Azure: add **Sites.ReadWrite.All** (or site-specific).  
   - Code: API to upload file(s), “Save to SharePoint” in app.

2. **Production**  
   In Azure app: add production redirect URI (e.g. `https://yourdomain.com/api/microsoft/callback`).  
   In host (e.g. Vercel): set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`.

---

## Azure app registration (quick reference)

1. **Portal**: [portal.azure.com](https://portal.azure.com) → Microsoft Entra ID → App registrations → New registration.
2. **Name**: e.g. Roof Flow. **Accounts**: “Any Entra ID tenant + personal Microsoft accounts”.
3. **Redirect URI**: Web → `http://localhost:3000/api/microsoft/callback` (and production URL when you have it).
4. **Certificates & secrets**: New client secret → copy value into `MICROSOFT_CLIENT_SECRET`.
5. **API permissions**: Add delegated → Microsoft Graph → `User.Read`, `Calendars.ReadWrite`, `Mail.Send`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `ChannelMessage.Send` (and later SharePoint as needed).
6. **Env**: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` in `.env.local` (see `.env.local.example`).

---

## EOS mapping (for reference)

| EOS in Roof Flow | Microsoft 365 use |
|------------------|-------------------|
| Meeting templates + schedule | Outlook Calendar: recurring L10 event (done) |
| Meeting recap (notes, to-dos, issues) | Outlook Mail or Teams: send/post recap (Phase 3) |
| Scorecard export / backup | SharePoint: upload CSV or notes (Phase 4) |
| Rocks / issues / to-dos | Teams: optional weekly digest (Phase 4) |
