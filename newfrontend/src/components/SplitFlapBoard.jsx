import React, { useEffect, useState } from "react";
import { playSplitFlap } from "../utils/soundEffects";

export const SplitFlapText = ({ text = "", length = 8, size = "md", className = "" }) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (text !== displayedText) {
      setAnimating(true);
      playSplitFlap();
      const timer = setTimeout(() => {
        setDisplayedText(text);
        setAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [text, displayedText]);

  // Pad or trim text
  const clean = (displayedText || "").toUpperCase();
  const chars = clean.padEnd(length, " ").slice(0, length).split("");

  return (
    <div className={`split-flap-container flap-${size} ${className}`}>
      {chars.map((char, idx) => (
        <div
          key={idx}
          className={`flap-tile ${animating ? "flap-animate" : ""}`}
        >
          {char === " " ? "\u00A0" : char}
        </div>
      ))}
    </div>
  );
};

export const SolariStatusBadge = ({ status = "ON TIME" }) => {
  const normalized = (status || "").toLowerCase();
  let badgeClass = "status-on-time";

  if (normalized.includes("delay")) {
    badgeClass = "status-delayed";
  } else if (normalized.includes("board")) {
    badgeClass = "status-boarding";
  } else if (normalized.includes("cancel")) {
    badgeClass = "status-cancelled";
  } else if (normalized.includes("standby") || normalized.includes("pending")) {
    badgeClass = "status-standby";
  }

  return (
    <div className={`solari-status-badge ${badgeClass}`}>
      {status.toUpperCase()}
    </div>
  );
};
