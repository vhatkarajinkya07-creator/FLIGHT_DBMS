import React, { useState, useEffect, useRef } from "react";
import { terminalAudio } from "../utils/audio";

export const SplitFlapChar = ({ char, color = "default", animate = true }) => {
  const [displayChar, setDisplayChar] = useState(char || " ");
  const [isFlipping, setIsFlipping] = useState(false);
  const prevCharRef = useRef(char);

  useEffect(() => {
    if (char !== prevCharRef.current) {
      if (animate) {
        setIsFlipping(true);
        terminalAudio.playFlapClick();
        const timer = setTimeout(() => {
          setDisplayChar(char || " ");
          setIsFlipping(false);
        }, 120);
        prevCharRef.current = char;
        return () => clearTimeout(timer);
      } else {
        setDisplayChar(char || " ");
        prevCharRef.current = char;
      }
    }
  }, [char, animate]);

  const upper = (displayChar || " ").toString().toUpperCase();

  return (
    <div className={`flap-tile flap-color-${color} ${isFlipping ? "flipping" : ""}`}>
      <div className="flap-top">
        <span className="flap-char">{upper}</span>
      </div>
      <div className="flap-bottom">
        <span className="flap-char">{upper}</span>
      </div>
      <div className="flap-crease"></div>
      <div className="flap-hinge left"></div>
      <div className="flap-hinge right"></div>
    </div>
  );
};

export const SplitFlapText = ({
  text = "",
  length = null,
  color = "default",
  align = "left",
  animate = true,
  className = "",
}) => {
  const rawStr = (text || "").toString().toUpperCase();
  const targetLen = length ? length : rawStr.length;
  
  let formatted = rawStr;
  if (length) {
    if (align === "right") {
      formatted = rawStr.padStart(length, " ");
    } else if (align === "center") {
      const padTotal = Math.max(0, length - rawStr.length);
      const padLeft = Math.floor(padTotal / 2);
      formatted = rawStr.padStart(rawStr.length + padLeft, " ").padEnd(length, " ");
    } else {
      formatted = rawStr.padEnd(length, " ");
    }
  }

  const chars = formatted.split("");

  return (
    <div className={`split-flap-word ${className}`}>
      {chars.map((c, idx) => (
        <SplitFlapChar
          key={idx}
          char={c}
          color={color}
          animate={animate}
        />
      ))}
    </div>
  );
};

export default SplitFlapText;
