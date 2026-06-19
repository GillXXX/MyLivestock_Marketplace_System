import {
  Search,
  MessageCircle,
  ShieldCheck,
  MapPin,
  BarChart3,
  ClipboardCheck,
  ArrowRight,
  CheckCircle,
  Users,
  Store,
  FileCheck2,
  TrendingUp,
  Menu,
} from "lucide-react";

import "./LandingPage.css";

function LandingPage() {
  return (
    <div className="premium-landing">
      <nav className="landing-nav">
        <a href="/" className="brand">
          <div className="brand-logo">HM</div>
          <div>
            <h3>HerdMarket</h3>
            <span>Livestock Marketplace</span>
          </div>
        </a>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#livestock">Livestock</a>
          <a href="#benefits">Benefits</a>
        </div>

        <div className="nav-actions">
          <a href="/login" className="login-link">Login</a>
          <a href="/register" className="nav-btn">Get Started</a>
        </div>

        <button className="mobile-menu">
          <Menu size={22} />
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow">WEB-BASED LIVESTOCK MARKETPLACE SYSTEM</span>

          <h1>
            Modern livestock trading for backyard farmers in Veruela.
          </h1>

          <p>
            HerdMarket connects farmers, buyers, and MAO personnel through a
            secure digital marketplace with structured workflows, seller mapping,
            document verification, messaging, and transaction recording.
          </p>

          <div className="hero-buttons">
            <a href="/register" className="primary-btn">
              Start Trading
              <ArrowRight size={18} />
            </a>

            <a href="/login" className="secondary-btn">
              Login Portal
            </a>
          </div>

          <div className="trust-row">
            <div>
              <CheckCircle size={18} />
              Verified farmer listings
            </div>

            <div>
              <CheckCircle size={18} />
              MAO monitored transactions
            </div>

            <div>
              <CheckCircle size={18} />
              Map-based seller visibility
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-card">
            <img
              src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1500&auto=format&fit=crop"
              alt="Livestock marketplace"
            />

            <div className="hero-floating-card top">
              <strong>56</strong>
              <span>Active Listings</span>
            </div>

            <div className="hero-floating-card bottom">
              <MessageCircle size={22} />
              <div>
                <strong>3 new inquiries</strong>
                <span>Buyers are interested today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <Stat icon={<Store />} value="56+" label="Livestock Listings" />
        <Stat icon={<Users />} value="128+" label="Registered Users" />
        <Stat icon={<FileCheck2 />} value="34+" label="Recorded Trades" />
        <Stat icon={<MapPin />} value="23+" label="Mapped Sellers" />
      </section>

      <section id="features" className="section">
        <div className="section-heading">
          <span className="eyebrow">SYSTEM FEATURES</span>
          <h2>Built for secure and transparent livestock trading.</h2>
          <p>
            A complete marketplace solution designed specifically for farmers,
            buyers, and MAO monitoring needs.
          </p>
        </div>

        <div className="feature-grid">
          <Feature
            icon={<Search />}
            title="Search Livestock"
            text="Buyers can browse and filter livestock by type, price, location, and availability."
          />

          <Feature
            icon={<MessageCircle />}
            title="Buyer-Seller Messaging"
            text="Farmers and buyers can communicate, inquire, and negotiate inside the platform."
          />

          <Feature
            icon={<ShieldCheck />}
            title="MAO Verification"
            text="Administrators can approve listings, verify documents, and monitor transactions."
          />

          <Feature
            icon={<MapPin />}
            title="Location Mapping"
            text="Buyers can view approximate seller or farm locations before arranging inspection."
          />

          <Feature
            icon={<BarChart3 />}
            title="Reports & Analytics"
            text="MAO personnel can generate trading summaries and livestock activity reports."
          />

          <Feature
            icon={<ClipboardCheck />}
            title="Digital Records"
            text="Completed transactions are stored digitally for organized monitoring and tracking."
          />
        </div>
      </section>

      <section id="workflow" className="workflow-section">
        <div className="workflow-content">
          <span className="eyebrow">STRUCTURED TRADING WORKFLOW</span>
          <h2>A clear process from listing to transaction confirmation.</h2>
          <p>
            Unlike generic marketplace platforms, HerdMarket follows a
            livestock-specific workflow that supports inquiry, negotiation,
            verification, and transaction recording.
          </p>

          <a href="/register">
            Start with HerdMarket
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="workflow-timeline">
          <WorkflowStep number="01" title="Farmer posts livestock" />
          <WorkflowStep number="02" title="Buyer sends inquiry" />
          <WorkflowStep number="03" title="Buyer and seller negotiate" />
          <WorkflowStep number="04" title="MAO verifies documents" />
          <WorkflowStep number="05" title="Transaction is recorded" />
        </div>
      </section>

      <section id="livestock" className="section">
        <div className="section-heading">
          <span className="eyebrow">SUPPORTED LIVESTOCK</span>
          <h2>Designed for common livestock in Veruela.</h2>
          <p>
            The system supports structured workflows for livestock commonly
            traded by backyard farmers.
          </p>
        </div>

        <div className="livestock-grid">
          <Livestock
            name="Swine"
            image="https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=1200&auto=format&fit=crop"
          />

          <Livestock
            name="Cattle"
            image="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1200&auto=format&fit=crop"
          />

          <Livestock
            name="Goat"
            image="https://images.unsplash.com/photo-1524024973431-2ad916746881?q=80&w=1200&auto=format&fit=crop"
          />

          <Livestock
            name="Poultry"
            image="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=1200&auto=format&fit=crop"
          />
        </div>
      </section>

      <section id="benefits" className="benefits-section">
        <div className="benefit-card dark">
          <span className="eyebrow">WHY HERDMARKET</span>
          <h2>From manual trading to organized digital livestock commerce.</h2>
          <p>
            HerdMarket improves trading visibility, price transparency,
            transaction documentation, and marketplace monitoring for rural
            livestock trading.
          </p>
        </div>

        <div className="benefit-list">
          <Benefit title="Wider buyer access" text="Farmers can present livestock to more potential buyers online." />
          <Benefit title="Transparent negotiation" text="Buyers and sellers can communicate through structured messaging." />
          <Benefit title="Verified transactions" text="MAO verification strengthens trust and documentation completeness." />
          <Benefit title="Centralized records" text="Listings, inquiries, and completed trades are stored in one system." />
        </div>
      </section>

      <section className="cta-section">
        <div>
          <span className="eyebrow">START TODAY</span>
          <h2>Modernize livestock trading in Veruela.</h2>
          <p>
            Create your account and experience a more organized, secure, and
            transparent livestock marketplace.
          </p>
        </div>

        <a href="/register">
          Create Account
          <ArrowRight size={18} />
        </a>
      </section>

      <footer className="landing-footer">
        <div>
          <h3>HerdMarket</h3>
          <p>Web-Based Livestock Marketplace System for Veruela, Agusan del Sur.</p>
        </div>

        <div>
          <strong>Platform</strong>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#livestock">Livestock</a>
        </div>

        <div>
          <strong>Access</strong>
          <a href="/login">Login</a>
          <a href="/register">Register</a>
        </div>

        <div>
          <strong>Capstone</strong>
          <p>Agusan del Sur State University</p>
          <p>BS Information Technology</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat-card">
      <div>{icon}</div>
      <h3>{value}</h3>
      <p>{label}</p>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function WorkflowStep({ number, title }) {
  return (
    <div className="workflow-step">
      <span>{number}</span>
      <h4>{title}</h4>
    </div>
  );
}

function Livestock({ name, image }) {
  return (
    <div className="livestock-card">
      <img src={image} alt={name} />
      <div>
        <h4>{name}</h4>
        <p>Verified listings available</p>
      </div>
    </div>
  );
}

function Benefit({ title, text }) {
  return (
    <div className="benefit-item">
      <TrendingUp size={20} />
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default LandingPage;