# RestaurantOS

Multi-tenant restaurant operations SaaS built with Next.js, TypeScript, Tailwind CSS and Supabase.

## Local setup
1. Use Node.js 20.9+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in Supabase project values.
4. Run `npm run dev`.

## Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Deployment
Connect this repository to Vercel and configure the same environment variables for Preview and Production. Database migrations in `supabase/migrations` must be applied to the linked Supabase project.

## Security
Never commit service-role keys, database passwords, or payment secrets. All tenant data access must be enforced by PostgreSQL RLS and server-side authorization.
