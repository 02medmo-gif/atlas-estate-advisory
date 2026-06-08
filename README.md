# Atlas Estate Advisory

Landing page premium avec backend Node pour recevoir les demandes de clients.

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
Health Check Path: /healthz
Instance Type: Free
```

The `render.yaml` file already contains this configuration.

## Leads

The form posts to:

```text
POST /api/lead
```

By default, leads are saved to:

```text
data/leads.jsonl
```

On free hosting, local storage can be temporary. For reliable lead delivery, set this environment variable in Render:

```text
LEAD_WEBHOOK_URL=https://your-webhook-url
```
