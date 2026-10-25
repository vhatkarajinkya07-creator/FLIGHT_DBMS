import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/ticket.css";
import { playMechanicalClick } from "../utils/soundEffects";

export const BoardingTicket = ({ bookingId, API_BASE }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/bookings/${bookingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setBooking(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load boarding credentials.");
      console.error("Error fetching booking details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ticket-loading-state">
        <span className="led-indicator led-amber"></span>
        FETCHING FLIGHT MANIFEST DATA...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="ticket-error-state">
        <span className="led-indicator led-red"></span>
        {error || "Booking manifest not found."}
      </div>
    );
  }

  const flight = booking.flight || {};
  const airline = flight.airline || {
    airline_name: flight.airline_name || "GLOBAL SKYWAYS",
    airline_code: flight.airline_code || "GS",
  };

  // Safe times
  let depDate = "DATE PENDING";
  let depTime = "00:00";
  let arrTime = "00:00";

  try {
    if (booking.travel_date) {
      depDate = new Date(booking.travel_date).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      depTime = flight.departure_time_only || "12:00";
      arrTime = flight.arrival_time_only || "15:30";
    } else if (flight.departure_time) {
      const d = new Date(flight.departure_time);
      depDate = d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      depTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const a = new Date(flight.arrival_time);
      arrTime = a.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  } catch (e) {}

  return (
    <div className="vintage-ticket-wrapper">
      <div className="vintage-ticket">
        {/* Rubber Stamps */}
        <div className="rubber-stamp stamp-approved">
          ✓ APPROVED // ISSUED
        </div>
        <div className="rubber-stamp stamp-inspected">
          INSPECTED &amp; CLEARED
        </div>
        <div className="rubber-stamp stamp-circular">
          <span>AIRLINE</span>
          <strong>STAMPS</strong>
          <span>VALID</span>
        </div>

        {/* MAIN BODY (72%) */}
        <div className="ticket-main">
          {/* Airline Header Stripe */}
          <div className="ticket-airline-stripe">
            <div className="ticket-header-title">
              <span>✈</span>
              <span>{airline.airline_name.toUpperCase()}</span>
            </div>
            <div className="ticket-flight-class">
              BOARDING PASS // FIRST CLASS
            </div>
          </div>

          <div className="ticket-grid">
            <div className="ticket-data-box">
              <span className="ticket-label">PASSENGER(S)</span>
              <span className="ticket-value">
                {booking.passengers_count} ADULT(S)
              </span>
            </div>

            <div className="ticket-data-box">
              <span className="ticket-label">FLIGHT NO.</span>
              <span className="ticket-value ticket-value-lg">
                {flight.flight_number || "GS-404"}
              </span>
            </div>

            <div className="ticket-data-box">
              <span className="ticket-label">DATE</span>
              <span className="ticket-value">{depDate}</span>
            </div>

            <div className="ticket-data-box">
              <span className="ticket-label">TIME</span>
              <span className="ticket-value">{depTime}</span>
            </div>
          </div>

          {/* Route Section */}
          <div className="ticket-grid" style={{ marginBottom: 0 }}>
            <div className="ticket-data-box">
              <span className="ticket-label">ORIGIN</span>
              <span className="ticket-value-lg">
                {flight.source_city || "NYC"}
              </span>
            </div>

            <div className="ticket-data-box" style={{ justifyContent: "center" }}>
              <span style={{ fontSize: "1.8rem", color: "#64748b" }}>➔</span>
            </div>

            <div className="ticket-data-box">
              <span className="ticket-label">DESTINATION</span>
              <span className="ticket-value-lg">
                {flight.destination_city || "LND"}
              </span>
            </div>

            <div className="ticket-data-box">
              <span className="ticket-label">GATE / SEAT</span>
              <span className="ticket-value">GATE 04 / 14A</span>
            </div>
          </div>

          {/* Barcode Section */}
          <div className="barcode-container">
            <div>
              <svg className="barcode-svg" viewBox="0 0 200 40">
                <rect x="0" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="6" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="10" y="0" width="6" height="40" fill="#1e293b" />
                <rect x="20" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="24" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="32" y="0" width="8" height="40" fill="#1e293b" />
                <rect x="44" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="50" y="0" width="6" height="40" fill="#1e293b" />
                <rect x="60" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="68" y="0" width="8" height="40" fill="#1e293b" />
                <rect x="80" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="86" y="0" width="6" height="40" fill="#1e293b" />
                <rect x="96" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="104" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="110" y="0" width="8" height="40" fill="#1e293b" />
                <rect x="122" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="130" y="0" width="6" height="40" fill="#1e293b" />
                <rect x="140" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="146" y="0" width="8" height="40" fill="#1e293b" />
                <rect x="158" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="166" y="0" width="2" height="40" fill="#1e293b" />
                <rect x="172" y="0" width="6" height="40" fill="#1e293b" />
                <rect x="182" y="0" width="4" height="40" fill="#1e293b" />
                <rect x="190" y="0" width="6" height="40" fill="#1e293b" />
              </svg>
              <div style={{ fontSize: "0.65rem", color: "#64748b", letterSpacing: "2px" }}>
                PNR: {booking.pnr_number} // AUTH-ID #{booking.booking_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="ticket-label">TOTAL FARE</span>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#0f172a" }}>
                ₹{booking.total_amount?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* TICKET STUB (28%) */}
        <div className="ticket-stub">
          <div className="ticket-airline-stripe orange-theme" style={{ margin: "-24px -18px 12px -18px", padding: "6px 12px" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>BOARDING STUB</span>
          </div>

          <div className="ticket-data-box">
            <span className="ticket-label">FLIGHT</span>
            <span className="ticket-value">{flight.flight_number}</span>
          </div>

          <div className="ticket-data-box">
            <span className="ticket-label">ROUTE</span>
            <span className="ticket-value">
              {flight.source_city} ➔ {flight.destination_city}
            </span>
          </div>

          <div className="ticket-data-box">
            <span className="ticket-label">PNR</span>
            <span className="ticket-value" style={{ fontSize: "1.1rem", color: "#b45309" }}>
              {booking.pnr_number}
            </span>
          </div>

          {/* QR Code Graphic */}
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="#0f172a">
              <rect x="4" y="4" width="20" height="20" fill="none" stroke="#0f172a" strokeWidth="4" />
              <rect x="10" y="10" width="8" height="8" fill="#0f172a" />
              <rect x="40" y="4" width="20" height="20" fill="none" stroke="#0f172a" strokeWidth="4" />
              <rect x="46" y="10" width="8" height="8" fill="#0f172a" />
              <rect x="4" y="40" width="20" height="20" fill="none" stroke="#0f172a" strokeWidth="4" />
              <rect x="10" y="46" width="8" height="8" fill="#0f172a" />
              <rect x="30" y="30" width="6" height="6" />
              <rect x="40" y="32" width="8" height="4" />
              <rect x="34" y="44" width="6" height="12" />
              <rect x="46" y="46" width="12" height="12" />
            </svg>
          </div>

          <div style={{ fontSize: "0.6rem", textAlign: "center", color: "#64748b" }}>
            TEAR ALONG PERFORATION
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardingTicket;
