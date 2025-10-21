# DeFiLance Deployment Guide

Complete guide for deploying your DeFiLance application to production.

## Quick Summary

**Best Options:**
1. **Vercel** (Recommended) - Free tier, fastest setup, automatic deployments
2. **Netlify** - Free tier, similar to Vercel, great for static sites
3. **Render** - Free tier (with limitations), supports Node.js backend

---

## Option 1: Deploy to Vercel (Recommended)

### Why Vercel?
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments from GitHub
- ✅ Easy environment variable management
- ✅ Perfect for React + Vite projects

### Step-by-Step Deployment

#### 1. Prepare Your Repository
```bash
# Make sure your code is pushed to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Sign Up and Deploy
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" and connect your GitHub account
3. Click "New Project"
4. Import your DeFiLance repository
5. Vercel will auto-detect it's a Vite project

#### 3. Configure Build Settings
Vercel should auto-detect these, but verify:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### 4. Add Environment Variables
In Vercel dashboard, add these environment variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

#### 5. Deploy
- Click "Deploy"
- Wait 2-3 minutes for build
- Your app will be live at: `your-project.vercel.app`

#### 6. Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Option 2: Deploy to Netlify

### Step-by-Step

#### 1. Sign Up
- Go to [netlify.com](https://netlify.com)
- Sign up with GitHub

#### 2. New Site from Git
1. Click "Add new site" → "Import an existing project"
2. Connect to GitHub and select your repository
3. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

#### 3. Environment Variables
1. Go to Site settings → Environment variables
2. Add the same variables as Vercel above

#### 4. Deploy
- Click "Deploy site"
- Your app will be live at: `your-project.netlify.app`

---

## Option 3: Deploy to Render

### Step-by-Step

#### 1. Create Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

#### 2. New Static Site
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name:** defilance-app
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

#### 3. Environment Variables
Add in Environment section:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

#### 4. Deploy
- Click "Create Static Site"
- Wait for deployment (5-10 minutes)

**Note:** Render's free tier has some limitations (spins down after inactivity)

---

## Option 4: Deploy to GitHub Pages (Free)

#### 1. Install gh-pages
```bash
npm install --save-dev gh-pages
```

#### 2. Update package.json
Add to `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/defilance",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### 3. Update vite.config.ts
Add base path:
```typescript
export default defineConfig({
  base: '/defilance/',
  // ... rest of config
})
```

#### 4. Deploy
```bash
npm run deploy
```

Your app will be live at: `https://yourusername.github.io/defilance`

---

## Option 5: Deploy to AWS (S3 + CloudFront)

### For Advanced Users

#### 1. Build Your App
```bash
npm run build
```

#### 2. Create S3 Bucket
```bash
aws s3 mb s3://defilance-app
aws s3 sync dist/ s3://defilance-app
```

#### 3. Enable Static Website Hosting
```bash
aws s3 website s3://defilance-app --index-document index.html
```

#### 4. Set Up CloudFront
1. Create CloudFront distribution
2. Point to S3 bucket
3. Configure SSL certificate

---

## Important: After Deployment

### 1. Update Smart Contract Network
If deploying to production, update the network in `src/hooks/useEscrow.ts`:

```typescript
// For Polygon Mainnet
const USDC_CONTRACT_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const ESCROW_CONTRACT_ADDRESS = 'YOUR_MAINNET_CONTRACT_ADDRESS';

const NETWORK_CONFIG = {
  chainId: 137n,
  chainIdHex: '0x89',
  networkName: 'Polygon Mainnet',
  rpcUrl: 'https://polygon-rpc.com',
  blockExplorer: 'https://polygonscan.com',
  // ...
};
```

### 2. Configure CORS for Supabase
In your Supabase dashboard:
1. Go to Settings → API
2. Add your deployment URL to allowed origins:
   - `https://your-app.vercel.app`
   - `https://your-custom-domain.com`

### 3. Set Up Custom Domain (Recommended)
- Makes your app look professional
- Improves trust and credibility
- Better for SEO

### 4. Enable Analytics
Consider adding:
- Google Analytics
- Vercel Analytics
- Posthog

---

## Troubleshooting

### Build Fails
**Error: Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working
- Ensure variables start with `VITE_`
- Restart development server after adding
- Check they're added in deployment platform

### 404 on Page Refresh
Add a redirect rule for SPA routing:

**Vercel:** Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify:** Create `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Render:** Already configured automatically for SPAs

### MetaMask Connection Issues
- Ensure your deployed URL is using HTTPS
- Check browser console for errors
- Verify smart contract addresses are correct

---

## Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| **Vercel** | ✅ Generous | From $20/mo | Most projects |
| **Netlify** | ✅ 100GB/mo | From $19/mo | Static sites |
| **Render** | ✅ Limited | From $7/mo | Full-stack apps |
| **GitHub Pages** | ✅ Unlimited | Free | Open source |
| **AWS** | ❌ | Variable | Enterprise |

---

## Recommended Workflow

### Development
```bash
git checkout -b feature/new-feature
# Make changes
git commit -m "Add new feature"
git push
```

### Staging
```bash
# Deploy to staging branch
git checkout staging
git merge feature/new-feature
git push
```

### Production
```bash
# Deploy to production
git checkout main
git merge staging
git push
```

With Vercel/Netlify, each push to `main` auto-deploys to production!

---

## Security Checklist

Before deploying to production:

- [ ] Update smart contract to mainnet
- [ ] Remove all console.log statements
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure proper CORS settings
- [ ] Audit smart contracts
- [ ] Test with small amounts first
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Enable 2FA on deployment platform
- [ ] Keep environment variables secure

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Render Docs:** https://render.com/docs
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html

---

## Quick Start Commands

```bash
# Clone from GitHub
git clone https://github.com/yourusername/defilance.git
cd defilance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel

# Deploy to Netlify
netlify deploy --prod
```

---

**🎉 Congratulations!** Your DeFiLance app is now live!

**Next Steps:**
1. Test all features thoroughly
2. Share with users
3. Monitor performance
4. Gather feedback
5. Iterate and improve

**Note:** Start with testnet (Polygon Amoy) until you're confident everything works perfectly, then switch to mainnet for real transactions.
