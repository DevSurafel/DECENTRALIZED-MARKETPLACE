import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Briefcase,
  CheckCircle,
  ArrowRight,
  Star,
  Lock,
  Rocket,
  ChevronRight,
  Code,
  Palette,
  PenTool,
  Video,
  Menu,
  X
} from "lucide-react";

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Shield,
      title: "Smart Contract Escrow",
      description: "Payments held securely in escrow until milestones are completed. No middleman, no disputes.",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700"
    },
    {
      icon: Wallet,
      title: "Crypto Payments",
      description: "Get paid in ETH, USDC, or other tokens. Fast, global, and low-fee transactions.",
      gradient: "bg-gradient-to-br from-purple-500 to-purple-700"
    },
    {
      icon: MessageSquare,
      title: "Built-in Chat & Telegram",
      description: "Communicate seamlessly on-platform or via Telegram bot notifications and replies.",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700"
    },
    {
      icon: Award,
      title: "Verified Ratings",
      description: "On-chain ratings and reviews ensure transparency and trust in every transaction.",
      gradient: "bg-gradient-to-br from-purple-500 to-purple-700"
    },
    {
      icon: Globe,
      title: "IPFS Storage",
      description: "Store portfolios, contracts, and deliverables on decentralized storage—no central server.",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700"
    },
    {
      icon: Zap,
      title: "Dispute Resolution",
      description: "Fair arbitration system to resolve conflicts and protect both parties.",
      gradient: "bg-gradient-to-br from-purple-500 to-purple-700"
    }
  ];

  const stats = [
    { icon: Users, value: "10K+", label: "Active Freelancers" },
    { icon: Briefcase, value: "5K+", label: "Projects Completed" },
    { icon: TrendingUp, value: "$2M+", label: "Paid in Crypto" },
    { icon: Star, value: "4.9/5", label: "Average Rating" }
  ];

  const benefits = [
    "Zero platform fees for the first 3 months",
    "Instant crypto payments with low transaction fees",
    "Decentralized dispute resolution",
    "Built-in portfolio hosting on IPFS",
    "Real-time project tracking & milestones",
    "Multi-chain support (Ethereum, Polygon, BSC)"
  ];

  const categories = [
    { icon: Code, name: "Development", count: "2.5K+" },
    { icon: Palette, name: "Design", count: "1.8K+" },
    { icon: PenTool, name: "Writing", count: "1.2K+" },
    { icon: Video, name: "Video & Animation", count: "950+" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Full-Stack Developer",
      content: "DeFiLance changed how I work. Instant payments, no chargebacks, and complete transparency. It's the future.",
      rating: 5,
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "UI/UX Designer",
      content: "Finally, a platform that puts freelancers first. Smart contracts mean I get paid exactly when I deliver.",
      rating: 5,
      avatar: "MR"
    },
    {
      name: "Aisha Patel",
      role: "Content Writer",
      content: "The escrow system gives me confidence every time. No more payment disputes or delays!",
      rating: 5,
      avatar: "AP"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Connect Wallet",
      description: "Link your MetaMask or any Web3 wallet to get started in seconds"
    },
    {
      step: "2",
      title: "Create or Find Projects",
      description: "Post a job or browse thousands of opportunities in various categories"
    },
    {
      step: "3",
      title: "Smart Contract Escrow",
      description: "Funds are locked in escrow automatically when project starts"
    },
    {
      step: "4",
      title: "Deliver & Get Paid",
      description: "Complete milestones and receive instant crypto payments"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DeFiLance
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</a>
              <Button 
                onClick={() => window.location.href = '/marketplace'}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Launch App
              </Button>
            </div>

            <button 
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-4">
              <a href="#features" className="block text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="block text-gray-300 hover:text-white transition-colors">How It Works</a>
              <a href="#testimonials" className="block text-gray-300 hover:text-white transition-colors">Testimonials</a>
              <Button 
                onClick={() => window.location.href = '/marketplace'}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Launch App
              </Button>
            </div>
          )}
        </div>
      </nav>
      
      {/* Hero Section - Enhanced */}
      <section className="pt-32 pb-32 px-4 md:px-8 relative">
        <div className="mx-auto text-center max-w-7xl">
          <div className="inline-flex items-center gap-2 mb-8 px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="text-sm md:text-base font-medium bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Decentralized • Secure • Transparent
            </span>
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent leading-tight px-4 animate-fade-in">
            The Future of<br />Freelancing is Here
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            Hire world-class talent, deliver exceptional projects, and get paid in crypto—all secured by smart contracts and blockchain technology. Welcome to the new era of work.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-20 px-4">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/marketplace'}
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/50 hover:scale-105 transition-all duration-300 text-base md:text-lg px-10 py-7 w-full sm:w-auto group"
            >
              Get Started Free
              <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => window.location.href = '/marketplace'}
              className="gap-2 hover:scale-105 transition-all duration-300 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-base md:text-lg px-10 py-7 w-full sm:w-auto group"
            >
              Explore Jobs
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Stats Section - Enhanced */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="p-6 md:p-8 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group">
                <stat.icon className="w-8 h-8 md:w-10 md:h-10 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-gray-400">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 md:px-8 relative">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Get started in minutes with our simple 4-step process
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <Card className="p-8 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 h-full group hover:scale-105">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 text-2xl font-bold text-white shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </Card>
                {index < howItWorks.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-1/2 -right-4 w-8 h-8 text-blue-500/30 -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 md:px-8 relative">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Why Choose DeFiLance?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Built on blockchain technology, designed for the future of work
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="p-8 md:p-10 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group"
                >
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-base md:text-lg text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 px-4 md:px-8 relative">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Popular Categories
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Find opportunities in your area of expertise
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => (
              <Card 
                key={index}
                className="p-8 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 group cursor-pointer text-center"
              >
                <category.icon className="w-12 h-12 md:w-14 md:h-14 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-blue-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-400">{category.count} jobs</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 md:px-8 relative">
        <div className="mx-auto max-w-7xl">
          <Card className="p-10 md:p-16 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg shadow-blue-500/20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Lock className="w-12 h-12 text-blue-400 mb-6" />
                <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Built on Trust & Technology
                </h2>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  Experience the power of blockchain-powered freelancing. Every transaction is transparent, secure, and verified on-chain.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-base md:text-lg text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl absolute inset-0"></div>
                <Card className="relative p-8 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Smart Contract Security</div>
                        <div className="text-sm text-gray-400">Multi-sig wallets supported</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/50">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Lightning Fast</div>
                        <div className="text-sm text-gray-400">Instant payment processing</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Global Reach</div>
                        <div className="text-sm text-gray-400">Work from anywhere</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 md:px-8 relative">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Loved by Freelancers Worldwide
            </h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Join thousands of professionals who trust DeFiLance
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index}
                className="p-8 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed text-base md:text-lg">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <Card className="relative overflow-hidden p-12 md:p-20 bg-white/5 backdrop-blur-sm border-blue-500/20 shadow-lg shadow-blue-500/20 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_50%)]"></div>
            <div className="relative z-10">
              <Sparkles className="w-14 h-14 md:w-16 md:h-16 text-blue-400 mx-auto mb-8 animate-pulse" />
              <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Ready to Transform Your Career?
              </h2>
              <p className="text-lg md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Join the decentralized revolution. Connect your wallet and start your journey on the world's most secure freelance platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = '/marketplace'}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/50 hover:scale-105 transition-all duration-300 text-lg px-12 py-8 w-full sm:w-auto group"
                >
                  Launch App
                  <Rocket className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="gap-2 hover:scale-105 transition-all duration-300 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-lg px-12 py-8 w-full sm:w-auto"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 border-t border-blue-500/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center text-gray-400">
            <p className="mb-2">© 2024 DeFiLance. Built on blockchain, powered by innovation.</p>
            <p className="text-sm">Secure • Transparent • Decentralized</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
