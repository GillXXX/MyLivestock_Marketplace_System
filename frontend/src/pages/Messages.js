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
  Camera,
  Video,
  Image as ImageIcon,
  X,
  Forward,
  Ban,
  Handshake,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { getProductIcon, formatPrice } from "../utils/productCatalog";
import useGoBack from "../utils/useGoBack";
import BuyNowModal from "../components/BuyNowModal";
import "./Messages.css";

const POLL_MESSAGES_MS = 2000;

// Adds a poll's new messages to the ones on screen and blanks out any that
// were deleted since (deleting changes an older message, which an
// "only newer than" poll wouldn't otherwise bring back). dropId removes the
// optimistic copy of a message once the real one has arrived.
const mergeMessages = (current, incoming, deletedIds = [], dropId = null) => {
  const deleted = new Set(deletedIds);
  const known = new Set(current.map((m) => m.id));

  return [
    ...current
      .filter((m) => m.id !== dropId)
      .map((m) =>
        deleted.has(m.id) && !m.deleted_at
          ? {
              ...m,
              message: null,
              attachment_url: null,
              attachment_type: null,
              listing_id: null,
              deleted_at: new Date().toISOString(),
            }
          : m
      ),
    ...incoming.filter((m) => !known.has(m.id)),
  ];
};
const POLL_CONVERSATIONS_MS = 5000;
const TYPING_PING_THROTTLE_MS = 1500;

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
  const chatMessagesRef = useRef(null);
  const forceScrollRef = useRef(true);
  const textareaRef = useRef(null);
  const lastTypingPingRef = useRef(0);
  // The open conversation and the newest message id loaded for it, so polls
  // only ask for newer messages and a late reply for a conversation that's
  // no longer open is ignored.
  const openConversationRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const cameraPhotoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraMenuRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  // The listing this chat is about plus the buyer's open deal for it (from
  // the messages endpoint), and the listing being proceeded with.
  const [deal, setDeal] = useState(null);
  const [proceedListing, setProceedListing] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [chatFilter, setChatFilter] = useState("all");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardTargetIds, setForwardTargetIds] = useState([]);
  const [forwardSending, setForwardSending] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  // Touch screens have no hover, so tapping a message reveals its
  // forward/delete actions instead (styled on phone only).
  const [actionsMessageId, setActionsMessageId] = useState(null);

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

        // On phones the list and the chat are separate full screens, so
        // auto-opening the first chat would skip the inbox entirely —
        // only jump straight into a chat when one was asked for.
        const isPhone = window.matchMedia("(max-width: 768px)").matches;

        if (requestedExists) {
          setSelectedId(requestedId);
        } else if (!isPhone) {
          setSelectedId(data[0].id);
        }
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

  const fetchMessages = async (conversationId, { dropId } = {}) => {
    const auth = getAuth();
    if (!auth || !conversationId) return;

    const afterId = lastMessageIdRef.current;

    try {
      const res = await fetch(
        `${API_URL}/api/messages/${conversationId}${afterId ? `?after=${afterId}` : ""}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      const data = await res.json();

      // Switched to another conversation (or reloaded it) while this was
      // in flight — its answer no longer applies.
      if (openConversationRef.current !== conversationId || lastMessageIdRef.current !== afterId) {
        return;
      }

      if (res.ok) {
        setMessages((current) =>
          afterId ? mergeMessages(current, data.messages, data.deletedIds, dropId) : data.messages
        );

        if (data.messages.length > 0) {
          lastMessageIdRef.current = Math.max(...data.messages.map((m) => m.id));
        }

        setOtherTyping(Boolean(data.otherTyping));
        setDeal(data.deal || null);
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

    // No polling while the tab is hidden — catch up as soon as it's back.
    const conversationsInterval = setInterval(() => {
      if (!document.hidden) fetchConversations(false);
    }, POLL_CONVERSATIONS_MS);

    const handleVisible = () => {
      if (!document.hidden) fetchConversations(false);
    };
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(conversationsInterval);
      document.removeEventListener("visibilitychange", handleVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // `position: fixed; bottom: 0` (used to pin this page under the
    // sticky VOLT bar) is anchored to the *layout* viewport, which
    // most mobile browsers don't shrink when the on-screen keyboard
    // opens — only the *visual* viewport shrinks. That left the
    // composer sitting behind the keyboard. visualViewport reports the
    // real visible height, so we track it into a CSS variable and size
    // off that instead.
    if (!window.visualViewport) return undefined;

    const updateViewportHeight = () => {
      document.documentElement.style.setProperty(
        "--chat-vvh",
        `${window.visualViewport.height}px`
      );
    };

    updateViewportHeight();
    window.visualViewport.addEventListener("resize", updateViewportHeight);
    return () => window.visualViewport.removeEventListener("resize", updateViewportHeight);
  }, []);

  useEffect(() => {
    clearAttachment();
    setActionsMessageId(null);
    forceScrollRef.current = true;

    openConversationRef.current = selectedId;
    lastMessageIdRef.current = 0;

    if (!selectedId) return;

    fetchMessages(selectedId);

    const messagesInterval = setInterval(() => {
      if (!document.hidden) fetchMessages(selectedId);
    }, POLL_MESSAGES_MS);

    const handleVisible = () => {
      if (!document.hidden) fetchMessages(selectedId);
    };
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(messagesInterval);
      document.removeEventListener("visibilitychange", handleVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    // Opening a conversation (or just sending a message) always jumps to
    // the bottom. Otherwise — e.g. a background poll bringing in a message
    // from the other person — only autoscroll if the reader is already
    // near the bottom, checked fresh right now rather than trusting a
    // scroll-event flag that can go stale mid-touch-scroll on mobile.
    if (forceScrollRef.current) {
      forceScrollRef.current = false;
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }

    const el = chatMessagesRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, otherTyping]);

  useEffect(() => {
    if (!showCameraMenu) return undefined;

    const handleClickOutside = (e) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target)) {
        setShowCameraMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCameraMenu]);

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

  const handleDeleteMessage = async (message) => {
    const confirmDelete = window.confirm("Delete this message for everyone?");
    if (!confirmDelete) return;

    const auth = getAuth();
    if (!auth || !selectedId) return;

    setDeletingMessageId(message.id);

    try {
      const res = await fetch(`${API_URL}/api/messages/${selectedId}/${message.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.ok) {
        await fetchMessages(selectedId);
        fetchConversations(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete message");
      }
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setDeletingMessageId(null);
  };

  const openForwardModal = (message) => {
    setActionsMessageId(null);
    setForwardingMessage(message);
    setForwardTargetIds([]);
  };

  const closeForwardModal = () => {
    setForwardingMessage(null);
    setForwardTargetIds([]);
  };

  const toggleForwardTarget = (conversationId) => {
    setForwardTargetIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForwardSubmit = async () => {
    const auth = getAuth();
    if (!auth || !forwardingMessage || forwardTargetIds.length === 0) return;

    setForwardSending(true);

    try {
      const res = await fetch(
        `${API_URL}/api/messages/${selectedId}/${forwardingMessage.id}/forward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ targetConversationIds: forwardTargetIds }),
        }
      );

      if (res.ok) {
        closeForwardModal();
        fetchConversations(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to forward message");
      }
    } catch (error) {
      alert("Cannot connect to backend server");
    }

    setForwardSending(false);
  };

  const sendMessageText = async (text, file) => {
    if (!text && !file) return;
    if (!selectedId) return;

    const auth = getAuth();
    if (!auth) return;

    setSending(true);

    const tempId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      sender_id: auth.user.id,
      message: text || null,
      attachment_url: file ? URL.createObjectURL(file) : null,
      attachment_type: file ? (file.type.startsWith("video/") ? "video" : "image") : null,
      created_at: new Date().toISOString(),
      pending: true,
    };

    forceScrollRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let res;

      if (file) {
        const formData = new FormData();
        if (text) formData.append("message", text);
        formData.append("attachment", file);

        res = await fetch(`${API_URL}/api/messages/${selectedId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
          body: formData,
        });
      } else {
        res = await fetch(`${API_URL}/api/messages/${selectedId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ message: text }),
        });
      }

      if (res.ok) {
        await fetchMessages(selectedId, { dropId: tempId });
        // A poll that started before the send may have been discarded;
        // either way the optimistic copy has served its purpose.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
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

    if (optimisticMessage.attachment_url) {
      URL.revokeObjectURL(optimisticMessage.attachment_url);
    }

    setSending(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    const text = messageText.trim();
    const file = attachmentFile;
    if (!text && !file) return;

    setMessageText("");
    clearAttachment();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessageText(text, file);
  };

  const handleThumbsUp = () => {
    sendMessageText("👍");
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }

    setAttachmentFile(file);
    setAttachmentPreviewUrl(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    setAttachmentFile(null);
    setAttachmentPreviewUrl(null);
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

  const attachmentPreviewLabel = (attachmentType) =>
    attachmentType === "video" ? "🎥 Video" : "📷 Photo";

  const otherPartyName = (conversation) => {
    if (!currentUser || !conversation) return "";
    return currentUser.role === "farmer"
      ? conversation.buyer_name
      : conversation.farmer_name;
  };

  const isConversationUnread = (conversation) => {
    if (!currentUser) return false;

    const myLastReadAt =
      currentUser.role === "farmer"
        ? conversation.farmer_last_read_at
        : conversation.buyer_last_read_at;

    return Boolean(
      conversation.last_sender_id &&
        conversation.last_sender_id !== currentUser.id &&
        (!myLastReadAt || new Date(conversation.last_time) > new Date(myLastReadAt))
    );
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
    const matchesSearch =
      otherPartyName(c)?.toLowerCase().includes(search) ||
      c.livestock_type?.toLowerCase().includes(search) ||
      c.breed?.toLowerCase().includes(search);

    const matchesFilter = chatFilter === "all" || isConversationUnread(c);

    return matchesSearch && matchesFilter;
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const backLink = currentUser?.role === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard";

  // "Proceed to Negotiation" sits under the buyer's latest message about
  // this chat's listing (their inquiry) — the buyer decides when they're
  // happy with the product and starts the deal themselves.
  const dealAnchorId =
    currentUser?.role === "buyer" && deal && deal.id
      ? [...messages]
          .reverse()
          .find(
            (m) =>
              m.sender_id === currentUser.id &&
              m.listing_id === deal.id &&
              !m.deleted_at &&
              !m.pending
          )?.id
      : null;
  const goBack = useGoBack(backLink);

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
          <button type="button" className="back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>

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

      <div className={`messages-layout ${selectedId ? "mobile-chat-open" : ""}`}>
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

          <div className="chat-filters">
            <button
              type="button"
              className={chatFilter === "all" ? "active" : ""}
              onClick={() => setChatFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={chatFilter === "unread" ? "active" : ""}
              onClick={() => setChatFilter("unread")}
            >
              Unread
            </button>
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
              <p className="chat-empty">
                {chatFilter === "unread"
                  ? "No unread conversations."
                  : `No conversations match "${searchText}".`}
              </p>
            ) : (
              filteredConversations.map((conversation) => {
                const unread = isConversationUnread(conversation);

                return (
                <div
                  key={conversation.id}
                  className={`chat-person ${conversation.id === selectedId ? "active" : ""}`}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <div className="avatar-wrapper">
                    <div className="chat-avatar">
                      {otherPartyName(conversation)?.charAt(0) || "?"}
                    </div>
                    {unread && <span className="unread-dot"></span>}
                  </div>

                  <div className="chat-person-info">
                    <div className="chat-person-top">
                      <h5>{otherPartyName(conversation)}</h5>
                      <span>{formatConversationTime(conversation.last_time)}</span>
                    </div>

                    <p
                      className={`${conversation.other_typing ? "typing-preview" : ""} ${
                        unread ? "unread-text" : ""
                      }`}
                    >
                      {conversation.other_typing ? (
                        "Typing..."
                      ) : conversation.last_deleted_at ? (
                        <em>Message removed</em>
                      ) : conversation.last_message || conversation.last_attachment_type ? (
                        <>
                          {conversation.last_sender_id === currentUser?.id && (
                            <span className="last-message-you">You: </span>
                          )}
                          {conversation.last_message ||
                            attachmentPreviewLabel(conversation.last_attachment_type)}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                    <small>
                      {conversation.livestock_type}
                          {conversation.breed ? ` • ${conversation.breed}` : ""}
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
                );
              })
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
                  <button
                    type="button"
                    className="chat-back-to-list-btn"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="chat-avatar large">
                    {otherPartyName(selectedConversation)?.charAt(0) || "?"}
                  </div>

                  <div>
                    <div className="user-title">
                      <h4>{otherPartyName(selectedConversation)}</h4>
                      {currentUser?.role === "buyer" && (
                        <span
                          className={`chat-verified-badge ${
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
                        : selectedConversation.breed
                        ? `${selectedConversation.livestock_type} • ${selectedConversation.breed}`
                        : selectedConversation.livestock_type}
                    </p>
                  </div>
                </div>

                {/* Phone-only: the list's hover-revealed trash button can't
                    be reached on touch, so deleting lives in the chat header. */}
                <button
                  type="button"
                  className="chat-topbar-delete"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                  disabled={deletingId === selectedConversation.id}
                  onClick={() => handleDeleteConversation(selectedConversation.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="chat-messages" ref={chatMessagesRef}>
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
                        const ListingIcon = getProductIcon(msg.listing_livestock_type, msg.listing_category);
                        const hasActions = !msg.pending && !msg.deleted_at;

                        return (
                          <div
                            key={msg.id}
                            className={`message ${isSent ? "sent" : "received"} pos-${
                              msg.clusterPosition
                            } ${msg.pending ? "pending" : ""} ${
                              actionsMessageId === msg.id ? "actions-open" : ""
                            }`}
                          >
                            {!isSent && (
                              <div className="message-avatar-slot">
                                {msg.isLastInCluster && (
                                  <div className="chat-avatar tiny">
                                    {initials(otherPartyName(selectedConversation))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div
                              className="message-col"
                              onClick={
                                hasActions
                                  ? (e) => {
                                      if (e.target.closest("a, button, video")) return;
                                      setActionsMessageId((id) =>
                                        id === msg.id ? null : msg.id
                                      );
                                    }
                                  : undefined
                              }
                            >
                              {msg.deleted_at ? (
                                <div className="message-bubble deleted">
                                  <Ban size={13} />
                                  <p>{isSent ? "You removed a message" : "This message was removed"}</p>
                                </div>
                              ) : (
                                <>
                                  {!msg.pending && (
                                    <div className="message-hover-actions">
                                      <button
                                        type="button"
                                        title="Forward"
                                        onClick={() => openForwardModal(msg)}
                                      >
                                        <Forward size={14} />
                                      </button>
                                      {isSent && (
                                        <button
                                          type="button"
                                          title="Delete"
                                          disabled={deletingMessageId === msg.id}
                                          onClick={() => handleDeleteMessage(msg)}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {msg.listing_id && (
                                    <Link
                                      to={currentUser?.role === "farmer" ? "/listings" : "/marketplace"}
                                      className={`listing-attachment ${isSent ? "sent" : "received"}`}
                                    >
                                      {msg.listing_image_url ? (
                                        <img
                                          src={msg.listing_image_url}
                                          alt={msg.listing_breed || msg.listing_livestock_type}
                                        />
                                      ) : (
                                        <div className="listing-attachment-fallback">
                                          <ListingIcon size={22} />
                                        </div>
                                      )}
                                      <div className="listing-attachment-info">
                                        <strong>
                                          {msg.listing_livestock_type}
                                          {msg.listing_breed ? ` • ${msg.listing_breed}` : ""}
                                        </strong>
                                        <span>
                                          {msg.listing_price
                                            ? formatPrice(msg.listing_price, msg.listing_unit)
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

                                  {msg.id === dealAnchorId &&
                                    (deal.open_transaction_id ? (
                                      <Link
                                        to="/buyer-transactions"
                                        state={{ transactionId: deal.open_transaction_id }}
                                        className="deal-prompt deal-prompt-status"
                                      >
                                        <Handshake size={15} />
                                        {deal.open_transaction_step} in progress · View deal
                                      </Link>
                                    ) : deal.status === "Available" && Number(deal.quantity) > 0 ? (
                                      <button
                                        type="button"
                                        className="deal-prompt deal-prompt-btn"
                                        onClick={() => setProceedListing(deal)}
                                      >
                                        <Handshake size={15} />
                                        Proceed to Negotiation
                                      </button>
                                    ) : null)}

                                  {msg.attachment_url && (
                                    <div className="message-media">
                                      {msg.attachment_type === "video" ? (
                                        <video src={msg.attachment_url} controls />
                                      ) : (
                                        <img src={msg.attachment_url} alt="Attachment" />
                                      )}
                                    </div>
                                  )}

                                  {msg.message && (
                                    <div className="message-bubble">
                                      <p>{msg.message}</p>
                                    </div>
                                  )}
                                </>
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
                      <div className="chat-avatar tiny">
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
                      <div className="chat-avatar tiny">
                        {initials(otherPartyName(selectedConversation))}
                      </div>
                      <span>Seen</span>
                    </div>
                  )
                )}

                <div ref={messagesEndRef} />
              </div>

              {attachmentPreviewUrl && (
                <div className="attachment-preview-bar">
                  <div className="attachment-preview-thumb">
                    {attachmentFile?.type.startsWith("video/") ? (
                      <video src={attachmentPreviewUrl} />
                    ) : (
                      <img src={attachmentPreviewUrl} alt="Attachment preview" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    onClick={clearAttachment}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form className="message-input-area" onSubmit={handleSend}>
                <input
                  ref={cameraPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="visually-hidden"
                  onChange={handleAttachmentChange}
                />

                <input
                  ref={cameraVideoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="visually-hidden"
                  onChange={handleAttachmentChange}
                />

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="visually-hidden"
                  onChange={handleAttachmentChange}
                />

                <div className="chat-camera-btn-wrap" ref={cameraMenuRef}>
                  <button
                    type="button"
                    className="attachment-btn chat-camera-btn"
                    onClick={() => setShowCameraMenu((open) => !open)}
                    disabled={sending}
                    title="Take a photo or video"
                  >
                    <Camera size={20} />
                  </button>

                  {showCameraMenu && (
                    <div className="camera-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCameraMenu(false);
                          cameraPhotoInputRef.current?.click();
                        }}
                      >
                        <Camera size={16} />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCameraMenu(false);
                          cameraVideoInputRef.current?.click();
                        }}
                      >
                        <Video size={16} />
                        Record Video
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCameraMenu(false);
                          galleryInputRef.current?.click();
                        }}
                      >
                        <ImageIcon size={16} />
                        Choose from Gallery
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={handleComposerChange}
                  onKeyDown={handleComposerKeyDown}
                />

                {messageText.trim() || attachmentFile ? (
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

      {forwardingMessage && (
        <div className="forward-modal-overlay" onClick={closeForwardModal}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="forward-modal-close"
              onClick={closeForwardModal}
            >
              <X size={18} />
            </button>

            <h3>Forward message</h3>

            <div className="forward-modal-preview">
              {forwardingMessage.attachment_url &&
                (forwardingMessage.attachment_type === "video" ? (
                  <video src={forwardingMessage.attachment_url} />
                ) : (
                  <img src={forwardingMessage.attachment_url} alt="Attachment" />
                ))}
              {forwardingMessage.message && <p>{forwardingMessage.message}</p>}
            </div>

            <div className="forward-modal-list">
              {conversations.filter((c) => c.id !== selectedId).length === 0 ? (
                <p className="forward-modal-empty">No other conversations to forward to.</p>
              ) : (
                conversations
                  .filter((c) => c.id !== selectedId)
                  .map((conversation) => (
                    <label key={conversation.id} className="forward-modal-item">
                      <input
                        type="checkbox"
                        checked={forwardTargetIds.includes(conversation.id)}
                        onChange={() => toggleForwardTarget(conversation.id)}
                      />
                      <div className="chat-avatar small">
                        {otherPartyName(conversation)?.charAt(0) || "?"}
                      </div>
                      <div>
                        <strong>{otherPartyName(conversation)}</strong>
                        <span>
                          {conversation.livestock_type}
                          {conversation.breed ? ` • ${conversation.breed}` : ""}
                        </span>
                      </div>
                    </label>
                  ))
              )}
            </div>

            <button
              type="button"
              className="forward-modal-submit"
              disabled={forwardTargetIds.length === 0 || forwardSending}
              onClick={handleForwardSubmit}
            >
              <Forward size={16} />
              {forwardSending ? "Forwarding..." : "Forward"}
            </button>
          </div>
        </div>
      )}

      {proceedListing && (
        <BuyNowModal
          listing={proceedListing}
          title="Proceed to Negotiation"
          onClose={() => setProceedListing(null)}
          onStarted={() => fetchMessages(selectedId)}
        />
      )}
    </div>
  );
}

export default Messages;
