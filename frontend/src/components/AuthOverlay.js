function AuthOverlay({
  googleClientId,
  authLoading,
  authError,
  devUsername,
  setDevUsername,
  handleDevLogin
}) {
  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="fa-solid fa-robot"></i>
        </div>
        <h1 className="auth-title">RAG WebChat</h1>
        <p className="auth-subtitle">
          Enter any webpage URL and start asking questions. Sign in below to save and recall your conversation history.
        </p>
        
        {authError && <div className="env-warning">{authError}</div>}
        
        {/* Google Sign-in button wrapper */}
        {googleClientId ? (
          <div className="sidebar-section" style={{ width: "100%", alignItems: "center" }}>
            <span className="sidebar-label">Sign In with Google</span>
            <div id="googleBtnDiv" className="google-btn-container"></div>
          </div>
        ) : (
          <div className="env-warning" style={{ color: "hsl(215, 20%, 65%)", border: "1px dashed var(--border-color)", backgroundColor: "transparent" }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: "6px" }}></i>
            Google Client ID is not configured in <code>.env</code>. You can configure it to enable standard Google Sign-In, or use the developer login below.
          </div>
        )}

        <div className="divider-row">
          <div className="divider-line"></div>
          <span>Or</span>
          <div className="divider-line"></div>
        </div>

        {/* Developer Bypass Login Form */}
        <form onSubmit={handleDevLogin} className="dev-login-form">
          <input
            type="text"
            placeholder="Enter username (e.g. guest)"
            className="input-field"
            value={devUsername}
            onChange={(e) => setDevUsername(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-secondary" style={{ width: "100%" }} disabled={authLoading}>
            {authLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Logging in...
              </>
            ) : (
              <>
                <i className="fa-solid fa-code"></i>
                Continue as Developer
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
