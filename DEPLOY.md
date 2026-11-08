# Deploying FluentStep for free

This guide puts FluentStep on the internet at no cost, using three free services:

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Stores your code | Free |
| **Turso** | Stores user data (accounts, progress, journals) | Free plan, no credit card needed (5 GB storage) |
| **Render** | Runs the app and gives you a public `https://….onrender.com` link | Free plan |

Grammar feedback uses the free LanguageTool service, so no AI key is needed. The Claude AI coach stays off until you add a key with credits.

**Before you start:** move the project out of this temporary session folder into a permanent folder on your computer. The session folder is deleted when the session is deleted.

**About the free plans (checked November 2026; plans can change):**
- Render's free app goes to sleep after 15 minutes with no visitors. The next visitor waits about 1 minute while it wakes up, and after that it is fast.
- Render gives 750 free hours a month, enough to run one app all month.
- Render's free plan wipes the app's local files on every restart. That is why user data is stored in Turso instead.
- Turso's free plan: 5 GB storage, 500 million row reads and 10 million row writes a month, no credit card required.

---

## Step 1: Put the code on GitHub

1. Create a free account at https://github.com.
2. Create a new repository named `fluentstep`. You can make it private.
3. Install Git from https://git-scm.com if you don't have it. Then, in the project folder, run these one at a time:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "FluentStep first version"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/YOUR-USERNAME/fluentstep.git
```

```bash
git push -u origin main
```

`.gitignore` already keeps `.env` (your secret keys), `data/` (your local database) and `node_modules/` out of GitHub. Never upload `.env`.

## Step 2: Create the free database on Turso

1. Sign up at https://turso.tech. Signing in with your GitHub account is easiest.
2. Create a new database, for example `fluentstep`. Pick the region closest to India if one is offered.
3. Copy the database **URL**. It looks like `libsql://fluentstep-yourname.turso.io`.
4. Create a database **auth token** and copy it. Keep it secret, like a password.

You don't need to create any tables. FluentStep creates them automatically the first time it starts.

## Step 3: Deploy on Render

1. Sign up at https://render.com with your GitHub account.
2. Click **New → Blueprint** and choose your `fluentstep` repository. Render reads the `render.yaml` file in this project. If Blueprint isn't available to you, choose **New → Web Service** instead and set:
   - Runtime: **Node**
   - Build command: `npm ci`
   - Start command: `npm start`
   - Instance type: **Free**
   - Health check path: `/healthz`
3. Fill in the environment variables when Render asks for them:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `TURSO_DATABASE_URL` | the URL from Step 2 |
| `TURSO_AUTH_TOKEN` | the token from Step 2 |
| `ADMIN_EMAIL` | the email you will sign up with (makes you the administrator) |
| `CONTACT_EMAIL` | an email users can contact you on (shown on the Terms page) |

4. Click **Deploy**. When it finishes, open your `https://fluentstep-….onrender.com` link.
5. **Sign up first with your `ADMIN_EMAIL`**, so you become the administrator before anyone else joins.

## Step 4: Check that it works

- Open `https://YOUR-APP.onrender.com/healthz`. It should show `{"ok":true}`.
- Create an account, take the level check, and try My Day and the Speaking Partner.
- Speech-to-text needs **HTTPS** and **Chrome or Edge**. Render provides HTTPS automatically.

## Updating the app later

Make your changes, then run these one at a time:

```bash
git add .
```

```bash
git commit -m "Describe your change"
```

```bash
git push
```

Render redeploys automatically after each push. User data in Turso is not affected.

## Turning on the AI coach later

When you have Anthropic API credits, add `ANTHROPIC_API_KEY` in Render's **Environment** settings. For a public app, also add `ANTHROPIC_MODEL=claude-haiku-5-5`, which is the low-cost model.

**Important:** every user's AI feedback is charged to your key. Before you turn it on for many users, add a daily AI limit per user. Ask Claude to build this when you get there.

## Known limits on the free setup

- Waking up from sleep takes about 1 minute.
- There is no "forgot password" email yet. Sending email needs an email service, which is a future step.
- LanguageTool's free public service is meant for normal personal use. If FluentStep grows to many users, run your own LanguageTool server (it is free, open-source software) or buy their API plan.
