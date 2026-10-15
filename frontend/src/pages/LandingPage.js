import { useEffect, useState } from "react";
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
  Handshake,
  Users,
  Menu,
  X,
} from "lucide-react";

import { API_URL } from "../config";
import logo from "../assets/logo.png";
import heroImage from "../assets/landing-hero.jpg";
import swineImage from "../assets/livestock/swine.jpg";
import cattleImage from "../assets/livestock/cattle.jpg";
import goatImage from "../assets/livestock/goat.jpg";
import poultryImage from "../assets/livestock/poultry.jpg";
import "./LandingPage.css";

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeListings, setActiveListings] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/stats`);
        const data = await res.json();
        if (res.ok) setActiveListings(data.activeListings);
      } catch (error) {
        // The hero stat is a nice-to-have — leave the placeholder if this fails.
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="premium-landing">
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <a href="/" className="brand">
          <div className="brand-logo">
            <img src={logo} alt="VOLT logo" />
          </div>
          <div>
            <h3>VOLT</h3>
            <span>Veruela Online Livestock Trade</span>
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
            Modern livestock and farm product trading for backyard farmers in Veruela.
          </h1>

          <p>
            VOLT connects farmers, buyers, and MAO personnel through a
            secure digital marketplace with structured workflows, seller mapping,
            document verification, messaging, and transaction recording.
          </p>

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

          <div className="hero-buttons">
            <a href="/register" className="primary-btn">
              Start Trading
              <ArrowRight size={18} />
            </a>

            <a href="/login" className="secondary-btn">
              Login Portal
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-glow"></div>

          <div className="hero-image-card">
            <img
              src={heroImage}
              alt="A farmer with his carabao, pigs, goats and chickens on a farm in Veruela"
              fetchPriority="high"
            />

            <div className="hero-floating-card top">
              <div className="hero-floating-icon">
                <Store size={20} />
              </div>
              <div>
                <strong>{activeListings === null ? "—" : activeListings}</strong>
                <span>Active Listings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section features-section">
        <div className="section-heading reveal">
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
            title="Search Livestock & Produce"
            text="Buyers can browse and filter livestock and farm products by type, price, location, and availability."
            tone="green"
          />

          <Feature
            icon={<MessageCircle />}
            title="Messaging & Deal Terms"
            text="Buyers and farmers chat, then trade offers and counter-offers on price, pickup, and payment until both agree."
            tone="green"
          />

          <Feature
            icon={<ShieldCheck />}
            title="MAO Verification"
            text="MAO personnel verify farmer accounts and each listing's barangay health certificate, and monitor every deal."
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
            text="MAO personnel generate trading summaries, livestock activity reports, and farmer records per barangay."
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

      <section id="workflow" className="workflow-section reveal">
        <div className="workflow-content">
          <span className="eyebrow">STRUCTURED TRADING WORKFLOW</span>
          <h2>A clear process from listing to transaction confirmation.</h2>
          <p>
            Unlike generic marketplace platforms, VOLT follows a
            livestock-specific workflow: MAO-verified listings, structured
            negotiation, weighing at pickup, and recorded transactions.
          </p>

          <a href="/register">
            Start with VOLT
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="workflow-timeline">
          <WorkflowStep
            number="01"
            icon={<Store size={18} />}
            title="Farmer posts livestock"
            text="A verified farmer lists the animal with photos, pricing, and a barangay health certificate."
          />
          <WorkflowStep
            number="02"
            icon={<ShieldCheck size={18} />}
            title="MAO verifies the listing"
            text="MAO checks the health certificate before the listing goes live."
          />
          <WorkflowStep
            number="03"
            icon={<MessageCircle size={18} />}
            title="Buyer inquires and starts a deal"
            text="Buyers ask questions in the chat, then start a deal."
          />
          <WorkflowStep
            number="04"
            icon={<Handshake size={18} />}
            title="Both sides agree on the terms"
            text="Offers and counter-offers settle the price, pickup date and place, and payment."
          />
          <WorkflowStep
            number="05"
            icon={<ClipboardCheck size={18} />}
            title="Weighed, confirmed, and recorded"
            text="Weighed at pickup if sold by the kilo, confirmed by the buyer, and recorded."
          />
        </div>
      </section>

      <section id="livestock" className="section">
        <div className="section-heading reveal">
          <span className="eyebrow">WHAT YOU CAN TRADE</span>
          <h2>Designed for common livestock in Veruela.</h2>
          <p>
            The system supports structured workflows for livestock commonly
            traded by backyard farmers (swine, cattle, carabao, goats, poultry,
            and ducks), plus backyard farm products like eggs, fruits, and
            vegetables.
          </p>
        </div>

        <div className="livestock-grid">
          <Livestock name="Swine" image={swineImage} />
          <Livestock name="Cattle" image={cattleImage} />
          <Livestock name="Goat" image={goatImage} />
          <Livestock name="Poultry" image={poultryImage} />
        </div>
      </section>

      <section id="benefits" className="benefits-section">
        <div className="benefit-card dark reveal">
          <span className="eyebrow">WHY VOLT</span>
          <h2>From manual trading to organized digital livestock commerce.</h2>
          <p>
            VOLT improves trading visibility, price transparency,
            transaction documentation, and marketplace monitoring for rural
            livestock trading.
          </p>
        </div>

        <div className="benefit-list reveal">
          <Benefit icon={<Users size={20} />} title="Wider buyer access" text="Farmers can present livestock to more potential buyers online." />
          <Benefit icon={<MessageCircle size={20} />} title="Transparent negotiation" text="Every offer, counter-offer, and agreed price is recorded in the chat." />
          <Benefit icon={<ShieldCheck size={20} />} title="Verified farmers and listings" text="MAO checks farmer IDs and health certificates before anything is sold." />
          <Benefit icon={<ClipboardCheck size={20} />} title="Centralized records" text="Listings, inquiries, and completed trades are stored in one system." />
        </div>
      </section>

      <section className="cta-section reveal">
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
                <img src={logo} alt="VOLT logo" />
              </div>
              <h3>VOLT</h3>
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
          <p>© {new Date().getFullYear()} VOLT. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text, tone = "green" }) {
  return (
    <div className={`lp-feature-card tone-${tone} reveal`}>
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
    <div className="livestock-card reveal">
      <img src={image} alt={name} loading="lazy" />
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
