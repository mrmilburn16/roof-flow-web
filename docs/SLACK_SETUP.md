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

The `/api/slack/events` route writes new to-dos to Firestore. It uses the Firebase Admin SDK and needs server credentials:

- **Option A:** Set `GOOGLE_APPLICATION_CREDENTIALS` to the path to a service account key JSON file (e.g. from Firebase Console → Project settings → Service accounts).
- **Option B:** On Vercel (or similar), set the env vars that your host uses for Google default credentials.

Ensure the service account can read/write the Firestore collections used by the app (`companies/{companyId}/teams/{teamId}/todos` and `.../config/slack`).

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

## 6. Removing the test Slack channel

To remove the Slack integration or the test channel:

- In Slack: archive or delete the channel from the channel settings.
- In Roof Flow: Integrations does not currently support "Disconnect Slack"; to clear the connection you would remove or clear the `config/slack` document in Firestore for your team (or add a "Disconnect" action later).
