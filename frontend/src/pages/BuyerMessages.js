import {
  ArrowLeft,
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Image,
  ShieldCheck,
  CheckCheck,
  MapPin,
  Store,
  Info,
} from "lucide-react";

import { Link } from "react-router-dom";
import "./BuyerMessages.css";

function BuyerMessages() {
  const conversations = [
    {
      id: 1,
      name: "Almyr Belenson",
      role: "Verified Farmer",
      listing: "Large White Swine",
      message: "Yes, the swine is still available.",
      time: "9:32 AM",
      unread: 1,
      active: true,
      online: true,
    },
    {
      id: 2,
      name: "Juan Dela Cruz",
      role: "Verified Farmer",
      listing: "Boer Goat",
      message: "You can visit the farm tomorrow.",
      time: "Yesterday",
      unread: 0,
      active: false,
      online: false,
    },
    {
      id: 3,
      name: "Mario Santos",
      role: "Verified Farmer",
      listing: "Brahman Cattle",
      message: "The cattle is ready for inspection.",
      time: "Monday",
      unread: 2,
      active: false,
      online: true,
    },
  ];

  return (
    <div className="buyer-messages-page">
      <header className="buyer-messages-header">
        <div className="header-left">
          <Link to="/buyer-dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">BUYER COMMUNICATION CENTER</span>
            <h1>Messages</h1>
            <p>
              Contact verified farmers, negotiate livestock prices, and manage
              marketplace inquiries securely.
            </p>
          </div>
        </div>
      </header>

      <section className="buyer-chat-layout">
        <aside className="buyer-chat-sidebar">
          <div className="sidebar-title">
            <div>
              <h3>Conversations</h3>
              <p>Farmer inquiries and negotiations</p>
            </div>
            <span>3</span>
          </div>

          <div className="buyer-chat-search">
            <Search size={18} />
            <input type="text" placeholder="Search farmer or listing..." />
          </div>

          <div className="chat-tabs">
            <button className="active">All</button>
            <button>Unread</button>
            <button>Negotiation</button>
          </div>

          <div className="conversation-list">
            {conversations.map((item) => (
              <div
                className={`conversation-item ${item.active ? "active" : ""}`}
                key={item.id}
              >
                <div className="avatar-wrap">
                  <div className="avatar">{item.name.charAt(0)}</div>
                  {item.online && <i></i>}
                </div>

                <div className="conversation-info">
                  <div className="conversation-top">
                    <h4>{item.name}</h4>
                    <small>{item.time}</small>
                  </div>

                  <p>{item.message}</p>

                  <div className="conversation-meta">
                    <span>{item.listing}</span>
                    <small>{item.role}</small>
                  </div>
                </div>

                {item.unread > 0 && (
                  <strong className="unread-count">{item.unread}</strong>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main className="buyer-chat-main">
          <div className="chat-topbar">
            <div className="chat-profile">
              <div className="avatar large">A</div>

              <div>
                <div className="chat-name-row">
                  <h3>Almyr Belenson</h3>

                  <span>
                    <ShieldCheck size={14} />
                    Verified Farmer
                  </span>
                </div>

                <p>Inquiry about Large White Swine</p>
              </div>
            </div>

            <div className="chat-action-buttons">
              <button>
                <Phone size={18} />
              </button>

              <button>
                <Video size={18} />
              </button>

              <button>
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <section className="listing-context-card">
            <img
              src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=800&auto=format&fit=crop"
              alt="Swine"
            />

            <div>
              <span>Current Inquiry</span>
              <h4>Large White Swine</h4>
              <p>
                <MapPin size={15} />
                Poblacion, Veruela
              </p>
            </div>

            <strong>₱12,000</strong>

            <Link to="/marketplace">
              View Listing
            </Link>
          </section>

          <section className="chat-messages-area">
            <div className="date-divider">
              <span>Today</span>
            </div>

            <MessageReceived
              text="Good morning. Is the swine still available?"
              time="9:30 AM"
            />

            <MessageSent
              text="Good morning. Yes, it is still available."
              time="9:32 AM"
            />

            <MessageReceived
              text="Can I visit your farm this afternoon for inspection?"
              time="9:35 AM"
            />

            <MessageSent
              text="Yes, you may visit around 2:00 PM. The farm is located in Poblacion, Veruela."
              time="9:37 AM"
            />

            <MessageReceived
              text="Thank you. Can we still negotiate the final price?"
              time="9:40 AM"
            />
          </section>

          <form className="buyer-message-input">
            <div className="input-tools">
              <button type="button">
                <Paperclip size={18} />
              </button>

              <button type="button">
                <Image size={18} />
              </button>

              <button type="button">
                <Info size={18} />
              </button>
            </div>

            <input type="text" placeholder="Type your message to the farmer..." />

            <button className="send-btn" type="submit">
              <Send size={18} />
            </button>
          </form>
        </main>

        <aside className="buyer-chat-details">
          <div className="seller-card">
            <div className="seller-avatar">A</div>

            <h3>Almyr Belenson</h3>

            <span>
              <ShieldCheck size={14} />
              Verified Farmer
            </span>

            <p>Backyard livestock farmer from Poblacion, Veruela.</p>
          </div>

          <div className="details-panel">
            <h4>Seller Information</h4>

            <DetailRow icon={<MapPin size={18} />} label="Location" value="Poblacion, Veruela" />
            <DetailRow icon={<Store size={18} />} label="Active Listings" value="3 livestock listings" />
            <DetailRow icon={<ShieldCheck size={18} />} label="Verification" value="MAO approved" />
          </div>

          <div className="details-panel">
            <h4>Trading Workflow</h4>

            <div className="workflow-mini">
              <span className="done"></span>
              <span className="active"></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <p className="workflow-text">Current stage: Negotiation</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function MessageReceived({ text, time }) {
  return (
    <div className="chat-message received">
      <div className="message-bubble">
        <p>{text}</p>
        <span>{time}</span>
      </div>
    </div>
  );
}

function MessageSent({ text, time }) {
  return (
    <div className="chat-message sent">
      <div className="message-bubble">
        <p>{text}</p>

        <div>
          <span>{time}</span>
          <CheckCheck size={15} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="detail-row">
      <div>{icon}</div>

      <section>
        <strong>{label}</strong>
        <p>{value}</p>
      </section>
    </div>
  );
}

export default BuyerMessages;