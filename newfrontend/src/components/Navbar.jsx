import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  playMechanicalClick,
  isSoundEnabled,
  setSoundEnabled,
} from "../utils/soundEffects";

export const Navbar = ({ activeTab, setActiveTab, isAdmin = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sfxOn, setSfxOn] = useState(isSoundEnabled());

  const handleLogout = () => {
    playMechanicalClick();
    logout();
    navigate("/login");
  };

  const toggleSound = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSoundEnabled(next);
    if (next) playMechanicalClick();
  };

  const handleTabClick = (tabKey) => {
    playMechanicalClick();
    if (setActiveTab) {
      setActiveTab(tabKey);
    }
  };

  return (
    <header className="cockpit-navbar">
      {/* Hazard Tape Accent */}
      <div className="hazard-tape-sm"></div>

      <div className="navbar-container">
        {/* Left: Breadcrumb / System Title */}
        <div className="navbar-brand">
          <span className="brand-radar-icon">✈</span>
          <div className="brand-text">
            <span className="brand-system">FLIGHTBOOK // </span>
            <span className="brand-path">
              {isAdmin
                ? "ADMIN CONSOLE / DISPATCH"
                : activeTab === "search"
                ? "SEARCH FLIGHTS & STATUS"
                : "MY BOOKINGS & TICKETS"}
            </span>
          </div>
        </div>

        {/* Center: Tactile Tab Selectors */}
        <nav className="navbar-tabs">
          {!isAdmin ? (
            <>
              <button
                type="button"
                className={`tactile-tab-btn ${
                  activeTab === "search" ? "tab-active" : ""
                }`}
                onClick={() => handleTabClick("search")}
              >
                <span
                  className={`led-indicator ${
                    activeTab === "search" ? "led-green" : "led-amber"
                  }`}
                ></span>
                SEARCH FLIGHTS
              </button>

              <button
                type="button"
                className={`tactile-tab-btn ${
                  activeTab === "bookings" ? "tab-active" : ""
                }`}
                onClick={() => handleTabClick("bookings")}
              >
                <span
                  className={`led-indicator ${
                    activeTab === "bookings" ? "led-green" : "led-amber"
                  }`}
                ></span>
                MY BOOKINGS
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`tactile-tab-btn ${
                  activeTab === "flights" ? "tab-active" : ""
                }`}
                onClick={() => handleTabClick("flights")}
              >
                <span
                  className={`led-indicator ${
                    activeTab === "flights" ? "led-green" : "led-amber"
                  }`}
                ></span>
                FLIGHT OPS
              </button>

              <button
                type="button"
                className={`tactile-tab-btn ${
                  activeTab === "bookings" ? "tab-active" : ""
                }`}
                onClick={() => handleTabClick("bookings")}
              >
                <span
                  className={`led-indicator ${
                    activeTab === "bookings" ? "led-green" : "led-amber"
                  }`}
                ></span>
                MANIFEST / BOOKINGS
              </button>

              <button
                type="button"
                className={`tactile-tab-btn ${
                  activeTab === "airlines" ? "tab-active" : ""
                }`}
                onClick={() => handleTabClick("airlines")}
              >
                <span
                  className={`led-indicator ${
                    activeTab === "airlines" ? "led-green" : "led-amber"
                  }`}
                ></span>
                FLEET / AIRLINES
              </button>
            </>
          )}
        </nav>

        {/* Right: Sound toggle, User badge, Logout */}
        <div className="navbar-controls">
          {/* SFX Audio Toggle */}
          <button
            type="button"
            className="sfx-toggle-btn"
            onClick={toggleSound}
            title={sfxOn ? "Mute Cockpit Audio" : "Enable Cockpit Audio"}
          >
            <span
              className={`led-indicator ${sfxOn ? "led-green" : "led-red"}`}
            ></span>
            SFX: {sfxOn ? "ON 🔊" : "OFF 🔇"}
          </button>

          {/* User Badge */}
          <div className="operator-badge">
            <span className="badge-chip">SYS-ID</span>
            <span className="badge-name">{user?.username?.toUpperCase()}</span>
          </div>

          {/* Logout Tactile Button */}
          <button
            type="button"
            className="tactile-btn tactile-btn-danger logout-btn"
            onClick={handleLogout}
          >
            LOGOUT [X]
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
