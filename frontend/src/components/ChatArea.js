function ChatArea({
  activeUrl,
  chatHistory,
  chatLoading,
  inputMessage,
  setInputMessage,
  indexStatus,
  handleSendMessage,
  handleClearChat,
  messagesEndRef
}) {
  return (
    <main className="chat-container">
      <header className="chat-header">
        <div className="chat-header-info">
          <h2 className="chat-header-title">Conversational Web RAG Chat</h2>
          {activeUrl && (
            <p className="chat-header-subtitle">
              Active URL: <a href={activeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>{activeUrl}</a>
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {activeUrl && (
            <button onClick={handleClearChat} className="btn btn-secondary" style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px" }}>
              <i className="fa-solid fa-eraser" style={{ marginRight: "4px" }}></i>
              Clear Log
            </button>
          )}
          <div style={{ fontSize: "13px", color: "var(--text-muted)", borderLeft: "1px solid var(--border-color)", paddingLeft: "12px" }}>
            Powered by OpenAI GPT
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fa-solid fa-comments"></i>
            </div>
            <h3 className="empty-title">
              {activeUrl ? "No conversation history" : "Explore Web Content"}
            </h3>
            <p className="empty-text">
              {activeUrl 
                ? "Start asking questions about this webpage using the input bar below."
                : "Load a website URL in the sidebar to index its text and trigger the AI RAG retriever."
              }
            </p>
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div key={index} className={`message-row ${msg.role}`}>
              <div className="avatar">
                {msg.role === "user" ? (
                  <i className="fa-solid fa-user"></i>
                ) : (
                  <i className="fa-solid fa-brain"></i>
                )}
              </div>
              <div className="message-bubble">
                {msg.content}
              </div>
            </div>
          ))
        )}

        {chatLoading && (
          <div className="message-row assistant">
            <div className="avatar">
              <i className="fa-solid fa-brain"></i>
            </div>
            <div className="message-bubble" style={{ minWidth: "80px" }}>
              <div className="thinking-dots">
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="chat-input-panel">
        <form onSubmit={handleSendMessage} className="chat-input-wrapper">
          <input
            type="text"
            placeholder={indexStatus === "ready" 
              ? "Ask a question about the indexed webpage..." 
              : "Please load a webpage first..."
            }
            className="chat-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={indexStatus !== "ready" || chatLoading}
            required
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={indexStatus !== "ready" || !inputMessage.trim() || chatLoading}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        <div className="footer-note">
          AI retrieves facts dynamically from the loaded page context. Clear logs or switch URLs as needed.
        </div>
      </div>
    </main>
  );
}
