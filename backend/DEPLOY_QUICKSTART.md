# Backend Quickstart

## Fast test mode (public URL in 1 command)

From project root:

```bash
npm run backend:tunnel
```

This command:

1. Starts the monetization backend on `localhost:8787`.
2. Ensures Apple Root CA certs exist in `backend/certs/`.
3. Creates `backend/.env` with generated secrets if missing.
4. Opens a temporary HTTPS public URL via `localhost.run`.

It prints:

- Health URL: `https://.../health`
- Apple webhook URL: `https://.../v1/webhooks/apple?secret=...`
- Google RTDN webhook URL: `https://.../v1/webhooks/google/rtdn`

Keep that terminal open while testing.

## Permanent deploy (Render, recommended)

Prerequisite: push current `main` branch to GitHub (`git push origin main`).

1. Open Render dashboard and click `New` -> `Blueprint`.
2. Select repository `sasharei/almost-app`.
3. Render will detect [render.yaml](/Users/sasarei/Downloads/almost_clean/render.yaml).
4. Create service.
5. In Render service `Environment`, fill real provider credentials:
   - `APPLE_ISSUER_ID`
   - `APPLE_KEY_ID`
   - `APPLE_PRIVATE_KEY` (full `.p8` content, including header/footer)
   - `APPLE_APPLE_ID` (numeric app id from App Store Connect)
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (when Android validation is enabled)
6. In Render service `Environment`, ensure:
   - `APPLE_VALIDATION_ENABLED=1` only after Apple credentials are filled (otherwise keep `0`)
   - `GOOGLE_VALIDATION_ENABLED=1` only after Google credentials are filled (otherwise keep `0`)
7. Deploy.
8. Copy backend URL from Render, for example:
   - `https://almost-monetization-backend.onrender.com`
9. Verify readiness:
   - Open `https://<backend-domain>/health`
   - Ensure `readiness.validation.apple.ready` and `readiness.validation.google.ready` are `true`
   - If `false`, check `readiness.validation.<provider>.missing` for exact missing env vars

## EAS env vars to set

- `EXPO_PUBLIC_MONETIZATION_BACKEND_URL` = your backend base URL
- `EXPO_PUBLIC_MONETIZATION_SHARED_SECRET` = value of `APP_SHARED_SECRET` from backend environment

Commands:

```bash
cd /Users/sasarei/Downloads/almost_clean
eas secret:create --scope project --name EXPO_PUBLIC_MONETIZATION_BACKEND_URL --type string --value "https://<backend-domain>" --non-interactive --force
eas secret:create --scope project --name EXPO_PUBLIC_MONETIZATION_SHARED_SECRET --type string --value "<APP_SHARED_SECRET>" --non-interactive --force
```

## App Store Server Notifications URL

Set in App Store Connect:

`https://<backend-domain>/v1/webhooks/apple?secret=<APPLE_WEBHOOK_SECRET>`
