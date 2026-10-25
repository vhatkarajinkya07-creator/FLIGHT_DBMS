import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/BookingTicket.css";

const BookingTicket = ({ bookingId, API_BASE }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketStyle, setTicketStyle] = useState("blue"); // "blue" | "amber"

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/bookings/${bookingId}`);
      setBooking(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load booking details");
      console.error("Error fetching booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "SCHEDULED";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "SCHEDULED"
        : date.toLocaleDateString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          });
    } catch (error) {
      return "SCHEDULED";
    }
  };

  const getFlightTimes = () => {
    if (!booking?.flight) return { departureTime: null, arrivalTime: null };
    let departureTime, arrivalTime;

    try {
      if (booking.travel_date) {
        departureTime = new Date(
          `${booking.travel_date}T${
            booking.flight.departure_time_only || "08:00:00"
          }`
        );
        arrivalTime = new Date(
          `${booking.travel_date}T${
            booking.flight.arrival_time_only || "11:30:00"
          }`
        );
        if (arrivalTime < departureTime) {
          const nextDay = new Date(booking.travel_date);
          nextDay.setDate(nextDay.getDate() + 1);
          arrivalTime = new Date(
            `${nextDay.toISOString().split("T")[0]}T${
              booking.flight.arrival_time_only || "11:30:00"
            }`
          );
        }
      } else {
        departureTime = new Date(booking.flight.departure_time || Date.now());
        arrivalTime = new Date(
          booking.flight.arrival_time || Date.now() + 3 * 3600000
        );
      }

      if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
        departureTime = new Date();
        arrivalTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      }
    } catch (e) {
      departureTime = new Date();
      arrivalTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    }

    return { departureTime, arrivalTime };
  };

  if (loading) {
    return (
      <div className="vintage-ticket-loading">
        <span className="ticket-spinner"></span>
        <p>PRINTING FLIGHT DISPATCH TICKET...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="vintage-ticket-error">
        <span>⚠</span>
        <p>{error || "Booking not found in central manifest"}</p>
      </div>
    );
  }

  const { departureTime, arrivalTime } = getFlightTimes();
  const seatAssigned = `14${String.fromCharCode(65 + ((booking.booking_id || 1) % 6))}`;
  const gateAssigned = `B${(booking.booking_id || 1) % 18 + 1}`;

  return (
    <div className="vintage-pass-container">
      {/* TICKET STYLE SWITCHER */}
      <div className="ticket-style-toggle no-print">
        <span className="toggle-label">BOARDING PASS THEME:</span>
        <button
          onClick={() => setTicketStyle("blue")}
          className={`style-btn ${ticketStyle === "blue" ? "active" : ""}`}
        >
          AERO NAVY
        </button>
        <button
          onClick={() => setTicketStyle("amber")}
          className={`style-btn ${ticketStyle === "amber" ? "active" : ""}`}
        >
          RETRO AMBER
        </button>
      </div>

      {/* THE VINTAGE BOARDING PASS (Matching Screen 4) */}
      <div className={`vintage-boarding-ticket theme-${ticketStyle}`}>
        {/* Left Tear Notch */}
        <div className="stub-notch notch-left"></div>
        {/* Right Tear Notch */}
        <div className="stub-notch notch-right"></div>

        {/* MAIN BODY (LEFT 75%) */}
        <div className="pass-main-body">
          {/* Top Carrier Header */}
          <div className="pass-header">
            <div className="pass-carrier">
              <span className="carrier-icon">✈</span>
              <span className="carrier-name">
                {booking.flight.airline?.airline_name || "STITCH AIRWAYS"}
              </span>
              <span className="carrier-code">
                [{booking.flight.airline?.airline_code || "STA"}]
              </span>
            </div>
            <div className="pass-title-banner">
              <span>BOARDING PASS</span>
            </div>
          </div>

          {/* Passenger & Flight Basic Line */}
          <div className="pass-passenger-strip">
            <div className="strip-item">
              <span className="pass-lbl">PASSENGER NAME</span>
              <span className="pass-val">
                {booking.user?.first_name
                  ? `${booking.user.first_name} ${booking.user.last_name || ""}`.toUpperCase()
                  : "VALUED PASSENGER"}
              </span>
            </div>
            <div className="strip-item">
              <span className="pass-lbl">FLIGHT</span>
              <span className="pass-val flight-highlight">
                {booking.flight.flight_number}
              </span>
            </div>
            <div className="strip-item">
              <span className="pass-lbl">TRAVEL DATE</span>
              <span className="pass-val">
                {formatDate(booking.travel_date || booking.flight.departure_time)}
              </span>
            </div>
            <div className="strip-item">
              <span className="pass-lbl">CABIN CLASS</span>
              <span className="pass-val">ECONOMY / EN</span>
            </div>
          </div>

          {/* Route Section with Airport Codes */}
          <div className="pass-route-deck">
            <div className="route-endpoint">
              <span className="city-code">
                {(booking.flight.source_city || "DEP").toUpperCase().slice(0, 3)}
              </span>
              <span className="city-fullname">{booking.flight.source_city}</span>
              <span className="dep-time-clock">
                DEP: {departureTime ? departureTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </span>
            </div>

            <div className="route-flight-graphic">
              <span className="plane-fly">✈</span>
              <div className="flight-track-line">
                <span className="track-dot start"></span>
                <span className="track-bar"></span>
                <span className="track-dot end"></span>
              </div>
              <span className="nonstop-tag">NON-STOP</span>
            </div>

            <div className="route-endpoint arr-endpoint">
              <span className="city-code">
                {(booking.flight.destination_city || "ARR").toUpperCase().slice(0, 3)}
              </span>
              <span className="city-fullname">{booking.flight.destination_city}</span>
              <span className="arr-time-clock">
                ARR: {arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
              </span>
            </div>
          </div>

          {/* Gate, Boarding Time, Seat, Group Row */}
          <div className="pass-boarding-telemetry">
            <div className="telemetry-box">
              <span className="tele-lbl">GATE</span>
              <span className="tele-val tele-large">{gateAssigned}</span>
            </div>
            <div className="telemetry-box">
              <span className="tele-lbl">BOARDING</span>
              <span className="tele-val">45 MIN BEFORE</span>
            </div>
            <div className="telemetry-box">
              <span className="tele-lbl">SEAT</span>
              <span className="tele-val tele-large seat-badge">{seatAssigned}</span>
            </div>
            <div className="telemetry-box">
              <span className="tele-lbl">GROUP</span>
              <span className="tele-val">ZONE 2</span>
            </div>
            <div className="telemetry-box">
              <span className="tele-lbl">PASSENGERS</span>
              <span className="tele-val">{booking.passengers_count} PAX</span>
            </div>
          </div>

          {/* Bottom Barcode and Red Ink Rubber Stamp */}
          <div className="pass-footer-barcode-strip">
            <div className="barcode-box">
              <div className="rendered-barcode">
                {/* Authentic barcode bars */}
                <span className="bar b1"></span><span className="bar b3"></span><span className="bar b1"></span>
                <span className="bar b2"></span><span className="bar b4"></span><span className="bar b1"></span>
                <span className="bar b3"></span><span className="bar b2"></span><span className="bar b1"></span>
                <span className="bar b4"></span><span className="bar b2"></span><span className="bar b3"></span>
                <span className="bar b1"></span><span className="bar b2"></span><span className="bar b4"></span>
                <span className="bar b3"></span><span className="bar b1"></span><span className="bar b2"></span>
                <span className="bar b4"></span><span className="bar b1"></span><span className="bar b3"></span>
                <span className="bar b2"></span><span className="bar b4"></span><span className="bar b1"></span>
                <span className="bar b3"></span><span className="bar b2"></span><span className="bar b1"></span>
                <span className="bar b4"></span><span className="bar b2"></span><span className="bar b3"></span>
              </div>
              <span className="barcode-number">PNR: {booking.pnr_number} // TKT-{booking.booking_id}</span>
            </div>

            {/* CIRCULAR RED INK STAMP (From Screen 4: APPROVED STAMPS / CONFIRMED) */}
            <div className="vintage-rubber-stamp">
              <div className="stamp-circle">
                <span className="stamp-stars">★ ★ ★</span>
                <span className="stamp-word">
                  {booking.booking_status === "confirmed" ? "CONFIRMED" : "DISPATCH"}
                </span>
                <span className="stamp-sub">STITCH PASS</span>
                <span className="stamp-date">{formatDate(booking.booking_date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORATION TEAR-OFF LINE */}
        <div className="pass-perforation-divider">
          <div className="cut-line"></div>
          <span className="scissor-ico">✂</span>
        </div>

        {/* TEAR-OFF FLIGHT STUB (RIGHT 25%) */}
        <div className="pass-tear-stub">
          <div className="stub-header">
            <span className="stub-title">PASSENGER COUPON</span>
            <span className="stub-carrier">{booking.flight.flight_number}</span>
          </div>

          <div className="stub-details">
            <div className="stub-row">
              <span className="s-lbl">PASSENGER:</span>
              <span className="s-val">PAX x{booking.passengers_count}</span>
            </div>
            <div className="stub-row">
              <span className="s-lbl">FROM:</span>
              <span className="s-val">{booking.flight.source_city}</span>
            </div>
            <div className="stub-row">
              <span className="s-lbl">TO:</span>
              <span className="s-val">{booking.flight.destination_city}</span>
            </div>
            <div className="stub-row">
              <span className="s-lbl">DATE:</span>
              <span className="s-val">{formatDate(booking.travel_date)}</span>
            </div>
            <div className="stub-row">
              <span className="s-lbl">GATE / SEAT:</span>
              <span className="s-val">{gateAssigned} / {seatAssigned}</span>
            </div>
            <div className="stub-row">
              <span className="s-lbl">TOTAL FARE:</span>
              <span className="s-val price">₹{booking.total_amount}</span>
            </div>
          </div>

          {/* QR Code graphic */}
          <div className="stub-qrcode-box">
            <div className="mock-qrcode">
              <div className="qr-corner top-left"></div>
              <div className="qr-corner top-right"></div>
              <div className="qr-corner bottom-left"></div>
              <div className="qr-matrix-dots"></div>
            </div>
            <span className="qr-caption">SCAN AT GATE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTicket;
