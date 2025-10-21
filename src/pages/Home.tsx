import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Shield, 
  Wallet, 
  MessageSquare, 
  Award,
  Zap,
  Globe,
  TrendingUp,
  Users,
  Sparkles,
  Briefcase
} from "lucide-react";
import Navbar from "@/components/Navbar";

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: "Smart Contract Escrow",
      description: "Payments held securely in escrow until milestones are completed. No middleman, no disputes.",
      gradient: "gradient-primary"
    },
    {
      icon: Wallet,
      title: "Crypto Payments",
      description: "Get paid in ETH, USDC, or other tokens. Fast, global, and low-fee transactions.",
      gradient: "gradient-secondary"
    },
    {
      icon: MessageSquare,
      title: "Built-in Chat & Telegram",
      description: "Communicate seamlessly on-platform or via Telegram bot notifications and replies.",
      gradient: "gradient-primary"
    },
    {
      icon: Award,
      title: "Verified Ratings",
      description: "On-chain ratings and reviews ensure transparency and trust in every transaction.",
      gradient: "gradient-secondary"
    },
    {
      icon: Globe,
      title: "IPFS Storage",
      description: "Store portfolios, contracts, and deliverables on decentralized storage—no central server.",
      gradient: "gradient-primary"
    },
    {
      icon: Zap,
      title: "Dispute Resolution",
      description: "Fair arbitration system to resolve conflicts and protect both parties.",
      gradient: "gradient-secondary"
    }
  ];

  const stats = [
    { icon: Users, value: "10K+", label: "Active Freelancers" },
    { icon: Briefcase, value: "5K+", label: "Projects Completed" },
    { icon: TrendingUp, value: "$2M+", label: "Paid in Crypto" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 relative">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full glass-card border border-primary/20 shadow-glow animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Decentralized • Secure • Transparent
            </span>
            <Sparkles className="w-4 h-4 text-secondary" />
          </div>
          
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-fade-in leading-tight" style={{ animationDelay: '0.1s' }}>
            The Future of<br />Freelancing
          </h1>
          
          <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto animate-fade-in leading-relaxed px-4" style={{ animationDelay: '0.2s' }}>
            Hire talent, deliver projects, and get paid in crypto—all secured by smart contracts and escrow on the blockchain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-glow hover:scale-105 transition-smooth text-base px-8 py-6">
                Get Started
                <Zap className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="gap-2 hover:scale-105 transition-smooth border-primary/20 text-base px-8 py-6">
                Browse Jobs
                <Globe className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => (
              <Card key={index} className={`p-4 md:p-6 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth ${index === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                <stat.icon className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Why Choose DeFiLance?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on blockchain technology, designed for the future of work
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="p-5 md:p-8 glass-card border-primary/10 shadow-card hover:shadow-glow transition-smooth hover:scale-105 group animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${feature.gradient} flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 transition-smooth shadow-glow`}>
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 group-hover:text-primary transition-smooth">{feature.title}</h3>
                  <p className="text-xs md:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <Card className="relative overflow-hidden p-8 md:p-16 glass-card border-primary/20 shadow-glow text-center">
            <div className="absolute inset-0 gradient-primary opacity-5"></div>
            <div className="relative z-10">
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4 md:mb-6 animate-pulse" />
              <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Ready to Get Started?
              </h2>
              <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
                Connect your wallet and start hiring or freelancing on the decentralized marketplace today.
              </p>
              <Link to="/marketplace">
                <Button size="lg" className="gap-2 shadow-glow hover:scale-105 transition-smooth text-base px-10 py-6">
                  Launch App
                  <Zap className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
