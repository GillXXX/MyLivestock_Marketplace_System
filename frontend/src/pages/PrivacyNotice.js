import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import useGoBack from "../utils/useGoBack";
import logo from "../assets/logo.png";
import "./PrivacyNotice.css";

// What personal data VOLT collects, why, and who can see it, in line with
// the Data Privacy Act of 2012 (RA 10173). Keep it in step with the system:
// if a feature starts collecting or showing something new, update this.
function PrivacyNotice() {
  const goBack = useGoBack("/");

  return (
    <div className="privacy-page">
      <header className="privacy-header">
        <button type="button" className="privacy-back" onClick={goBack}>
          <ArrowLeft size={18} />
          Back
        </button>

        <Link to="/" className="privacy-brand">
          <img src={logo} alt="VOLT logo" />
          <span>VOLT</span>
        </Link>
      </header>

      <main className="privacy-card">
        <span className="privacy-eyebrow">
          <ShieldCheck size={14} />
          DATA PRIVACY
        </span>
        <h1>Privacy Notice</h1>
        <p className="privacy-updated">Last updated: October 15, 2026</p>

        <p>
          VOLT (Veruela Online Livestock Trade) is a livestock marketplace for Veruela, Agusan del Sur,
          used by farmers, buyers, and the Municipal Agriculture Office (MAO). This notice explains what
          personal information VOLT collects, why, who can see it, and your rights under the{" "}
          <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address, phone number, and role (farmer or
            buyer). Passwords are stored only in hashed form. If you sign in with Google, we receive your
            name and email from Google.
          </li>
          <li>
            <strong>Farmer profile:</strong> your barangay, purok, and sitio or street, a map pin of your
            farm, a profile photo, and an optional description.
          </li>
          <li>
            <strong>Farmer verification documents:</strong> a valid government ID and a barangay
            certificate, submitted to verify your account.
          </li>
          <li>
            <strong>Listings:</strong> photos, prices, animal details, and the barangay health certificate
            attached to each livestock listing.
          </li>
          <li>
            <strong>Messages and deals:</strong> chat messages and attachments, offers, agreed prices,
            pickup dates and places, payment method, and weights recorded at pickup.
          </li>
          <li>
            <strong>MAO and admin staff:</strong> sign-in and sign-out times and the IP address used, for
            accountability.
          </li>
        </ul>
        <p>
          When a buyer turns on location to see the distance to a seller, that location is used only in
          the buyer's own browser. It is <strong>not</strong> sent to or stored by VOLT.
        </p>

        <h2>Why we collect it</h2>
        <ul>
          <li>To create and secure your account and let you sign in.</li>
          <li>
            To let MAO verify that farmers are real residents of Veruela and that livestock listings have a
            valid health certificate.
          </li>
          <li>To show listings to buyers and let buyers and farmers negotiate and complete deals.</li>
          <li>
            To let MAO monitor livestock trading and prepare reports, such as the number of farmers in each
            barangay.
          </li>
        </ul>

        <h2>Who can see it</h2>
        <ul>
          <li>
            <strong>Buyers</strong> see a farmer's name, profile photo, verification status, general
            location, farm map pin, description, and listings, including each listing's health
            certificate. A farmer's phone number and email are not shown on listings or seller profiles.
          </li>
          <li>
            <strong>The other person in a deal</strong> sees the messages, offers, and terms you exchange
            with them.
          </li>
          <li>
            <strong>MAO staff and the system administrator</strong> can see account details, verification
            documents, listings, and transactions to carry out verification and monitoring.
          </li>
          <li>
            <strong>Government IDs and barangay certificates</strong> are kept in private storage. They can
            be opened only by MAO staff and the administrator, through links that expire after two hours.
          </li>
        </ul>
        <p>VOLT does not sell your personal information or share it with advertisers.</p>

        <h2>How long we keep it</h2>
        <p>
          Your information is kept while your account is active. Listings, deals, and messages are kept as
          records of livestock trading in Veruela for MAO monitoring. An account that has such records can
          be deactivated, so it can no longer be used, but those records stay in the system.
        </p>

        <h2>Your rights</h2>
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>be informed about how your personal information is used;</li>
          <li>access your personal information;</li>
          <li>correct it, which you can do yourself from your profile;</li>
          <li>object to its processing, or ask for your account to be deactivated or deleted; and</li>
          <li>file a complaint with the National Privacy Commission.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For questions about your personal information, or to use any of these rights, contact the{" "}
          <strong>Municipal Agriculture Office of Veruela, Agusan del Sur</strong>.
        </p>
      </main>
    </div>
  );
}

export default PrivacyNotice;
