import React, { useState, useEffect } from "react";
import { playMechanicalClick } from "../utils/soundEffects";

export const DateTumbler = ({ value, onChange, minDate }) => {
  // Parse initial date or default to tomorrow
  const getInitialParts = () => {
    let d = new Date();
    d.setDate(d.getDate() + 1);
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
  };

  const [dateParts, setDateParts] = useState(getInitialParts());

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setDateParts({
          day: parsed.getDate(),
          month: parsed.getMonth() + 1,
          year: parsed.getFullYear(),
        });
      }
    }
  }, [value]);

  const emitDate = (day, month, year) => {
    // Days in month validation
    const maxDays = new Date(year, month, 0).getDate();
    const safeDay = Math.min(Math.max(1, day), maxDays);
    const mm = String(month).padStart(2, "0");
    const dd = String(safeDay).padStart(2, "0");
    const formatted = `${year}-${mm}-${dd}`;
    onChange(formatted);
  };

  const step = (unit, delta) => {
    playMechanicalClick();
    setDateParts((prev) => {
      let newDay = prev.day;
      let newMonth = prev.month;
      let newYear = prev.year;

      if (unit === "day") {
        const maxDays = new Date(prev.year, prev.month, 0).getDate();
        newDay = ((prev.day - 1 + delta + maxDays) % maxDays) + 1;
      } else if (unit === "month") {
        newMonth = ((prev.month - 1 + delta + 12) % 12) + 1;
      } else if (unit === "year") {
        newYear = Math.max(2026, prev.year + delta);
      }

      emitDate(newDay, newMonth, newYear);
      return { day: newDay, month: newMonth, year: newYear };
    });
  };

  return (
    <div className="date-tumbler-box">
      <div className="date-tumbler-header">
        <span className="tumbler-icon">📅</span>
        SELECT TRAVEL DATE
      </div>

      <div className="tumbler-reels">
        {/* DAY TUMBLER */}
        <div className="tumbler-col">
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("day", 1)}
            aria-label="Next day"
          >
            ▲
          </button>
          <div className="tumbler-wheel">
            <span className="tumbler-digits">
              {String(dateParts.day).padStart(2, "0")}
            </span>
            <span className="tumbler-label">DD</span>
          </div>
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("day", -1)}
            aria-label="Previous day"
          >
            ▼
          </button>
        </div>

        <div className="tumbler-separator">/</div>

        {/* MONTH TUMBLER */}
        <div className="tumbler-col">
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("month", 1)}
            aria-label="Next month"
          >
            ▲
          </button>
          <div className="tumbler-wheel">
            <span className="tumbler-digits">
              {String(dateParts.month).padStart(2, "0")}
            </span>
            <span className="tumbler-label">MM</span>
          </div>
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("month", -1)}
            aria-label="Previous month"
          >
            ▼
          </button>
        </div>

        <div className="tumbler-separator">/</div>

        {/* YEAR TUMBLER */}
        <div className="tumbler-col">
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("year", 1)}
            aria-label="Next year"
          >
            ▲
          </button>
          <div className="tumbler-wheel tumbler-wheel-lg">
            <span className="tumbler-digits">{dateParts.year}</span>
            <span className="tumbler-label">YYYY</span>
          </div>
          <button
            type="button"
            className="tumbler-arrow"
            onClick={() => step("year", -1)}
            aria-label="Previous year"
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateTumbler;
