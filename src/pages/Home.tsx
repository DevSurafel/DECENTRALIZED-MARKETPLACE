import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Wallet, 
  MessageSquare, 
  Award,
  Zap,
  Globe
} from "lucide-react";
import Navbar from "@/components/Navbar";

const Home = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 rounded-full glass-card border">
            <span className="text-sm">🚀 Decentralized • Secure • Transparent</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            The Future of Freelancing
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Hire talent, deliver projects, and get paid in crypto—all secured by smart contracts and escrow on the blockchain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-glow">
                Get Started
                <Zap className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="gap-2">
                Browse Jobs
                <Globe className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose DeFiLance?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Contract Escrow</h3>
              <p className="text-muted-foreground">
                Payments held securely in escrow until milestones are completed. No middleman, no disputes.
              </p>
            </Card>

            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Crypto Payments</h3>
              <p className="text-muted-foreground">
                Get paid in ETH, USDC, or other tokens. Fast, global, and low-fee transactions.
              </p>
            </Card>

            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Built-in Chat & Telegram</h3>
              <p className="text-muted-foreground">
                Communicate seamlessly on-platform or via Telegram bot notifications and replies.
              </p>
            </Card>

            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center mb-4">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verified Ratings</h3>
              <p className="text-muted-foreground">
                On-chain ratings and reviews ensure transparency and trust in every transaction.
              </p>
            </Card>

            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">IPFS Storage</h3>
              <p className="text-muted-foreground">
                Store portfolios, contracts, and deliverables on decentralized storage—no central server.
              </p>
            </Card>

            <Card className="p-6 glass-card shadow-card hover:shadow-glow transition-smooth">
              <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Dispute Resolution</h3>
              <p className="text-muted-foreground">
                Fair arbitration system to resolve conflicts and protect both parties.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="p-12 glass-card shadow-glow text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect your wallet and start hiring or freelancing on the decentralized marketplace today.
            </p>
            <Link to="/marketplace">
              <Button size="lg" className="gap-2">
                Launch App
                <Zap className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
