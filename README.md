# Atlas Estate Advisory

Landing page premium avec backend Node pour recevoir, stocker et consulter les demandes de clients.

## URLs

```text
Site public: https://atlas-estate-advisory.onrender.com
Admin: https://atlas-estate-advisory.onrender.com/admin?token=YOUR_ADMIN_TOKEN
Google Sheets: https://docs.google.com/spreadsheets/d/1DoQMINip1IKCb09yNZUNcJd3i6bPJHWnxOlyf4JWgi4
```

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

Required environment variables in Render:

```text
ADMIN_TOKEN=choose-a-private-token
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

## Google Sheets

The lead spreadsheet is:

```text
https://docs.google.com/spreadsheets/d/1DoQMINip1IKCb09yNZUNcJd3i6bPJHWnxOlyf4JWgi4
```

Sheet tab:

```text
Leads
```

Columns:

```text
Fecha y hora
Nom complet
Email
Telephone / WhatsApp
Pays de residence
Pays cible
Budget estime
Objectif
Message libre
```

## Configure Google Apps Script

1. Open the Google Sheet.
2. Go to Extensions > Apps Script.
3. Paste the content of `google-apps-script.js`.
4. Click Deploy > New deployment.
5. Type: Web app.
6. Execute as: Me.
7. Who has access: Anyone.
8. Authorize the script. Google may show "Google hasn't verified this app" because this is a private script in your own account; choose Advanced only if you trust this project.
9. Copy the Web App URL ending in `/exec`.
10. In Render, set:

```text
GOOGLE_SHEETS_WEBHOOK_URL=your-web-app-url
```

## Admin

The admin panel is protected by `ADMIN_TOKEN`.

Open it with:

```text
https://atlas-estate-advisory.onrender.com/admin?token=YOUR_ADMIN_TOKEN
```

The panel reads from:

```text
GET /api/leads?token=YOUR_ADMIN_TOKEN
```

## Fallback

Each lead is always saved locally first in:

```text
data/leads.jsonl
```

If Google Sheets is unavailable, the backend still returns success and marks the lead with:

```text
sheetsStatus=failed
```

If the Google Sheets webhook is not configured, the lead is marked with:

```text
sheetsStatus=not_configured
```
