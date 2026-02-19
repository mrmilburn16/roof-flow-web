# Slack integration setup

To connect Roof Flow to Slack so that messages in a channel create to-dos, set up a Slack app and configure the app and environment.

## Scopes to add (Bot Token Scopes)

In your Slack app, go to **OAuth & Permissions** and under **Scopes** > **Bot Token Scopes** add exactly these:

| Scope | Purpose |
|-------|--------|
| `channels:read` | List public channels (channel picker) |
| `channels:manage` | Create new channels ("Add new channel") |
| `channels:history` | Receive message events in public channels |
| `chat:write` | Post "Created to-do" reply in the thread |
| `users:read` | Show "From Slack · @displayname" on to-dos |
| `groups:read` | *(Optional)* List/use private channels |

Copy-paste list for the Slack UI (one per line):

```
channels:read
channels:manage
channels:history
chat:write
users:read
groups:read
```

(Omit `groups:read` if you only use public channels.)

---

## 1. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** > **From scratch**.
2. Name the app (e.g. "Roof Flow") and pick your workspace for development.
3. Open **OAuth & Permissions** and add the **Bot Token Scopes** from the table above (or the copy-paste list).
4. Under **Event Subscriptions**, turn **Enable Events** On.
5. Set **Request URL** to your public Events API endpoint:
   - Production: `https://your-domain.com/api/slack/events`
   - Local: use a tunnel (e.g. `ngrok http 3000`) and set Request URL to `https://<your-ngrok-id>.ngrok.io/api/slack/events`
6. Under **Subscribe to bot events**, add:
   - `message.channels` – new messages in public channels the app is in
7. Save changes. Slack will send a request to your URL for verification; the route responds with the `challenge` value.
8. Back under **OAuth & Permissions**, add a **Redirect URL**:
   - `https://your-domain.com/api/slack/callback` (or your ngrok URL for local).
9. Install the app to your workspace (**Install to Workspace**) if you want to test immediately. When users click "Connect to Slack" in Roof Flow, they will go through OAuth and install the app to their workspace.

## 2. Environment variables

Add to `.env.local` (or your host’s env):

```bash
# Slack app credentials (from api.slack.com/apps → your app)
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret

# App URL used for OAuth redirect (required for Slack callback)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# For local: NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

- **SLACK_CLIENT_ID** and **SLACK_CLIENT_SECRET**: from **Basic Information** > **App Credentials**.
- **SLACK_SIGNING_SECRET**: from **Basic Information** > **App Credentials** > **Signing Secret**. Used to verify that incoming Events API requests are from Slack.

## 3. Firebase Admin (for creating to-dos from Slack)

The `/api/slack/events` route writes new to-dos to Firestore. It uses the Firebase Admin SDK and needs server credentials.

### Full list of env vars for Vercel

| Variable | Where to get it | Required for |
|----------|-----------------|--------------|
| **Slack** | | |
| `SLACK_CLIENT_ID` | Slack app → Basic Information → App Credentials | OAuth, channels |
| `SLACK_CLIENT_SECRET` | Same | OAuth |
| `SLACK_SIGNING_SECRET` | Same → Signing Secret | Events API |
| **App URL** | | |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain, e.g. `https://roof-flow-web.vercel.app` | OAuth redirect |
| **Firebase Admin (server)** | | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project settings → General | Firestore + Admin |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Console → Project settings → Service accounts → Generate new private key → paste the **entire** JSON as the value (single line or escaped) | Firestore on Vercel |
| **Firebase client (if using Firestore + auth in the app)** | | |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → General → Your apps | Client SDK |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same, e.g. `your-project.firebaseapp.com` | Client SDK |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same as above | Client SDK |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same, e.g. `your-project.appspot.com` | Client SDK |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same | Client SDK |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same | Client SDK |
| `NEXT_PUBLIC_USE_FIRESTORE` | Set to `true` so the app reads/writes Firestore (todos, etc.) | Client data |
| `NEXT_PUBLIC_USE_FIREBASE_AUTH` | Set to `true` if you use Firebase Auth | Optional |

**Vercel note:** For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the whole service account JSON. You can minify it to one line (no newlines) or escape newlines. Do not strip any fields (`private_key_id`, `private_key`, `client_email`, etc.) — use the file exactly as downloaded.

## 4. Slack → to-do flow (what’s wired)

For messages in a Slack channel to become to-dos, **you must pick that channel** in Roof Flow. Only one channel is used; messages in that channel create to-dos, others are ignored.

