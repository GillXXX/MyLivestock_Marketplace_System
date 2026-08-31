import { useEffect, useRef, useState } from "react";

import {
  Send,
  ThumbsUp,
  Search,
  ArrowLeft,
  ShieldCheck,
  MessageSquareText,
  MessagesSquare,
  Trash2,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "./Messages.css";

const POLL_MESSAGES_MS = 2000;
const POLL_CONVERSATIONS_MS = 5000;
const TYPING_PING_THROTTLE_MS = 1500;
const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=400&auto=format&fit=crop";

const formatConversationTime = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatDayDivider = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
};

const groupMessagesByDay = (messages) => {
  const groups = [];

  messages.forEach((msg) => {
    const dayKey = new Date(msg.created_at).toDateString();
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.dayKey === dayKey) {
      lastGroup.items.push(msg);
    } else {
      groups.push({ dayKey, items: [msg] });
    }
  });

  return groups;
};

const clusterMessages = (items) =>
  items.map((msg, index) => {
    const prev = items[index - 1];
    const next = items[index + 1];
    const sameAsPrev = prev && prev.sender_id === msg.sender_id;
    const sameAsNext = next && next.sender_id === msg.sender_id;

    let clusterPosition = "single";
    if (sameAsPrev && sameAsNext) clusterPosition = "middle";
    else if (!sameAsPrev && sameAsNext) clusterPosition = "first";
    else if (sameAsPrev && !sameAsNext) clusterPosition = "last";

    return { ...msg, clusterPosition, isLastInCluster: !sameAsNext };
  });

