# Deploying FluentStep for free on Netlify

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Stores your code | Free |
| **Turso** | Stores user data (accounts, progress, journals) | Free plan, no credit card (5 GB storage) |
| **Netlify** | Runs the app and gives you a public `https://….netlify.app` link | Free plan: 300 credits a month |

Grammar feedback uses the free LanguageTool service, so no AI key is needed. The Claude AI coach stays off until you add a key with credits.

**About Netlify's free plan (checked November 2026; plans can change):**
- You get 300 credits a month. A production deploy costs 15 credits, so 20 deploys would use the whole month. Push changes in batches, not one at a time.
- Bandwidth costs 20 credits per GB, compute 10 credits per GB-hour, and 10,000 web requests cost 2 credits.
- If credits run out, Netlify **pauses the whole site** until the next month. Free plans cannot buy more credits. Check your usage in the Netlify dashboard.
- Netlify doesn't say clearly whether the free plan can connect a private GitHub repository. If yours doesn't appear, see "If your private repository doesn't appear" below.

---

## Step 1: Code on GitHub

Done: https://github.com/aadhilbanu/fluentstep

## Step 2: Create the free database on Turso

1. Sign up at https://turso.tech with your GitHub account.
2. Create a database named `fluentstep`. Pick the region closest to India if one is offered.
3. Copy the database **URL** (`libsql://fluentstep-….turso.io`).
4. Create a database **auth token** and copy it. Keep it secret, like a password.

FluentStep creates its tables automatically the first time it runs.

## Step 3: Deploy on Netlify

1. Sign up at https://www.netlify.com with your GitHub account.
2. Choose **Add new project → Import an existing project → GitHub**, then pick `fluentstep`. Netlify reads the settings from `netlify.toml`.
3. Add these environment variables under **Project configuration → Environment variables**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `TURSO_DATABASE_URL` | the URL from Step 2 |
| `TURSO_AUTH_TOKEN` | the token from Step 2 |
| `ADMIN_EMAIL` | the email you will sign up with (makes you the administrator) |
| `CONTACT_EMAIL` | an email users can contact you on (shown publicly on the Terms page) |

4. Deploy, then open your `https://….netlify.app` link.
5. **Sign up first with your `ADMIN_EMAIL`**, so you become the administrator.

If you added the variables after the first deploy, run **Deploys → Trigger deploy** once.

### If your private repository doesn't appear

Make the repository public under GitHub **Settings → General → Danger Zone → Change visibility**, then import it. The code contains no keys or passwords: `.env` and your local database are never uploaded.

## Step 4: Check that it works

- Open `https://YOUR-SITE.netlify.app/healthz`. It should show `{"ok":true}`.
- Create an account, take the level check, and try My Day and the Speaking Partner.
- Speech-to-text needs **HTTPS** and **Chrome or Edge**. Netlify provides HTTPS automatically.

## Updating the app later

Run these one at a time. Netlify redeploys after each push (15 credits).

```bash
git add .
```

```bash
git commit -m "Describe your change"
```

```bash
git push
```

## Turning on the AI coach later

When you have Anthropic API credits, add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL=claude-haiku-5-5` in Netlify's environment variables.

**Important:** every user's AI feedback is charged to your key. Add a daily AI limit per user before you turn it on for many users.

## Known limits on the free setup

- Login attempt limits are kept in memory, so they reset when a function restarts.
- There is no "forgot password" email yet.
- LanguageTool's free public service is meant for normal use. If FluentStep grows, run your own LanguageTool server or buy their API plan.
