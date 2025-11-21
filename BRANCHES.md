# Branch Strategy

## Production Branches

### `main` (Production)
- **Status**: Production-ready, Vercel deployment
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Use Case**: Production deployment, multi-user, cloud storage
- **Deploy**: Auto-deploy to Vercel on push

## Alternative Branches (DO NOT MERGE TO MAIN)

### `local-storage-only`
- **Status**: Community/Alternative branch
- **Database**: Browser localStorage (NO Supabase)
- **Auth**: None required
- **Use Case**: Personal use, easy sharing, Replicate-only users
- **Deploy**: Local development only

#### Why Separate?
This branch uses a completely different storage architecture (localStorage vs Supabase) and is designed for users who:
- Only have Replicate API token
- Don't want database setup
- Want simple local-only deployment
- Need to share with non-technical friends

#### Important Notes
⚠️ **NEVER merge `local-storage-only` into `main`**
⚠️ This branch should remain independent
⚠️ Features can be ported manually if compatible
⚠️ Not intended for production deployment

## Development Workflow

### Working on Production Features
```bash
git checkout main
# Make changes
git add .
git commit -m "feat: your feature"
git push origin main
```

### Working on Local-Storage Version
```bash
git checkout local-storage-only
# Make changes
git add .
git commit -m "feat: your feature"
git push origin local-storage-only
```

### Porting Features Between Branches
If you add a UI feature or improvement:
1. Implement on `main` first
2. Manually cherry-pick compatible changes to `local-storage-only`
3. Test both branches independently

**DO NOT** use `git merge` between these branches!

## Sharing the Local Storage Version

When sharing with friends who only have Replicate:
```bash
git clone -b local-storage-only https://github.com/your-repo/directors-palette-v2.git
cd directors-palette-v2
npm install
cp .env.local.example .env.local
# Edit .env.local with Replicate token
npm run dev
```
