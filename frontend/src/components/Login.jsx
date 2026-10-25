import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TerminalBar from "./TerminalBar";
import { SplitFlapText } from "./SplitFlap";
import { terminalAudio } from "../utils/audio";
import axios from "axios";

const DEMO_ROUTES = [
  { from: "NYC", to: "LND" },
  { from: "MP", to: "DEH" },
  { from: "SFO", to: "TYO" },
  { from: "DXB", to: "CDG" },
];

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [availableRoutes, setAvailableRoutes] = useState(DEMO_ROUTES);

  const { login, API_BASE } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Try to load real cities from API to show real routes on the right flap display
    const loadCities = async () => {
      try {
        const res = await axios.get(`${API_BASE}/cities`);
        if (res.data?.sources?.length && res.data?.destinations?.length) {
          const dynamicRoutes = [];
          for (let s of res.data.sources) {
            for (let d of res.data.destinations) {
              dynamicRoutes.push({
                from: s.toUpperCase().slice(0, 3),
                to: d.toUpperCase().slice(0, 3),
              });
            }
          }
          if (dynamicRoutes.length > 0) {
            setAvailableRoutes([...dynamicRoutes, ...DEMO_ROUTES]);
          }
        }
      } catch (e) {
        // Fallback to DEMO_ROUTES
      }
    };
    loadCities();
  }, [API_BASE]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextRoute = () => {
    terminalAudio.playFlapClick();
    setRouteIndex((prev) => (prev + 1) % availableRoutes.length);
  };

  const handlePrevRoute = () => {
    terminalAudio.playFlapClick();
    setRouteIndex(
      (prev) => (prev - 1 + availableRoutes.length) % availableRoutes.length
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    terminalAudio.playBeep(700, 0.08);

    const result = await login(formData.username, formData.password);

    if (result.success) {
      terminalAudio.playGranted();
      const user = JSON.parse(localStorage.getItem("user"));
      navigate(user.user_type === "admin" ? "/admin" : "/user");
    } else {
      terminalAudio.playAlert();
      setError(result.error);
    }

    setLoading(false);
  };

  const currentRoute = availableRoutes[routeIndex] || DEMO_ROUTES[0];

  return (
    <div className="aero-terminal-page">
      <TerminalBar />

      <main className="landing-auth-grid">
        {/* CARD 1 (LEFT): USER SIGN IN & ACCESS CARD */}
        <section className="terminal-panel card-access-panel">
          <div className="panel-header">
            <span className="panel-screws top-left"></span>
            <span className="panel-screws top-right"></span>
            <h3 className="panel-title">USER SIGN IN</h3>
          </div>

          <div className="panel-body">
            <div className="access-card-badge">
              <div className="badge-header">
                <span className="badge-chip"></span>
                <span className="badge-title">ACCESS CARD</span>
                <span className="badge-holo">PASS</span>
              </div>

              <div className="badge-user-preview">
                <div className="badge-avatar">
                  <span>✈</span>
                </div>
                <div className="badge-meta">
                  <div className="badge-meta-label">ID CODE:</div>
                  <div className="badge-meta-val">
                    {formData.username ? formData.username.toUpperCase() : "FLIGHT-GUEST"}
                  </div>
                  <div className="badge-meta-sub">LEVEL: PASSENGER / CREW</div>
                </div>
              </div>

              <div className="badge-magnetic-stripe">
                <span className="stripe-code">||| | |||| | ||| ||||| ||</span>
              </div>
            </div>

            <div className="panel-quick-actions">
              <span className="quick-title">SYS_STATUS: ONLINE</span>
              <p className="access-instruction">
                Insert your credentials or initialize clearance card to access departure manifests.
              </p>
            </div>
          </div>
        </section>

        {/* CARD 2 (CENTER): FLIGHT RETRO TERMINAL WINDOW */}
        <section className="terminal-panel card-terminal-window">
          {/* OS Window Header */}
          <div className="window-header-bar">
            <div className="window-title-left">
              <span className="plane-icon">✈</span>
              <span className="window-title">FLIGHT TERMINAL</span>
            </div>
            <div className="window-controls">
              <span className="ctrl-btn ctrl-min">_</span>
              <span className="ctrl-btn ctrl-max">□</span>
              <span className="ctrl-btn ctrl-close">✕</span>
            </div>
          </div>

          <div className="window-screen-body">
            {/* Terminal Screen Banner */}
            <div className="crt-terminal-header">
              <div className="welcome-text">WELCOME BACK</div>
              <div className="access-text">
                {loading ? "AUTHENTICATING..." : "ACCESS GRANTED"}
              </div>
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
              <div className="terminal-input-group">
                <label htmlFor="username" className="terminal-label">
                  USERNAME <span className="blinking-cursor">|</span>
                </label>
                <div className="terminal-input-wrap">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="terminal-input"
                    placeholder="ENTER USERNAME"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label htmlFor="password" className="terminal-label">
                  PASSCODE <span className="glyph-sparkle">✦</span>
                </label>
                <div className="terminal-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
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

              <div className="terminal-button-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="retro-btn btn-signin"
                >
                  {loading ? (
                    <span className="btn-loading">VERIFYING...</span>
                  ) : (
                    <>
                      SIGN IN <span className="btn-arrow">➔</span>
                    </>
                  )}
                </button>

                <Link
                  to="/register"
                  className="retro-btn btn-arcade-insert"
                  onClick={() => terminalAudio.playBeep(520, 0.08)}
                >
                  INSERT COIN
                </Link>
              </div>

              <div className="terminal-sub-help">
                <span>NEW TRAVELER?</span>
                <Link to="/register" className="terminal-inline-link">
                  ENROLL CLEARANCE [REGISTER]
                </Link>
              </div>
            </form>
          </div>
        </section>

        {/* CARD 3 (RIGHT): FLIGHT ROUTE INPUT WITH SPLIT FLAP */}
        <section className="terminal-panel card-route-panel">
          <div className="panel-header">
            <span className="panel-screws top-left"></span>
            <span className="panel-screws top-right"></span>
            <h3 className="panel-title">FLIGHT ROUTE INPUT</h3>
          </div>

          <div className="panel-body">
            <div className="route-controls-strip">
              <button
                type="button"
                onClick={handlePrevRoute}
                className="route-nav-btn"
                title="Previous Route"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleNextRoute}
                className="route-nav-btn play-btn"
                title="Next Route"
              >
                ▶
              </button>
              <span className="passenger-badge">FOR PASSENGER</span>
            </div>

            <div className="split-flap-route-card">
              <div className="route-row">
                <span className="route-row-label">FROM:</span>
                <div className="flap-box">
                  <SplitFlapText
                    text={currentRoute.from}
                    length={3}
                    color="ivory"
                    align="center"
                  />
                </div>
              </div>

              <div className="route-divider-indicator">
                <span className="route-plane-vector">✈</span>
                <span className="route-dash">────────────</span>
              </div>

              <div className="route-row">
                <span className="route-row-label">TO:</span>
                <div className="flap-box">
                  <SplitFlapText
                    text={currentRoute.to}
                    length={3}
                    color="ivory"
                    align="center"
                  />
                </div>
              </div>
            </div>

            <div className="panel-status-footer">
              <div className="footer-status-tag">
                <span className="beacon-led pulse-green"></span>
                <span className="status-label">SYS_STATUS: <strong>ONLINE</strong></span>
              </div>
              <div className="route-counter">
                ROUTE {routeIndex + 1}/{availableRoutes.length}
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
          <span className="status-item hide-mobile">
            PORT: 8000 // EXPRESS MYSQL ENGINE
          </span>
          <span className="status-item">
            STITCH AIRWAYS // ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Login;
