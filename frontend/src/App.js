const { useState, useEffect, useRef } = React;

function App() {
  // Auth & Configuration States
  const [googleClientId, setGoogleClientId] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("rag_token") || "");
  const [user, setUser] = useState(null);
  const [indexedUrls, setIndexedUrls] = useState([]);
  const [devUsername, setDevUsername] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // App Core States
  const [activeUrl, setActiveUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [indexStatus, setIndexStatus] = useState("idle"); // idle, loading, ready, error
  const [statusMsg, setStatusMsg] = useState("Load a website to start chatting");
  const [chatHistory, setChatHistory] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch config client ID on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      } catch (e) {
        console.error("Failed to load Google client configuration", e);
      }
    };
    fetchConfig();
  }, []);

  // If token is available, login on startup
  useEffect(() => {
    if (token) {
      authenticateWithToken(token);
    }
  }, [token]);

  // Initialize Google Identity Button when Client ID is loaded and user is not logged in
  useEffect(() => {
    if (!googleClientId || token) return;

    let interval;
    const initializeGoogleBtn = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          const btnDiv = document.getElementById("googleBtnDiv");
          if (btnDiv) {
            window.google.accounts.id.renderButton(
              btnDiv,
              { theme: "outline", size: "large", width: "300" }
            );
            if (interval) clearInterval(interval);
          }
        } catch (err) {
          console.error("Google One Tap failed to initialize", err);
        }
      }
    };

    // Try immediately
    initializeGoogleBtn();

    // Set up polling in case the script is still loading
    interval = setInterval(initializeGoogleBtn, 100);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [googleClientId, token]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Authentication Helper
  const authenticateWithToken = async (tokenStr) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${tokenStr}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(tokenStr);
        localStorage.setItem("rag_token", tokenStr);
        setIndexedUrls(data.urls);
        
        // Auto-select latest indexed URL if available
        if (data.urls && data.urls.length > 0) {
          selectActiveUrl(data.urls[0].url, tokenStr);
        }
      } else {
        handleLogout();
        setAuthError(data.detail || "Authentication session expired.");
      }
    } catch (err) {
      setAuthError("Failed to communicate with authentication server.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleCredentialResponse = (response) => {
    if (response.credential) {
      authenticateWithToken(response.credential);
    }
  };

  const handleDevLogin = (e) => {
    e.preventDefault();
    const username = devUsername.trim().toLowerCase();
    if (!username) return;
    
    const mockToken = `mock_token_${username}`;
    authenticateWithToken(mockToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("rag_token");
    setIndexedUrls([]);
    setActiveUrl("");
    setChatHistory([]);
    setIndexStatus("idle");
    setStatusMsg("Load a website to start chatting");
  };

  // Select and Load URL Chat History
  const selectActiveUrl = async (url, customToken = token) => {
    setActiveUrl(url);
    setUrlInput(url);
    setIndexStatus("loading");
    setStatusMsg("Re-indexing/Fetching website content...");
    
    try {
      const indexRes = await fetch("/api/index", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${customToken}`
        },
        body: JSON.stringify({ url })
      });
      
      if (indexRes.ok) {
        setIndexStatus("ready");
        setStatusMsg("Website successfully loaded!");
        
        const histRes = await fetch("/api/history", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customToken}`
          },
          body: JSON.stringify({ url })
        });
        const histData = await histRes.json();
        
        if (histRes.ok) {
          setChatHistory(histData.history || []);
        }
      } else {
        setIndexStatus("error");
        setStatusMsg("Could not index the site context.");
      }
    } catch (e) {
      setIndexStatus("error");
      setStatusMsg("Server connection lost while checking status.");
    }
  };

  // Index a New WebPage URL
  const handleIndexUrl = async (e) => {
    e.preventDefault();
    const urlToParse = urlInput.trim();
    if (!urlToParse) return;

    setIndexStatus("loading");
    setStatusMsg("Downloading and indexing website content...");

    try {
      const response = await fetch("/api/index", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url: urlToParse })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIndexStatus("ready");
        setActiveUrl(urlToParse);
        setStatusMsg("Website successfully indexed!");
        setIndexedUrls(data.urls);
        
        const histRes = await fetch("/api/history", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ url: urlToParse })
        });
        const histData = await histRes.json();
        
        if (histRes.ok) {
          setChatHistory(histData.history || []);
        }
      } else {
        setIndexStatus("error");
        setStatusMsg(data.detail || "Error indexing website");
      }
    } catch (err) {
      setIndexStatus("error");
      setStatusMsg("Failed to connect to backend server");
    }
  };

  // Send chat queries
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const msg = inputMessage.trim();
    if (!msg || chatLoading || indexStatus !== "ready" || !activeUrl) return;

    const updatedHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(updatedHistory);
    setInputMessage("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: msg,
          url: activeUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        setChatHistory(data.history);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${data.detail || "Unable to retrieve response."}` }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please verify the backend is running." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Clear chat
  const handleClearChat = async () => {
    if (!activeUrl) return;
    try {
      const res = await fetch("/api/clear", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url: activeUrl })
      });
      if (res.ok) {
        setChatHistory([]);
      }
    } catch (e) {
      console.error("Failed to clear chat log", e);
    }
  };

  if (!user) {
    return (
      <AuthOverlay
        googleClientId={googleClientId}
        authLoading={authLoading}
        authError={authError}
        devUsername={devUsername}
        setDevUsername={setDevUsername}
        handleDevLogin={handleDevLogin}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        indexStatus={indexStatus}
        statusMsg={statusMsg}
        indexedUrls={indexedUrls}
        activeUrl={activeUrl}
        user={user}
        handleIndexUrl={handleIndexUrl}
        selectActiveUrl={selectActiveUrl}
        handleLogout={handleLogout}
        handleClearChat={handleClearChat}
      />
      <ChatArea
        activeUrl={activeUrl}
        chatHistory={chatHistory}
        chatLoading={chatLoading}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        indexStatus={indexStatus}
        handleSendMessage={handleSendMessage}
        handleClearChat={handleClearChat}
        messagesEndRef={messagesEndRef}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
