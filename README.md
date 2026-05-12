# Moksh Promotion CRM

Next.js + Prisma + PostgreSQL CRM for leads, inventory, discount approvals, and operations workflows.

## Local setup

1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env
```

3. Set your database + auth/email env values in `.env`.

4. Sync schema to database:
```bash
npm run db:push
```

5. Run app:
```bash
npm run dev
```

## Production deploy (GitHub -> Vercel -> Domain)

1. Push code to your GitHub repo.

2. In Vercel, import the repo as a new project.

3. Add all required environment variables from `.env.example` in Vercel Project Settings.

4. Ensure build command is:
```bash
npm run build
```

5. Ensure install command is:
```bash
npm install
```

6. After first deploy, run schema sync once against your production database:
```bash
npm run db:push
```

7. In Vercel Domains, add your custom domain and update DNS records.

8. Update these envs to your live domain:
- `NEXTAUTH_URL=https://your-domain.com`
- `NEXT_PUBLIC_APP_URL=https://your-domain.com`

9. If vendor proof media is on Cloudflare R2, add:
- `VENDOR_MEDIA_STORAGE=s3` (or `r2`)
- `VENDOR_MEDIA_S3_BUCKET=<bucket-name>`
- `VENDOR_MEDIA_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`
- `VENDOR_MEDIA_S3_ACCESS_KEY_ID=<r2-access-key-id>`
- `VENDOR_MEDIA_S3_SECRET_ACCESS_KEY=<r2-secret-access-key>`
- `VENDOR_MEDIA_S3_FORCE_PATH_STYLE=true`
- `VENDOR_MEDIA_PUBLIC_BASE_URL=<public-r2-domain>` (required for image/video rendering in browser; use your custom domain or `https://pub-xxxx.r2.dev`)

## Notes

- Scripts are now cross-platform (Windows/Linux/macOS) and Vercel-safe.
- `.env` is gitignored. Never commit real secrets.
- This project currently uses `prisma db push` for schema sync.
