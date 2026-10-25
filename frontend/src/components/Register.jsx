import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TerminalBar from "./TerminalBar";
import { SplitFlapText } from "./SplitFlap";
import { terminalAudio } from "../utils/audio";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    user_type: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    terminalAudio.playBeep(750, 0.08);

    const result = await register(formData);

    if (result.success) {
      terminalAudio.playGranted();
      alert("Registration successful! Please sign in with your credentials.");
      navigate("/login");
    } else {
      terminalAudio.playAlert();
      setError(result.error);
    }

    setLoading(false);
  };

  const fullName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim();

  return (
    <div className="aero-terminal-page">
      <TerminalBar />

      <main className="landing-auth-grid">
        {/* CARD 1 (LEFT): LIVE GENERATED ACCESS PASS */}
        <section className="terminal-panel card-access-panel">
          <div className="panel-header">
            <span className="panel-screws top-left"></span>
            <span className="panel-screws top-right"></span>
            <h3 className="panel-title">NEW PASSENGER CARD</h3>
          </div>

          <div className="panel-body">
            <div className="access-card-badge">
              <div className="badge-header">
                <span className="badge-chip"></span>
                <span className="badge-title">BOARDING PASS</span>
                <span className="badge-holo">NEW</span>
              </div>

              <div className="badge-user-preview">
                <div className="badge-avatar">
                  <span>👤</span>
                </div>
                <div className="badge-meta">
                  <div className="badge-meta-label">NAME:</div>
                  <div className="badge-meta-val">
                    {fullName.toUpperCase() || "NAME SURNAME"}
                  </div>
                  <div className="badge-meta-sub">
                    CALLSIGN: @{formData.username ? formData.username.toUpperCase() : "AGENT"}
                  </div>
                  <div className="badge-meta-sub">
                    ROLE: {formData.user_type.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="badge-magnetic-stripe">
                <span className="stripe-code">||| | |||| | ||| ||||| ||</span>
              </div>
            </div>

            <div className="panel-quick-actions">
              <span className="quick-title">CREDENTIAL DISPATCH</span>
              <p className="access-instruction">
                Complete enrollment below. Your encrypted travel card will be registered in the air traffic manifest.
              </p>
            </div>
          </div>
        </section>

        {/* CARD 2 (CENTER): REGISTRATION TERMINAL WINDOW */}
        <section className="terminal-panel card-terminal-window">
          <div className="window-header-bar">
            <div className="window-title-left">
              <span className="plane-icon">✈</span>
              <span className="window-title">PASSENGER ENROLLMENT</span>
            </div>
            <div className="window-controls">
              <span className="ctrl-btn ctrl-min">_</span>
              <span className="ctrl-btn ctrl-max">□</span>
              <span className="ctrl-btn ctrl-close">✕</span>
            </div>
          </div>

          <div className="window-screen-body">
            <div className="crt-terminal-header">
              <div className="welcome-text">CREATE MANIFEST IDENTITY</div>
              <div className="access-text">SYSTEM CLEARANCE LEVEL 1</div>
              <div className="retro-plane-radar">
                <span className="radar-plane plane-left">✈</span>
                <span className="radar-track">────────</span>
                <span className="radar-plane plane-mid">✈</span>
                <span className="radar-track">────────</span>
                <span className="radar-plane plane-right">✈</span>
              </div>
            </div>

            {error && (
              <div className="terminal-alert-box">
                <span className="alert-icon">⚠</span>
                <span className="alert-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="retro-form">
              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label htmlFor="first_name" className="terminal-label">
                    FIRST NAME <span className="blinking-cursor">|</span>
                  </label>
                  <div className="terminal-input-wrap">
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      className="terminal-input"
                      placeholder="FIRST NAME"
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="terminal-input-group">
                  <label htmlFor="last_name" className="terminal-label">
                    LAST NAME <span className="blinking-cursor">|</span>
                  </label>
                  <div className="terminal-input-wrap">
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      className="terminal-input"
                      placeholder="LAST NAME"
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label htmlFor="reg_username" className="terminal-label">
                    USERNAME <span className="glyph-sparkle">✦</span>
                  </label>
                  <div className="terminal-input-wrap">
                    <input
                      id="reg_username"
                      name="username"
                      type="text"
                      required
                      className="terminal-input"
                      placeholder="USERNAME"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="terminal-input-group">
                  <label htmlFor="phone_number" className="terminal-label">
                    PHONE NUMBER
                  </label>
                  <div className="terminal-input-wrap">
                    <input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      required
                      className="terminal-input"
                      placeholder="+1 555-0199"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="terminal-input-group">
                <label htmlFor="email" className="terminal-label">
                  EMAIL ADDRESS
                </label>
                <div className="terminal-input-wrap">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="terminal-input"
                    placeholder="USER@FLIGHTBOOK.COM"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label htmlFor="reg_password" className="terminal-label">
                    PASSCODE <span className="glyph-sparkle">✦</span>
                  </label>
                  <div className="terminal-input-wrap">
                    <input
                      id="reg_password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="terminal-input"
                      placeholder="ENTER PASSCODE"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="retro-eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? "👁" : "👁‍🗨"}
                    </button>
                  </div>
                </div>

                <div className="terminal-input-group">
                  <label htmlFor="user_type" className="terminal-label">
                    ROLE CLEARANCE
                  </label>
                  <div className="terminal-input-wrap select-wrap">
                    <select
                      id="user_type"
                      name="user_type"
                      value={formData.user_type}
                      onChange={handleChange}
                      className="terminal-input terminal-select"
                    >
                      <option value="user">PASSENGER</option>
                      <option value="admin">OPERATOR / ADMIN</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="terminal-button-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="retro-btn btn-signin"
                >
                  {loading ? (
                    <span className="btn-loading">INITIALIZING...</span>
                  ) : (
                    <>
                      ENROLL <span className="btn-arrow">➔</span>
                    </>
                  )}
                </button>

                <Link
                  to="/login"
                  className="retro-btn btn-arcade-insert"
                  onClick={() => terminalAudio.playBeep(440, 0.08)}
                >
                  SIGN IN
                </Link>
              </div>
            </form>
          </div>
        </section>

        {/* CARD 3 (RIGHT): GLOBAL AIRPORT MANIFEST PREVIEW */}
        <section className="terminal-panel card-route-panel">
          <div className="panel-header">
            <span className="panel-screws top-left"></span>
            <span className="panel-screws top-right"></span>
            <h3 className="panel-title">SYSTEM PROTOCOL</h3>
          </div>

          <div className="panel-body">
            <div className="split-flap-route-card">
              <div className="route-row">
                <span className="route-row-label">JOIN:</span>
                <div className="flap-box">
                  <SplitFlapText text="AERO" length={4} color="amber" align="center" />
                </div>
              </div>

              <div className="route-divider-indicator">
                <span className="route-plane-vector">✈</span>
                <span className="route-dash">────────────</span>
              </div>

              <div className="route-row">
                <span className="route-row-label">FLEET:</span>
                <div className="flap-box">
                  <SplitFlapText text="GLOBAL" length={6} color="ivory" align="center" />
                </div>
              </div>
            </div>

            <div className="panel-status-footer">
              <div className="footer-status-tag">
                <span className="beacon-led pulse-green"></span>
                <span className="status-label">REGISTRATION: ACTIVE</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="aero-bottom-hazard-bar">
        <div className="hazard-tape"></div>
        <div className="hazard-bar-status">
          <span className="status-item">
            <span className="beacon-led pulse-green"></span> SYS_STATUS: ONLINE
          </span>
          <span className="status-item">ENCRYPTED CREDENTIAL REGISTRATION</span>
        </div>
      </footer>
    </div>
  );
};

export default Register;
