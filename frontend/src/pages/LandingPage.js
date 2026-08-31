import { useState } from "react";
import {
  Search,
  MessageCircle,
  ShieldCheck,
  MapPin,
  BarChart3,
  ClipboardCheck,
  ArrowRight,
  CheckCircle,
  Store,
  Tractor,
  Handshake,
  Users,
  Menu,
  X,
} from "lucide-react";

import "./LandingPage.css";

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="premium-landing">
      <nav className="landing-nav">
        <a href="/" className="brand">
          <div className="brand-logo">
            <Tractor size={27} />
          </div>
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
          <a href="/register" className="nav-btn">
            Get Started
            <ArrowRight size={16} />
          </a>
        </div>

        <button
          className="mobile-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {mobileMenuOpen && (
          <div className="mobile-menu-panel">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
            <a href="#livestock" onClick={() => setMobileMenuOpen(false)}>Livestock</a>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
            <a href="/login" className="login-link">Login</a>
            <a href="/register" className="nav-btn">Get Started</a>
          </div>
        )}
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <span className="eyebrow hero-badge">
            <ShieldCheck size={14} />
            WEB-BASED LIVESTOCK MARKETPLACE SYSTEM
          </span>

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
          <div className="hero-visual-glow"></div>

          <div className="hero-image-card">
            <img
              src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1500&auto=format&fit=crop"
              alt="Livestock marketplace"
            />

            <div className="hero-floating-card top">
              <div className="hero-floating-icon">
                <Store size={20} />
              </div>
              <div>
                <strong>56+</strong>
                <span>Active Listings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section features-section">
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
            tone="green"
          />

          <Feature
            icon={<MessageCircle />}
            title="Buyer-Seller Messaging"
            text="Farmers and buyers can communicate, inquire, and negotiate inside the platform."
            tone="green"
          />

          <Feature
            icon={<ShieldCheck />}
            title="MAO Verification"
            text="Administrators can approve listings, verify documents, and monitor transactions."
            tone="green"
          />

          <Feature
            icon={<MapPin />}
            title="Location Mapping"
            text="Buyers can view approximate seller or farm locations before arranging inspection."
            tone="green"
          />

          <Feature
            icon={<BarChart3 />}
            title="Reports & Analytics"
            text="MAO personnel can generate trading summaries and livestock activity reports."
            tone="green"
          />

          <Feature
            icon={<ClipboardCheck />}
            title="Digital Records"
            text="Completed transactions are stored digitally for organized monitoring and tracking."
            tone="green"
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
          <WorkflowStep
            number="01"
            icon={<Store size={18} />}
            title="Farmer posts livestock"
            text="Listing details, photos, and pricing go live for buyers to browse."
          />
          <WorkflowStep
            number="02"
            icon={<MessageCircle size={18} />}
            title="Buyer sends inquiry"
            text="Interested buyers reach out directly through in-platform messaging."
          />
          <WorkflowStep
            number="03"
            icon={<Handshake size={18} />}
            title="Buyer and seller negotiate"
            text="Both parties discuss price, condition, and pickup arrangements."
          />
          <WorkflowStep
            number="04"
            icon={<ShieldCheck size={18} />}
            title="MAO verifies documents"
            text="Administrators confirm listing and transaction documentation."
          />
          <WorkflowStep
            number="05"
            icon={<ClipboardCheck size={18} />}
            title="Transaction is recorded"
            text="The completed trade is logged for monitoring and reporting."
          />
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
          <Benefit icon={<Users size={20} />} title="Wider buyer access" text="Farmers can present livestock to more potential buyers online." />
          <Benefit icon={<MessageCircle size={20} />} title="Transparent negotiation" text="Buyers and sellers can communicate through structured messaging." />
          <Benefit icon={<ShieldCheck size={20} />} title="Verified transactions" text="MAO verification strengthens trust and documentation completeness." />
          <Benefit icon={<ClipboardCheck size={20} />} title="Centralized records" text="Listings, inquiries, and completed trades are stored in one system." />
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
        <div className="footer-columns">
          <div className="footer-brand">
            <div className="footer-brand-mark">
              <div className="footer-brand-icon">
                <Tractor size={20} />
              </div>
              <h3>HerdMarket</h3>
            </div>
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
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} HerdMarket. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text, tone = "green" }) {
  return (
    <div className={`lp-feature-card tone-${tone}`}>
      <div className="feature-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}

function WorkflowStep({ number, icon, title, text }) {
  return (
    <div className="workflow-step">
      <div className="workflow-step-icon">{icon}</div>
      <div>
        <span className="workflow-step-number">STEP {number}</span>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Livestock({ name, image }) {
  return (
    <div className="livestock-card">
      <img src={image} alt={name} />
      <div>
        <h4>{name}</h4>
        <p>Browse {name.toLowerCase()} listings</p>
      </div>
    </div>
  );
}

function Benefit({ icon, title, text }) {
  return (
    <div className="benefit-item">
      <div className="benefit-icon">{icon}</div>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default LandingPage;
