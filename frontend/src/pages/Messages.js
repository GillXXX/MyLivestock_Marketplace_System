import {
  Send,
  Search,
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Paperclip,
  Image,
  ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import "./Messages.css";

function Messages() {

  const contacts = [
    {
      id: 1,
      name: "Juan Dela Cruz",
      livestock: "Swine Listing",
      message: "Is the swine still available?",
      time: "9:30 AM",
      unread: 2,
      online: true,
      active: true,
    },
    {
      id: 2,
      name: "Maria Santos",
      livestock: "Goat Listing",
      message: "Can I visit your farm tomorrow?",
      time: "Yesterday",
      unread: 0,
      online: false,
      active: false,
    },
    {
      id: 3,
      name: "Pedro Reyes",
      livestock: "Cattle Listing",
      message: "Please send updated photos.",
      time: "Monday",
      unread: 1,
      online: true,
      active: false,
    },
  ];

  return (
    <div className="premium-messages-page">

      {/* HEADER */}
      <div className="messages-page-header">

        <div className="header-left">

          <Link
            to="/farmer-dashboard"
            className="back-btn"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>

            <span className="page-tag">
              BUYER COMMUNICATION
            </span>

            <h1>Marketplace Messages</h1>

            <p>
              Communicate securely with buyers and manage livestock inquiries professionally.
            </p>

          </div>

        </div>

      </div>

      {/* CHAT CONTAINER */}
      <div className="messages-layout">

        {/* SIDEBAR */}
        <aside className="chat-sidebar">

          {/* SEARCH */}
          <div className="chat-search-box">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search conversations..."
            />

          </div>

          {/* FILTERS */}
          <div className="chat-filters">

            <button className="active">
              All Chats
            </button>

            <button>
              Unread
            </button>

            <button>
              Buyers
            </button>

          </div>

          {/* CONTACTS */}
          <div className="chat-list">

            {contacts.map((contact) => (

              <div
                key={contact.id}
                className={`chat-person ${
                  contact.active ? "active" : ""
                }`}
              >

                <div className="avatar-wrapper">

                  <div className="avatar">
                    {contact.name.charAt(0)}
                  </div>

                  {contact.online && (
                    <span className="online-dot"></span>
                  )}

                </div>

                <div className="chat-person-info">

                  <div className="chat-person-top">

                    <h5>
                      {contact.name}
                    </h5>

                    <span>
                      {contact.time}
                    </span>

                  </div>

                  <p>
                    {contact.message}
                  </p>

                  <small>
                    {contact.livestock}
                  </small>

                </div>

                {contact.unread > 0 && (
                  <div className="unread-badge">
                    {contact.unread}
                  </div>
                )}

              </div>

            ))}

          </div>

        </aside>

        {/* CHAT AREA */}
        <main className="chat-area">

          {/* CHAT HEADER */}
          <div className="chat-topbar">

            <div className="chat-user-info">

              <div className="avatar large">
                J
              </div>

              <div>

                <div className="user-title">

                  <h4>
                    Juan Dela Cruz
                  </h4>

                  <span className="verified-badge">
                    <ShieldCheck size={14} />
                    Verified Buyer
                  </span>

                </div>

                <p>
                  Inquiry about Swine Listing
                </p>

              </div>

            </div>

            <div className="chat-actions">

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

          {/* MESSAGES */}
          <div className="chat-messages">

            <div className="message received">

              <div className="message-bubble">

                <p>
                  Good morning. Is the swine still available?
                </p>

                <div className="message-meta">
                  <span>9:30 AM</span>
                </div>

              </div>

            </div>

            <div className="message sent">

              <div className="message-bubble">

                <p>
                  Good morning. Yes, it is still available.
                </p>

                <div className="message-meta">

                  <span>9:32 AM</span>

                  <CheckCheck size={16} />

                </div>

              </div>

            </div>

            <div className="message received">

              <div className="message-bubble">

                <p>
                  What is the final price?
                </p>

                <div className="message-meta">
                  <span>9:35 AM</span>
                </div>

              </div>

            </div>

            <div className="message sent">

              <div className="message-bubble">

                <p>
                  The price is ₱12,000 but still negotiable depending on payment arrangement.
                </p>

                <div className="message-meta">

                  <span>9:37 AM</span>

                  <CheckCheck size={16} />

                </div>

              </div>

            </div>

          </div>

          {/* INPUT */}
          <form className="message-input-area">

            <div className="message-tools">

              <button type="button">
                <Paperclip size={18} />
              </button>

              <button type="button">
                <Image size={18} />
              </button>

            </div>

            <input
              type="text"
              placeholder="Type your message..."
            />

            <button
              className="send-btn"
              type="submit"
            >
              <Send size={18} />
            </button>

          </form>

        </main>

      </div>

    </div>
  );
}

export default Messages;