| Step | Where | What happens |
|------|--------|----------------|
| 1 | Roof Flow → Integrations | Click **Connect to Slack** and authorize. |
| 2 | Roof Flow → Integrations | **Pick the channel** where messages should create to-dos (click one of the #channel buttons, or create a channel). This saves the “to-do channel” for your team. |
| 3 | Slack | In that channel, add the Roof Flow app (channel → Integrations → Add apps). |
| 4 | Slack | Post a message (e.g. “Call Brian”). It is sent to our Events API; we create a to-do in Firestore and reply in the thread. |
| 5 | Roof Flow → To-Dos | The new to-do appears (when the app uses Firestore for data). |

If you don’t pick a channel in step 2, no Slack messages will create to-dos.

## 5. User flow (short)

1. In Roof Flow, go to **Integrations**.
2. Click **Connect to Slack** and authorize the app in the chosen workspace.
3. After redirect, **pick the channel** where messages should create to-dos (or click **Create channel** to add one, e.g. `roof-flow-todos`).
4. In Slack, invite the Roof Flow app to that channel (open the channel → Integrations → Add apps).
5. Post a message in the channel (e.g. "Call Brian"). It appears as an open to-do in Roof Flow with "From Slack · @yourname" and a "View in Slack" link. The app replies in the thread: "Created to-do: Call Brian."

## 6. Message didn’t create a to-do?

If you post in the channel but the to-do doesn’t appear in the web app, check:

1. **Channel selected in Roof Flow**  
   Integrations → the same channel must be chosen in the “Select channel” dropdown. Only that channel is used for to-dos.

2. **App is in the channel**  
   The Roof Flow app must be added to the channel or Slack won’t send message events. Exact steps:
   - In Slack, open the channel where you want to-dos to come from.
   - Click the **channel name** at the top.
   - Right‑click → **View channel details** (or use the channel name menu).
   - Open the **Integrations** tab.
   - Click **Add an app**.
   - Find **Roof Flow** and click **Add** next to it.
   
   If the app isn’t in the channel, you won’t see `[Slack events] Request received` in Vercel logs when you post.

3. **Slack Event Subscriptions**  
   In [api.slack.com/apps](https://api.slack.com/apps) → your app → **Event Subscriptions**:  
   - **Request URL** = `https://your-domain.com/api/slack/events` (must be verified).  
   - Under **Subscribe to bot events**, you have **message.channels**.

4. **Web app uses Firestore**  
   Set `NEXT_PUBLIC_USE_FIRESTORE=true` in Vercel (or your host). The To-Dos page reads from Firestore; if this is off, new to-dos from Slack won’t show.

5. **Firestore rules (if you see “Missing or insufficient permissions”)**  
   If the To-Dos page shows a yellow banner: *“Firestore is enabled, but the app couldn’t subscribe to live updates: Missing or insufficient permissions”*, the client is being blocked by Firestore security rules. With **Auth off**, the app doesn’t sign users in, so you must allow unauthenticated read (and write for the app) for your team path:
   - Open [Firebase Console](https://console.firebase.google.com) → your project → **Firestore Database** → **Rules**.
   - Add or replace with rules that allow your company/team path (use your real `COMPANY_ID` and `TEAM_ID` if different; these match `NEXT_PUBLIC_COMPANY_ID` and `NEXT_PUBLIC_TEAM_ID`):
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /companies/c_roofco/teams/t_leadership/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   - Click **Publish**. Reload the To-Dos page; Slack to-dos should then appear.  
   When you enable Firebase Auth later, tighten the rule (e.g. `allow read, write: if request.auth != null;`). A copy of these rules is in the repo as `firestore.rules`.

6. **Vercel / server logs**  
   In Vercel → Project → **Logs** or **Functions**, look for requests to `/api/slack/events` when you post in Slack. If you see 401, the Request URL or signing secret may be wrong. If you see 200 but no to-do, check for these messages:
   - `[Slack events] No Firestore` → set `FIREBASE_SERVICE_ACCOUNT_JSON` and ensure Firestore is enabled.
   - `[Slack events] No Slack token` → reconnect Slack in Integrations and pick a channel.
   - `[Slack events] No to-do channel selected` → in Integrations, choose a channel in the dropdown.
   - `[Slack events] Firestore write failed` → Firebase permissions or network issue.
   - `[Slack events] Created to-do from message` → the to-do was created; if it doesn’t show in the app, ensure `NEXT_PUBLIC_USE_FIRESTORE=true` and the To-Dos page reads from Firestore.

   For **Create channel** not appearing in Slack: check logs for `[Slack create channel]` — they show the Slack API response (`ok`, `error`, `channel`). If `error` is `missing_scope`, add `channels:manage` and reinstall the app.

## 7. Editing and deleting Slack to-dos

To-dos created from Slack are stored in Firestore like any other to-do. On the **To-Dos** page you can:
- **Edit** — click the pencil icon to change title, due date, owner, or notes.
- **Delete** — click the trash icon and confirm.
- **Mark done** — click the checkbox to move the item to Completed.

These actions are available for Slack entries as long as your role has “Edit to-dos” (e.g. Owner, or roles that include `edit_todos` in Settings → Roles).

## 8. Removing the test Slack channel

To remove the Slack integration or the test channel:

- In Slack: archive or delete the channel from the channel settings.
- In Roof Flow: Integrations → Slack → click **Disconnect** to remove the connection. You can connect again anytime.
