# Atlas Estate Advisory

Landing page premium avec backend Node pour recevoir et consulter les demandes de clients.

## Local

```bash
npm start
```

Open:

```text
http://localhost:4175
```

## Render

Render service type:

```text
Web Service
```

Settings:

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /status
Instance Type: Free
```

The `render.yaml` file already contains this configuration.

## Leads

The form posts to:

```text
POST /api/consultation
```

By default, leads are saved to:

```text
data/leads.jsonl
```

On free hosting, local storage can be temporary. For reliable lead delivery, set this environment variable in Render:

```text
LEAD_WEBHOOK_URL=https://your-webhook-url
```

## Admin

To review submissions in the browser:

```text
/admin
```

The panel reads from:

```text
GET /api/leads
```

If you set an admin token in Render, pass it as `?token=...` to both URLs and define:

```text
ADMIN_TOKEN=your-secret-token
```