function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const lastTypingPingRef = useRef(0);

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const getAuth = () => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) {
      navigate("/login");
      return null;
    }

    return { token, user: JSON.parse(userRaw) };
  };

  const fetchConversations = async (isInitialLoad) => {
    const auth = getAuth();
    if (!auth) return;

    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        if (isInitialLoad) {
          setErrorMsg(data.message || "Failed to load conversations");
        }
        return;
      }

      setConversations(data);

      if (isInitialLoad && data.length > 0) {
        const requestedId = location.state?.conversationId;
        const requestedExists = requestedId && data.some((c) => c.id === requestedId);
        setSelectedId(requestedExists ? requestedId : data[0].id);
      }
    } catch (error) {
      if (isInitialLoad) {
        setErrorMsg("Cannot connect to backend server");
      }
    } finally {
      if (isInitialLoad) {
        setLoadingConversations(false);
      }
    }
  };

  const fetchMessages = async (conversationId) => {
    const auth = getAuth();
    if (!auth || !conversationId) return;

    try {
      const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setMessages(data.messages);
        setOtherTyping(Boolean(data.otherTyping));
      }
    } catch (error) {
      // silent fail on background poll
    }
  };

  const pingTyping = (conversationId) => {
    const auth = getAuth();
    if (!auth || !conversationId) return;

    fetch(`${API_URL}/api/messages/${conversationId}/typing`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${auth.token}` },
    }).catch(() => {
      // typing pings are best-effort
    });
  };

  useEffect(() => {
    const auth = getAuth();
    if (!auth) return;

    setCurrentUser(auth.user);
    fetchConversations(true);

    const conversationsInterval = setInterval(() => {
      fetchConversations(false);
    }, POLL_CONVERSATIONS_MS);

    return () => clearInterval(conversationsInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    fetchMessages(selectedId);

    const messagesInterval = setInterval(() => {
      fetchMessages(selectedId);
    }, POLL_MESSAGES_MS);

    return () => clearInterval(messagesInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const handleDeleteConversation = async (conversationId) => {
    const confirmDelete = window.confirm(
      "Delete this conversation? It will be removed from your inbox."
    );
    if (!confirmDelete) return;

    const auth = getAuth();
    if (!auth) return;

    setDeletingId(conversationId);

    try {
      const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (selectedId === conversationId) {
          setSelectedId(null);
          setMessages([]);
        }
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete conversation");
      }
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setDeletingId(null);
  };

  const sendMessageText = async (text) => {
    if (!text || !selectedId) return;

    const auth = getAuth();
    if (!auth) return;

    setSending(true);

    const tempId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      sender_id: auth.user.id,
      message: text,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`${API_URL}/api/messages/${selectedId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        await fetchMessages(selectedId);
        fetchConversations(false);
      } else {
        const data = await res.json();
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(text);
        alert(data.message || "Failed to send message");
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(text);
      alert("Cannot connect to backend server");
    }

    setSending(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    const text = messageText.trim();
    if (!text) return;

    setMessageText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessageText(text);
  };

  const handleThumbsUp = () => {
    sendMessageText("👍");
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleComposerChange = (e) => {
    setMessageText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;

    if (e.target.value.trim() && selectedId) {
      const now = Date.now();
      if (now - lastTypingPingRef.current > TYPING_PING_THROTTLE_MS) {
        lastTypingPingRef.current = now;
        pingTyping(selectedId);
      }
    }
  };

  const otherPartyName = (conversation) => {
    if (!currentUser || !conversation) return "";
    return currentUser.role === "farmer"
      ? conversation.buyer_name
      : conversation.farmer_name;
  };

  const initials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const filteredConversations = conversations.filter((c) => {
    const search = searchText.toLowerCase();
    return (
      otherPartyName(c)?.toLowerCase().includes(search) ||
      c.livestock_type?.toLowerCase().includes(search) ||
      c.breed?.toLowerCase().includes(search)
    );
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const backLink = currentUser?.role === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard";

  const otherLastReadAt = selectedConversation
    ? currentUser?.role === "farmer"
      ? selectedConversation.buyer_last_read_at
      : selectedConversation.farmer_last_read_at
    : null;

  const lastMessage = messages[messages.length - 1];
  const showSeen = Boolean(
    lastMessage &&
      !lastMessage.pending &&
      lastMessage.sender_id === currentUser?.id &&
      otherLastReadAt &&
      new Date(otherLastReadAt) >= new Date(lastMessage.created_at)
  );

  if (loadingConversations) {
    return <h2 style={{ padding: "30px" }}>Loading messages...</h2>;
  }

  if (errorMsg) {
    return <h2 style={{ padding: "30px", color: "red" }}>{errorMsg}</h2>;
  }

  return (
    <div className="premium-messages-page">
      <div className="messages-page-header">
        <div className="header-left">
          <Link to={backLink} className="back-btn">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <span className="page-tag">MARKETPLACE COMMUNICATION</span>
            <h1>Messages</h1>
            <p>
              Communicate directly with {currentUser?.role === "farmer" ? "buyers" : "farmers"} about
              livestock listings and transactions.
            </p>
          </div>
        </div>
      </div>

      <div className="messages-layout">
        <aside className="chat-sidebar">
          <div className="chat-search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="chat-list">
            {conversations.length === 0 ? (
              <div className="chat-empty-state inline">
                <MessageSquareText size={32} />
                <p>
                  No conversations yet. Messages from{" "}
                  {currentUser?.role === "farmer" ? "buyers" : "farmers"} will show up here.
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="chat-empty">No conversations match "{searchText}".</p>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`chat-person ${conversation.id === selectedId ? "active" : ""}`}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <div className="avatar-wrapper">
                    <div className="avatar">
                      {otherPartyName(conversation)?.charAt(0) || "?"}
                    </div>
                  </div>

                  <div className="chat-person-info">
                    <div className="chat-person-top">
                      <h5>{otherPartyName(conversation)}</h5>
                      <span>{formatConversationTime(conversation.last_time)}</span>
                    </div>

                    <p className={conversation.other_typing ? "typing-preview" : ""}>
                      {conversation.other_typing ? (
                        "Typing..."
                      ) : conversation.last_message ? (
                        <>
                          {conversation.last_sender_id === currentUser?.id && (
                            <span className="last-message-you">You: </span>
                          )}
                          {conversation.last_message}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                    <small>
                      {conversation.livestock_type} • {conversation.breed || "No breed"}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="chat-delete-btn"
                    title="Delete conversation"
                    disabled={deletingId === conversation.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="chat-area">
          {!selectedConversation ? (
            <div className="chat-empty-state">
              <MessagesSquare size={40} />
              <h4>Select a conversation</h4>
              <p>Choose a conversation from the list to view messages.</p>
            </div>
          ) : (
            <>
              <div className="chat-topbar">
                <div className="chat-user-info">
                  <div className="avatar large">
                    {otherPartyName(selectedConversation)?.charAt(0) || "?"}
                  </div>

                  <div>
                    <div className="user-title">
                      <h4>{otherPartyName(selectedConversation)}</h4>
                      {currentUser?.role === "buyer" && (
                        <span
                          className={`verified-badge ${
                            selectedConversation.farmer_is_verified ? "" : "unverified"
                          }`}
                        >
                          <ShieldCheck size={14} />
                          {selectedConversation.farmer_is_verified
                            ? "Verified Farmer"
                            : "Unverified Farmer"}
                        </span>
                      )}
                    </div>

                    <p>
                      {otherTyping
                        ? "Typing..."
                        : `${selectedConversation.livestock_type} • ${
                            selectedConversation.breed || "No breed"
                          }`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty-state inline">
                    <MessageSquareText size={32} />
                    <p>No messages yet. Say hello!</p>
                  </div>
                ) : (
                  groupMessagesByDay(messages).map((group) => (
                    <div className="message-day-group" key={group.dayKey}>
                      <div className="day-divider">
                        <span>{formatDayDivider(group.items[0].created_at)}</span>
                      </div>

                      {clusterMessages(group.items).map((msg) => {
                        const isSent = msg.sender_id === currentUser?.id;

                        return (
                          <div
                            key={msg.id}
                            className={`message ${isSent ? "sent" : "received"} pos-${
                              msg.clusterPosition
                            } ${msg.pending ? "pending" : ""}`}
                          >
                            {!isSent && (
                              <div className="message-avatar-slot">
                                {msg.isLastInCluster && (
                                  <div className="avatar tiny">
                                    {initials(otherPartyName(selectedConversation))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="message-col">
                              {msg.listing_id && (
                                <Link
                                  to="/marketplace"
                                  className={`listing-attachment ${isSent ? "sent" : "received"}`}
                                >
                                  <img
                                    src={msg.listing_image_url || DEFAULT_LISTING_IMAGE}
                                    alt={msg.listing_breed || msg.listing_livestock_type}
                                  />
                                  <div className="listing-attachment-info">
                                    <strong>
                                      {msg.listing_livestock_type}
                                      {msg.listing_breed ? ` • ${msg.listing_breed}` : ""}
                                    </strong>
                                    <span>
                                      {msg.listing_price
                                        ? `₱${Number(msg.listing_price).toLocaleString()}`
                                        : "Price unavailable"}
                                    </span>
                                    {msg.listing_status && msg.listing_status !== "Available" && (
                                      <span className="listing-attachment-status">
                                        {msg.listing_status}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              )}

                              {msg.message && (
                                <div className="message-bubble">
                                  <p>{msg.message}</p>
                                </div>
                              )}

                              {msg.isLastInCluster && (
                                <span className="message-time">
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {otherTyping ? (
                  <div className="message received pos-single typing-row">
                    <div className="message-avatar-slot">
                      <div className="avatar tiny">
                        {initials(otherPartyName(selectedConversation))}
                      </div>
                    </div>
                    <div className="message-col">
                      <div className="message-bubble typing-bubble">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  showSeen && (
                    <div className="seen-indicator">
                      <div className="avatar tiny">
                        {initials(otherPartyName(selectedConversation))}
                      </div>
                      <span>Seen</span>
                    </div>
                  )
                )}

                <div ref={messagesEndRef} />
              </div>

              <form className="message-input-area" onSubmit={handleSend}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={handleComposerChange}
                  onKeyDown={handleComposerKeyDown}
                />

                {messageText.trim() ? (
                  <button className="send-btn" type="submit" disabled={sending}>
                    <Send size={18} />
                  </button>
                ) : (
                  <button
                    className="send-btn thumbs-up-btn"
                    type="button"
                    onClick={handleThumbsUp}
                    disabled={sending}
                    title="Send a thumbs up"
                  >
                    <ThumbsUp size={18} />
                  </button>
                )}
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Messages;
