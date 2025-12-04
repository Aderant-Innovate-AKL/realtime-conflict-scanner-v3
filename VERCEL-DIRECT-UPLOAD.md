# Vercel Direct Upload Guide (No Git Required)

This guide shows you how to deploy directly from your local codebase to Vercel without connecting a Git repository.

## Prerequisites

1. Install Vercel CLI globally:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Deployment Steps

### Step 1: Navigate to Your Project

```bash
cd sample-app
```

### Step 2: Deploy Directly

```bash
vercel
```

On first deployment, you'll be asked:
- **Set up and deploy?** → Press `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → Press `N` (create new)
- **Project name?** → Enter your desired name (e.g., `conflict-scanner`)
- **In which directory is your code located?** → Press Enter (use current directory)
- **Want to override settings?** → Press `N` (use auto-detected settings)

### Step 3: Deploy to Production

After the initial deployment, deploy to production:

```bash
vercel --prod
```

## Important Notes

### What Gets Uploaded

Vercel CLI will upload:
- All source code files
- Dependencies listed in `package.json`
- Configuration files (`next.config.ts`, etc.)

Vercel CLI will **NOT** upload (automatically excluded):
- `node_modules/` folder
- `.next/` build folder
- `.git/` folder
- Files listed in `.vercelignore`

### Create .vercelignore (Optional)

To exclude specific files from upload, create `.vercelignore`:

```
node_modules
.next
.git
.env.local
*.log
.DS_Store
test-parties.txt
```

## Advantages of Direct Upload

✅ **No Git Required**: Deploy without pushing to a repository  
✅ **Quick Testing**: Fast deployment for prototypes  
✅ **Private Code**: Keep code local if not ready to share  
✅ **Simple Workflow**: Just run `vercel --prod` to update

## Disadvantages

❌ **No Auto-Deployment**: Must manually run `vercel --prod` for each update  
❌ **No Version History**: Vercel doesn't track your code changes  
❌ **No Rollback**: Cannot easily revert to previous versions  
❌ **Team Collaboration**: Harder to collaborate with teammates

## Redeploy After Changes

Every time you make changes:

```bash
cd sample-app
vercel --prod
```

Vercel will:
1. Detect file changes
2. Upload modified files
3. Build your application
4. Deploy to production

## Environment Variables

Set environment variables via CLI:

```bash
# Add a variable
vercel env add

# You'll be prompted for:
# - Variable name (e.g., NEWS_API_KEY)
# - Value
# - Which environments (Production/Preview/Development)

# Pull environment variables to local
vercel env pull .env.local
```

Or set them in the Vercel dashboard:
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add your variables
4. Redeploy with `vercel --prod`

## View Your Deployment

After deployment completes, you'll see:

```
✅  Production: https://your-project.vercel.app [copied to clipboard]
📝  Inspect: https://vercel.com/your-account/your-project/...
```

Visit the production URL to see your deployed app.

## Useful Commands

```bash
# Deploy to development (preview)
vercel

# Deploy to production
vercel --prod

# List all deployments
vercel ls

# View project info
vercel inspect

# Open project in browser
vercel open

# Remove deployment
vercel remove [deployment-url]

# View logs
vercel logs [deployment-url]
```

## Troubleshooting

### Issue: "No framework detected"

**Solution**: Make sure you're in the `sample-app` directory where `package.json` exists.

### Issue: "Build failed"

**Solution**: Test build locally first:
```bash
npm run build
```
Fix any errors before deploying.

### Issue: "Deployment too large"

**Solution**: Create `.vercelignore` to exclude unnecessary files.

### Issue: "Environment variables not working"

**Solution**: 
1. Add variables using `vercel env add`
2. Redeploy with `vercel --prod`

## Comparison: Direct Upload vs Git Integration

| Feature | Direct Upload (CLI) | Git Integration |
|---------|-------------------|-----------------|
| Setup Speed | ⚡ Fast | 🐌 Slower (need repo setup) |
| Deployment | 🔄 Manual | ✨ Automatic on push |
| Version Control | ❌ None | ✅ Full history |
| Rollback | ❌ Difficult | ✅ Easy |
| Team Collaboration | 👤 Individual | 👥 Team-friendly |
| CI/CD | ❌ No | ✅ Yes |
| Best For | Prototypes, personal projects | Production apps, teams |

## Next Steps

- **Add custom domain**: Vercel dashboard → Your project → Settings → Domains
- **Monitor performance**: Vercel dashboard → Your project → Analytics
- **View logs**: Vercel dashboard → Your project → Deployments → [specific deployment] → Logs

## Summary

Direct upload workflow:
```bash
# One-time setup
npm install -g vercel
vercel login

# Deploy workflow (repeat as needed)
cd sample-app
vercel --prod
```

That's it! No Git required. 🚀


