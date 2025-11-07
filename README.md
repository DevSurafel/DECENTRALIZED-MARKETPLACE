# DeFiLance - Decentralized Freelance Marketplace

![DeFiLance Banner](https://img.shields.io/badge/DeFiLance-Blockchain%20Marketplace-blue?style=for-the-badge&logo=ethereum)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy%20Testnet-8247E5?style=flat&logo=polygon)](https://polygon.technology/)

A revolutionary blockchain-powered freelance marketplace that combines the security of smart contracts with the convenience of traditional platforms. DeFiLance offers transparent escrow management, instant cryptocurrency payments, and decentralized dispute resolution.

## 🌟 Key Features

### 💼 Core Marketplace
- **Smart Contract Escrow**: Automated payment management using Polygon blockchain
- **Job Posting & Bidding**: Create jobs, receive competitive bids from freelancers
- **Real-Time Chat**: Integrated messaging system for seamless communication
- **Milestone Tracking**: Monitor project progress with deadline enforcement
- **Reputation System**: On-chain reviews and ratings for trust building

### 🛡️ Security Features
- **Blockchain Escrow**: Funds locked in smart contracts until work completion
- **Dispute Resolution**: Decentralized arbitration with evidence submission
- **Revision Management**: Built-in workflow for work revisions
- **Stake Requirements**: Optional deposits to prevent fraud
- **Row Level Security**: Database-level access control

### 🌐 Additional Features
- **Social Media Marketplace**: Buy and sell verified social media accounts
- **Telegram Integration**: Instant notifications for all platform activities
- **Multi-Token Support**: USDC, DAI, and other ERC-20 stablecoins
- **IPFS Storage**: Decentralized storage for work submissions
- **Wallet Integration**: MetaMask and WalletConnect support

## 🚀 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast build tooling
- **Tailwind CSS** for modern, responsive design
- **shadcn/ui** for beautiful, accessible components
- **TanStack Query** for efficient data fetching and caching

### Blockchain
- **Solidity 0.8.20** for smart contract development
- **Hardhat** for Ethereum development environment
- **OpenZeppelin** for secure, audited contract libraries
- **Polygon Network** (Amoy Testnet) for low-cost transactions
- **Ethers.js & WalletConnect** for Web3 integration

### Backend
- **Lovable Cloud** (Supabase) for backend infrastructure
- **PostgreSQL** with Row Level Security policies
- **Edge Functions** for serverless backend logic
- **Real-time Subscriptions** for live data updates
- **IPFS** for decentralized file storage

### External Services
- **Telegram Bot API** for notifications
- **MongoDB** for additional data storage
- **Pinata/Web3.Storage** for IPFS pinning

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **bun** package manager
- **MetaMask** browser extension - [Install](https://metamask.io/)
- **Git** for version control

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/defilance.git
cd defilance
```

### 2. Install Dependencies
```bash
npm install
# or
bun install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Lovable Cloud (Supabase)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# Smart Contract
VITE_ESCROW_CONTRACT_ADDRESS=0x0CC3Fb461bC523d51403d1DB97CB09b49510ceB9
VITE_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token

# MongoDB (Optional)
MONGODB_URI=your_mongodb_connection_string

# IPFS (Optional)
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
```

### 4. Start Development Server
```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

## 🔐 Smart Contract Deployment

### Deploy Escrow Contract

1. **Install Hardhat Dependencies**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. **Configure Hardhat** (`hardhat.config.cjs`)
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80002
    }
  }
};
```

3. **Deploy Contract**
```bash
npx hardhat run scripts/deploy.cjs --network polygonAmoy
```

4. **Verify Contract** (Optional)
```bash
npx hardhat verify --network polygonAmoy DEPLOYED_CONTRACT_ADDRESS "PLATFORM_WALLET_ADDRESS"
```

## 📱 Usage Guide

### For Clients

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Post a Job**: Navigate to Dashboard → "Post Job"
3. **Fund Escrow**: Deposit payment + 2.5% platform fee
4. **Review Bids**: Evaluate freelancer proposals
5. **Select Freelancer**: Choose the best bid
6. **Review Work**: Approve or request revisions
7. **Release Payment**: Funds automatically released on approval

### For Freelancers

1. **Connect Wallet**: Set up your crypto wallet
2. **Browse Jobs**: Explore available projects
3. **Submit Bid**: Propose your rate and timeline
4. **Work on Project**: Complete the job requirements
5. **Submit Work**: Upload deliverables to IPFS
6. **Receive Payment**: Get paid instantly upon approval

### For Arbitrators

1. **Get Assigned**: Platform admins assign arbitrator role
2. **Review Disputes**: Access disputed jobs
3. **Evaluate Evidence**: Review submissions from both parties
4. **Resolve Fairly**: Decide payment distribution (0-100%)

## 🏗️ Project Structure

```
defilance/
├── contracts/              # Smart contracts
│   ├── Escrow.sol         # Main escrow contract
│   └── PaymentGateway.sol # Payment processing
├── scripts/               # Deployment scripts
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── JobPostDialog.tsx
│   │   ├── BidsPanel.tsx
│   │   └── WalletConnectFunding.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useEscrow.ts
│   │   ├── useJobs.ts
│   │   └── useBids.ts
│   ├── pages/            # Page components
│   │   ├── Home.tsx
│   │   ├── Marketplace.tsx
│   │   ├── Escrow.tsx
│   │   └── Dashboard.tsx
│   ├── integrations/     # External integrations
│   │   └── supabase/
│   └── utils/            # Utility functions
├── supabase/
│   ├── functions/        # Edge functions
│   │   ├── ipfs-upload/
│   │   ├── telegram-webhook/
│   │   └── release-payment/
│   └── migrations/       # Database migrations
└── artifacts/            # Compiled contracts
```

## 🧪 Testing

### Run Frontend Tests
```bash
npm test
```

### Run Smart Contract Tests
```bash
npx hardhat test
```

### Run E2E Tests
```bash
npm run test:e2e
```

## 📊 Database Schema

### Core Tables

- **profiles**: User profiles and wallet addresses
- **jobs**: Job listings with escrow details
- **bids**: Freelancer proposals
- **messages**: Chat conversations
- **disputes**: Dispute records with evidence
- **reviews**: On-chain ratings and reviews
- **social_media_listings**: Social media accounts for sale
- **transactions**: Payment history

For detailed schema, see [Database Documentation](./docs/DATABASE.md)

## 🔒 Security

### Smart Contract Security
- ✅ ReentrancyGuard protection
- ✅ OpenZeppelin audited libraries
- ✅ Access control modifiers
- ✅ Deadline enforcement
- ✅ Stake slashing for bad actors

### Backend Security
- ✅ Row Level Security (RLS) policies
- ✅ JWT authentication
- ✅ Input validation and sanitization
- ✅ Rate limiting on API endpoints
- ✅ Encrypted secret management

### Audit Status
- Smart contracts: **Pending professional audit**
- Backend: **Internal security review completed**

## 🚢 Deployment

### Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Backend Deployment
Backend (Lovable Cloud) deploys automatically on push to main branch.

### Smart Contract Deployment
See [Smart Contract Deployment Guide](#-smart-contract-deployment)

## 📚 Documentation

- [Smart Contract Documentation](./contracts/README.md)
- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [MongoDB Setup](./MONGODB_SETUP.md)
- [Telegram Integration](./TELEGRAM_AUTO_TRANSFER_UPDATED.md)

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌐 Links

- **Live Demo**: [https://defilance.lovable.app](https://defilance.lovable.app)
- **Documentation**: [https://docs.defilance.io](https://docs.defilance.io)
- **Smart Contract**: [View on PolygonScan](https://amoy.polygonscan.com/address/0x0CC3Fb461bC523d51403d1DB97CB09b49510ceB9)
- **Twitter**: [@DeFiLance](https://twitter.com/defilance)
- **Discord**: [Join Community](https://discord.gg/defilance)

## 👥 Team

- **Project Lead**: Your Name
- **Blockchain Developer**: Developer Name
- **Frontend Developer**: Developer Name
- **UI/UX Designer**: Designer Name

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [Polygon](https://polygon.technology/) for scalable blockchain infrastructure
- [Lovable](https://lovable.dev/) for rapid fullstack development
- [shadcn/ui](https://ui.shadcn.com/) for beautiful component library

## 📧 Contact

For questions or support, reach out to:
- Email: support@defilance.io
- Telegram: [@DeFiLanceSupport](https://t.me/defilancesupport)
- GitHub Issues: [Create Issue](https://github.com/yourusername/defilance/issues)

---

**Built with ❤️ using Blockchain Technology**
