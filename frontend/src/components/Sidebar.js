function Sidebar({
  urlInput,
  setUrlInput,
  indexStatus,
  statusMsg,
  indexedUrls,
  activeUrl,
  user,
  handleIndexUrl,
  selectActiveUrl,
  handleLogout,
  handleClearChat
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <i className="fa-solid fa-robot"></i>
        </div>
        <span className="brand-title">RAG WebChat</span>
      </div>

      {/* URL Indexing Form */}
      <div className="sidebar-section">
        <span className="sidebar-label">Load New Page</span>
        <form onSubmit={handleIndexUrl} className="card">
          <input
            type="url"
            placeholder="https://example.com"
            className="input-field"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn"
            disabled={indexStatus === "loading"}
          >
            {indexStatus === "loading" ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Indexing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-down"></i>
                Load WebPage
              </>
            )}
          </button>
        </form>
      </div>

      {/* Conversation History List */}
      {indexedUrls.length > 0 && (
        <div className="sidebar-section">
          <span className="sidebar-label">Saved Conversations</span>
          <div className="history-list">
            {indexedUrls.map((item, idx) => (
              <button
                key={idx}
                onClick={() => selectActiveUrl(item.url)}
                className={`history-item ${activeUrl === item.url ? "active" : ""}`}
              >
                <i className="fa-solid fa-comments history-icon"></i>
                <span className="history-text" title={item.url}>{item.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active URL Status */}
      <div className="sidebar-section">
        <span className="sidebar-label">Active Status</span>
        <div className="card">
          <div className="status-badge">
            <div className={`status-dot ${indexStatus}`}></div>
            <span>
              {indexStatus === "idle" && "Idle"}
              {indexStatus === "loading" && "Indexing..."}
              {indexStatus === "ready" && "Ready"}
              {indexStatus === "error" && "Error"}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {statusMsg}
          </div>
        </div>
      </div>

      {/* Profile Bar & Sign Out */}
      <div className="user-profile">
        <img
          src={user.picture || "https://www.gravatar.com/avatar/?d=mp"}
          alt={user.name}
          className="user-avatar"
        />
        <div className="user-details">
          <span className="user-name">{user.name}</span>
          <span className="user-email">{user.email}</span>
        </div>
        <button onClick={handleLogout} className="logout-btn" title="Sign Out">
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>
  );
}
