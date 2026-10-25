import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  playMechanicalClick,
  playCoinSound,
  playAlertSound,
  playSplitFlap,
} from "../utils/soundEffects";
import { SplitFlapText } from "./SplitFlapBoard";
import { ChalkArrow, StarburstBadge } from "./ChalkDoodles";

const DEMO_ROUTES = [
  { from: "NYC", to: "LND" },
  { from: "DEP", to: "ROM" },
  { from: "BOM", to: "DEL" },
  { from: "SFO", to: "TYO" },
  { from: "DXB", to: "SIN" },
];

export const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [cardInserted, setCardInserted] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCycleRoute = () => {
    playSplitFlap();
    setRouteIndex((prev) => (prev + 1) % DEMO_ROUTES.length);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    playMechanicalClick();
    setLoading(true);
    setError("");

    const result = await login(formData.username, formData.password);

    if (result.success) {
      playAlertSound();
      const user = result.user;
      navigate(user.user_type === "admin" ? "/admin" : "/user");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  // "INSERT COIN" / Quick Play Action (from image panel 1)
  const handleInsertCoin = async (role = "user") => {
    playCoinSound();
    setCardInserted(true);

    const creds =
      role === "admin"
        ? { username: "admin", password: "admin123" }
        : { username: "passenger", password: "password123" };

    setFormData(creds);

    // Try logging in with the credentials
    setLoading(true);
    const result = await login(creds.username, creds.password);
    if (result.success) {
      playAlertSound();
      navigate(creds.username === "admin" ? "/admin" : "/user");
    } else {
      // If default test user does not exist yet, attempt registration then login
      if (role === "user") {
        setError("User credentials autofilled. If not yet registered, click 'ENROLL NEW FLIGHT CARD' below.");
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const currentRoute = DEMO_ROUTES[routeIndex];

  return (
    <div className="cockpit-viewport login-landing-page">
      {/* Top Hazard Warning Tape */}
      <div className="hazard-tape"></div>

      {/* Decorative Chalk Arrows & Badges */}
      <ChalkArrow
        color="#ec4899"
        d="M 20 20 Q 80 80 140 30"
        style={{ top: "35px", left: "20px" }}
      />
      <ChalkArrow
        color="#06b6d4"
        d="M 120 70 Q 70 20 20 60"
        style={{ top: "45px", right: "60px" }}
      />

      <div className="login-master-console">
        {/* PANEL 1.1: USER SIGN IN / ACCESS CARD (Left) */}
        <div className="cockpit-bezel access-card-box">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>

          <h3 className="cockpit-plate-title">USER SIGN IN</h3>

          {/* Access Card Slot Graphic */}
          <div className={`access-card-housing ${cardInserted ? "card-active" : ""}`}>
            <div className="card-slot-bezel">
              <span className="slot-indicator">CARD READER // 256-BIT</span>
              <div className="access-card-chip">
                <span className="chip-gold"></span>
                <span className="card-title">ACCESS CARD</span>
                <span className="card-sub">SECURITY CLEARANCE LVL-3</span>
              </div>
            </div>
            <div className="card-status-lights">
              <span className="led-indicator led-green"></span>
              <span className="card-reader-text">
                {cardInserted ? "CARD DETECTED" : "INSERT KEYCARD"}
              </span>
            </div>
          </div>

          <div className="quick-access-buttons">
            <span className="quick-label">TACTICAL QUICK LOGINS:</span>
            <div className="quick-btn-group">
              <button
                type="button"
                className="tactile-btn"
                onClick={() => {
                  setFormData({ username: "admin", password: "admin123" });
                  playMechanicalClick();
                }}
              >
                ADMIN ACCESS
              </button>
              <button
                type="button"
                className="tactile-btn"
                onClick={() => {
                  setFormData({ username: "passenger", password: "password123" });
                  playMechanicalClick();
                }}
              >
                PASSENGER
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 1.2: FLIGHT RETRO OS WINDOW (Center) */}
        <div className="retro-window flight-auth-window">
          {/* Retro Window Blue Header */}
          <div className="retro-window-header">
            <div className="retro-window-title">
              <span>✈</span> FLIGHT // AUTH_PORTAL.EXE
            </div>
            <div className="retro-window-controls">
              <span className="retro-win-btn">-</span>
              <span className="retro-win-btn">□</span>
              <span className="retro-win-btn close">✕</span>
            </div>
          </div>

          {/* Window Body */}
          <div className="flight-auth-body">
            <div className="flight-welcome-banner">
              <h2 className="welcome-pixel-text">WELCOME BACK</h2>
              <div className="access-status-sub">ACCESS GRANTED</div>
              <div className="pixel-planes-deco">
                <span className="pixel-plane">✈</span>
                <span className="sparkle">✦</span>
                <span className="pixel-plane flipped">✈</span>
              </div>
            </div>

            {error && (
              <div className="cockpit-alert-error">
                <span className="led-indicator led-red"></span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="retro-form">
              <div className="terminal-input-group">
                <label className="terminal-label">USERNAME</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="ENTER ID"
                    autoComplete="username"
                  />
                  <span className="terminal-cursor">|</span>
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">PASSCODE</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="ENTER CODE"
                    autoComplete="current-password"
                  />
                  <span className="terminal-cursor">🔑</span>
                </div>
              </div>

              <div className="flight-btn-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="tactile-btn tactile-btn-primary sign-in-btn"
                >
                  {loading ? "AUTHENTICATING..." : "SIGN IN ➔"}
                </button>

                {/* Pulsing "INSERT COIN" Arcade Button from reference image */}
                <button
                  type="button"
                  className="tactile-btn tactile-btn-insert-coin"
                  onClick={() => handleInsertCoin("admin")}
                  title="Insert Coin for Auto-Pilot Admin Session"
                >
                  🪙 INSERT COIN
                </button>
              </div>

              <div className="register-prompt-box">
                <span>NO CREDENTIALS? </span>
                <Link to="/register" className="register-link">
                  ENROLL NEW FLIGHT CARD ➔
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* PANEL 1.3: FLIGHT ROUTE INPUT / SPLIT-FLAP (Right) */}
        <div className="cockpit-bezel route-input-box">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>

          <h3 className="cockpit-plate-title">FLIGHT ROUTE INPUT</h3>

          {/* Stepper Direction Buttons */}
          <div className="route-stepper-controls">
            <button
              type="button"
              className="tactile-btn route-btn"
              onClick={handleCycleRoute}
              title="Previous Route"
            >
              ◀
            </button>
            <button
              type="button"
              className="tactile-btn route-btn tactile-btn-primary"
              onClick={handleCycleRoute}
              title="Next Flight Route"
            >
              ▶
            </button>
            <button
              type="button"
              className="tactile-btn route-btn"
              onClick={handleCycleRoute}
            >
              ▶▶
            </button>
            <span className="route-tag">DISPATCH-FLAP</span>
          </div>

          {/* Solari Split-Flap Route Tiles */}
          <div className="route-flap-display">
            <div className="flap-route-row">
              <span className="flap-route-label">FROM:</span>
              <SplitFlapText text={currentRoute.from} length={3} size="lg" />
            </div>

            <div className="flap-arrow-divider">
              <span className="divider-plane">✈</span>
              <span className="divider-line">═════════════➔</span>
            </div>

            <div className="flap-route-row">
              <span className="flap-route-label">TO:</span>
              <SplitFlapText text={currentRoute.to} length={3} size="lg" />
            </div>
          </div>

          <div className="route-status-footer">
            <span className="led-indicator led-green"></span>
            RADAR RADIAL: ACTIVE BEACON
          </div>
        </div>
      </div>

      {/* Bottom Ticker Tape with SYS_STATUS: ONLINE (as in reference image) */}
      <div className="ticker-bar">
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          SYS_STATUS: ONLINE
        </div>
        <div className="ticker-text" style={{ color: "#38bdf8" }}>
          FREQ: 121.500 MHz // TACAN: CH-74 // SOLARI SPLIT-FLAP SYSTEM ACTIVE
        </div>
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          SYS_STATUS: ONLINE
        </div>
      </div>

      {/* Bottom Hazard Warning Tape */}
      <div className="hazard-tape"></div>
    </div>
  );
};

export default Login;
