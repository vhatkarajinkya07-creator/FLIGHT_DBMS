import React from "react";

export const ChalkArrow = ({
  color = "#ec4899",
  d = "M 10 80 Q 50 10 90 40 T 150 20",
  width = 160,
  height = 90,
  className = "",
  style = {},
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={`chalk-arrow ${className}`}
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 15,
        filter: `drop-shadow(0 0 3px ${color})`,
        ...style,
      }}
    >
      <path
        d={d}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="4 1"
      />
      {/* Arrow head */}
      <circle cx="15" cy="15" r="3" fill={color} opacity="0.3" />
    </svg>
  );
};

export const StarburstBadge = ({
  type = "best-price",
  textTop = "BEST",
  textBottom = "PRICE!",
  style = {},
  onClick,
}) => {
  const isBestPrice = type === "best-price";
  return (
    <div
      className={`sticker-starburst ${
        isBestPrice ? "sticker-best-price" : "sticker-limited"
      }`}
      style={style}
      onClick={onClick}
    >
      <span>{textTop}</span>
      <span>{textBottom}</span>
    </div>
  );
};

export const RetroStampsBadge = ({ text = "STAMPS", variant = "stamps", style = {} }) => {
  return (
    <span className={`sticker-badge badge-${variant}`} style={style}>
      {text}
    </span>
  );
};
