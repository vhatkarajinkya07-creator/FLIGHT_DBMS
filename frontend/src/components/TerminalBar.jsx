import React, { useState, useEffect } from "react";
import { terminalAudio } from "../utils/audio";

export const TerminalBar = ({ user, onLogout }) => {
  const [time, setTime] = useState("");
  const [soundMuted, setSoundMuted] = useState(terminalAudio.isMuted());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toUTCString().replace("GMT", "UTC")
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const muted = terminalAudio.toggleMute();
    setSoundMuted(muted);
    if (!muted) {
      terminalAudio.playBeep(880, 0.08);
    }
  };

  return (
    <header className="aero-terminal-bar">
      <div className="hazard-tape top-tape"></div>

      <div className="terminal-bar-inner">
        <div className="terminal-bar-left">
          <div className="sys-status-badge">
            <span className="beacon-led pulse-green"></span>
            <span className="sys-status-text">SYS_STATUS: <strong>ONLINE</strong></span>
          </div>
          <div className="telemetry-item hide-mobile">
            <span className="telemetry-label">RADAR:</span>
            <span className="telemetry-val">ACTIVE 360°</span>
          </div>
          <div className="telemetry-item hide-mobile">
            <span className="telemetry-label">ALT:</span>
            <span className="telemetry-val">FL360</span>
          </div>
        </div>

        <div className="terminal-bar-center">
          <div className="flight-logo-marquee">
            <span className="flight-ico">✈</span>
            <span className="terminal-callsign">AERODECK DISPATCH CONSOLE // STITCH-OS 2.4</span>
            <span className="flight-ico">✈</span>
          </div>
        </div>

        <div className="terminal-bar-right">
          <div className="telemetry-clock">
            <span className="clock-icon">⏱</span>
            <span>{time || "UTC 00:00:00"}</span>
          </div>

          <button
            onClick={handleToggleSound}
            className={`audio-toggle-btn ${soundMuted ? "muted" : "active"}`}
            title="Toggle Mechanical Audio"
          >
            {soundMuted ? "🔇 MUTE" : "🔊 SFX ON"}
          </button>

          {user && onLogout && (
            <button
              onClick={() => {
                terminalAudio.playBeep(440, 0.08);
                onLogout();
              }}
              className="terminal-logout-btn"
            >
              LOGOUT [✕]
            </button>
          )}
        </div>
      </div>

      <div className="hazard-tape bottom-tape"></div>
    </header>
  );
};

export default TerminalBar;
