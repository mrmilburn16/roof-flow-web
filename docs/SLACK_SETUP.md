# Slack integration setup

To connect Roof Flow to Slack so that messages in a channel create to-dos, set up a Slack app and configure the app and environment.

## 1. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** > **From scratch**.
2. Name the app (e.g. "Roof Flow") and pick your workspace for development.
3. After creation, open **OAuth & Permissions** and add these **Bot Token Scopes**:
   - `channels:read` – list public channels
   - `channels:manage` – create public channels
   - `channels:history` – read messages in public channels (for Events API)
   - `chat:write` – post "Created to-do" in the thread
   - `users:read` – resolve user display name for "From Slack · @name"
   - `groups:read` – if you want to support private channels (optional)
4. Under **Event Subscriptions**, turn **Enable Events** On.
5. Set **Request URL** to your public Events API endpoint, e.g.:
   - Production: `https://your-domain.com/api/slack/events`
   - Local: use a tunnel (e.g. ngrok: `ngrok http 3000`) and set Request URL to `https://<your-ngrok-id>.ngrok.io/api/slack/events`
6. Under **Subscribe to bot events**, add:
   - `message.channels` – new messages in public channels the app is in
7. Save changes. Slack will send a request to your URL for verification; the route responds with the `challenge` value.
8. Under **OAuth & Permissions**, add **Redirect URL**:  
   `https://your-domain.com/api/slack/callback` (or your ngrok URL for local).
9. Install the app to your workspace (**Install to Workspace**) and copy the **Bot User OAuth Token** if you need it for testing. The Roof Flow OAuth flow will install the app when users click "Connect to Slack".

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

## 4. User flow

1. In Roof Flow, go to **Integrations**.
2. Click **Connect to Slack** and authorize the app in the chosen workspace.
3. After redirect, pick the channel where messages should create to-dos (or click **Create channel** to add one, e.g. `roof-flow-todos`).
4. In Slack, invite the Roof Flow app to that channel (open the channel → Integrations → Add apps).
5. Post a message in the channel (e.g. "Call Brian"). It appears as an open to-do in Roof Flow with "From Slack · @yourname" and a "View in Slack" link. The app replies in the thread: "Created to-do: Call Brian."

## 5. Removing the test Slack channel

To remove the Slack integration or the test channel:

- In Slack: archive or delete the channel from the channel settings.
- In Roof Flow: Integrations does not currently support "Disconnect Slack"; to clear the connection you would remove or clear the `config/slack` document in Firestore for your team (or add a "Disconnect" action later).
