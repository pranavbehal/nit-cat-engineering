## Running This Project Locally

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Please note that you will have to add in a .env file with the following code (which can be found when connecting a Supabase Database with this project on Vercel)

```
POSTGRES_URL=""
POSTGRES_PRISMA_URL=""
SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
POSTGRES_URL_NON_POOLING=""
SUPABASE_JWT_SECRET=""
POSTGRES_USER=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
POSTGRES_PASSWORD=""
POSTGRES_DATABASE=""
SUPABASE_SERVICE_ROLE_KEY=""
POSTGRES_HOST=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```
