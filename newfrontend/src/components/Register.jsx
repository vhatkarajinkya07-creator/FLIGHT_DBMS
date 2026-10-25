import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  playMechanicalClick,
  playAlertSound,
} from "../utils/soundEffects";
import { ChalkArrow } from "./ChalkDoodles";

export const Register = () => {
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

  const handleRoleToggle = (role) => {
    playMechanicalClick();
    setFormData((prev) => ({ ...prev, user_type: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playMechanicalClick();
    setLoading(true);
    setError("");

    const result = await register(formData);

    if (result.success) {
      playAlertSound();
      navigate("/login");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="cockpit-viewport register-page">
      <div className="hazard-tape"></div>

      <ChalkArrow
        color="#a855f7"
        d="M 10 70 Q 60 10 110 50"
        style={{ top: "40px", right: "80px" }}
      />

      <div className="register-console-container">
        {/* Registration Chassis Frame */}
        <div className="cockpit-bezel register-chassis">
          <div className="rivet rivet-tl"></div>
          <div className="rivet rivet-tr"></div>
          <div className="rivet rivet-bl"></div>
          <div className="rivet rivet-br"></div>

          <div className="register-header-panel">
            <span className="badge-chip">SYS-REG // FORM-88</span>
            <h2 className="register-title">
              <span>✈</span> FLIGHT CREW &amp; PASSENGER ENROLLMENT
            </h2>
            <p className="register-subtitle">
              OFFICIAL SECURITY CLEARANCE &amp; ACCESS CARD ENROLLMENT
            </p>
          </div>

          {/* Access Card Live Preview */}
          <div className="live-card-preview">
            <div className="preview-card-metal">
              <div className="card-top-row">
                <span className="card-logo">✈ FLIGHTBOOK // SECURE</span>
                <span className="badge-status">
                  {formData.user_type === "admin"
                    ? "SYS_ADMIN"
                    : "PASSENGER"}
                </span>
              </div>
              <div className="card-chip-graphic">
                <span className="gold-contact"></span>
                <span className="chip-code">
                  ID#{formData.username || "OPERATOR"}
                </span>
              </div>
              <div className="card-holder-name">
                {formData.first_name || "FIRST"} {formData.last_name || "LAST"}
              </div>
              <div className="card-footer-strip">
                CLASS: {formData.user_type === "admin" ? "LVL-4 ADMIN" : "COMMERCIAL CIV"}
              </div>
            </div>
          </div>

          {error && (
            <div className="cockpit-alert-error" style={{ margin: "14px 0" }}>
              <span className="led-indicator led-red"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            {/* Clearance Level Selector Switches */}
            <div className="role-switch-console">
              <span className="role-label">CLEARANCE LEVEL:</span>
              <div className="role-toggle-group">
                <button
                  type="button"
                  className={`tactile-btn ${
                    formData.user_type === "user"
                      ? "tactile-btn-primary"
                      : ""
                  }`}
                  onClick={() => handleRoleToggle("user")}
                >
                  <span className="led-indicator led-green"></span>
                  ✈ CIVILIAN PASSENGER
                </button>
                <button
                  type="button"
                  className={`tactile-btn ${
                    formData.user_type === "admin"
                      ? "tactile-btn-primary"
                      : ""
                  }`}
                  onClick={() => handleRoleToggle("admin")}
                >
                  <span className="led-indicator led-amber"></span>
                  🔧 FLIGHT DISPATCH ADMIN
                </button>
              </div>
            </div>

            <div className="terminal-form-grid">
              <div className="terminal-input-group">
                <label className="terminal-label">FIRST NAME</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="E.G. JOHN"
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">LAST NAME</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="E.G. DOE"
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">USERNAME / CALLSIGN</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="E.G. SKY_PILOT"
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">EMAIL ADDRESS</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="PILOT@FLIGHT.COM"
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">PHONE NUMBER</label>
                <div className="terminal-input-wrapper">
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">PASSCODE</label>
                <div className="terminal-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="terminal-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "👁" : "👁‍🗨"}
                  </button>
                </div>
              </div>
            </div>

            <div className="register-actions">
              <button
                type="submit"
                disabled={loading}
                className="tactile-btn tactile-btn-primary issue-card-btn"
              >
                {loading ? "ENROLLING..." : "ISSUE CARD & REGISTER ➔"}
              </button>

              <Link to="/login" className="back-login-link">
                ◀ ALREADY HAVE A PASS? SIGN IN
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="ticker-bar">
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          ENROLLMENT TERMINAL // SECURE 256-BIT SHA
        </div>
      </div>
      <div className="hazard-tape"></div>
    </div>
  );
};

export default Register;
