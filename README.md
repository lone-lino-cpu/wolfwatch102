# WolfWatch

## Run locally

```sh
npm install
npm run dev
```

## Deploy on Render

Create a Node.js web service with these commands:

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`

The server serves the production build from `dist`, listens on `0.0.0.0`, and
uses Render's `PORT` environment variable (falling back to port `3000` locally).
The `/health` endpoint returns `OK`. The admin dashboard is available at
`/admin-lino.html` and requires a valid login; `/admin` is an alias. The
`/citizen` route and the built `citizen-4.html` page serve the citizen app.

Set these environment variables on Render:

- `ADMIN_USERNAME`: the admin account name.
- `ADMIN_PASSWORD_HASH`: a bcrypt hash of the admin password. In PowerShell,
  generate one without putting the plaintext in command history:
  ```powershell
  $secret = Read-Host "Admin password" -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    $env:ADMIN_PASSWORD_TO_HASH = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash(process.env.ADMIN_PASSWORD_TO_HASH, 12))"
  } finally {
    Remove-Item Env:ADMIN_PASSWORD_TO_HASH -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  ```
- `JWT_SECRET`: a random secret of at least 32 bytes; generate one with
  `node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"`.
- `PORT` is supplied automatically by Render.

The login is rate limited. Admin sessions use an HTTP-only, secure, strict
same-site cookie and expire after eight hours. Protected admin API endpoints
belong under `/api/admin`.
