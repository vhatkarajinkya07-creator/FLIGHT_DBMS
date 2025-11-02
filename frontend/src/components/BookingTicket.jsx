import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/BookingTicket.css";

const BookingTicket = ({ bookingId, API_BASE }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // FIXED: Proper date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";

    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Date not available"
        : date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
    } catch (error) {
      return "Date not available";
    }
  };

  // FIXED: Safe date calculation for flight times
  const getFlightTimes = () => {
    if (!booking?.flight) return { departureTime: null, arrivalTime: null };

    let departureTime, arrivalTime;

    try {
      if (booking.travel_date) {
        // Handle case where we have separate date and time
        departureTime = new Date(
          `${booking.travel_date}T${
            booking.flight.departure_time_only || "00:00:00"
          }`
        );
        arrivalTime = new Date(
          `${booking.travel_date}T${
            booking.flight.arrival_time_only || "00:00:00"
          }`
        );

        // If arrival is next day, adjust the date
        if (arrivalTime < departureTime) {
          const nextDay = new Date(booking.travel_date);
          nextDay.setDate(nextDay.getDate() + 1);
          arrivalTime = new Date(
            `${nextDay.toISOString().split("T")[0]}T${
              booking.flight.arrival_time_only || "00:00:00"
            }`
          );
        }
      } else {
        // Handle case where we have full datetime strings
        departureTime = new Date(booking.flight.departure_time);
        arrivalTime = new Date(booking.flight.arrival_time);
      }

      // Validate dates
      if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
        console.warn("Invalid date detected, using fallback");
        departureTime = new Date();
        arrivalTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours later as fallback
      }
    } catch (error) {
      console.error("Error parsing flight times:", error);
      // Fallback times
      departureTime = new Date();
      arrivalTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    return { departureTime, arrivalTime };
  };

  if (loading) {
    return <div className="ticket-loading">Loading ticket...</div>;
  }

  if (error) {
    return <div className="ticket-error">{error}</div>;
  }

  if (!booking) {
    return <div className="ticket-error">Booking not found</div>;
  }

  const { departureTime, arrivalTime } = getFlightTimes();

  // Calculate flight duration safely
  let durationHours = 0;
  let durationMinutes = 0;

  if (departureTime && arrivalTime) {
    const durationMs = arrivalTime - departureTime;
    durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  }

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "status-confirmed";
      case "cancelled":
        return "status-cancelled";
      case "pending":
        return "status-pending";
      default:
        return "status-default";
    }
  };

  return (
    <div className="booking-ticket">
      {/* Ticket Header */}
      <div className="ticket-header">
        <div className="airline-info">
          <h2 className="airline-name">
            ✈️ {booking.flight.airline.airline_name}
          </h2>
          <p className="airline-code">{booking.flight.airline.airline_code}</p>
        </div>
        <div className="ticket-pnr">
          <p className="pnr-label">PNR Number</p>
          <p className="pnr-number">{booking.pnr_number}</p>
        </div>
      </div>

      {/* Flight Status Banner */}
      <div
        className={`status-banner ${getStatusColor(booking.booking_status)}`}
      >
        <span className="status-icon">
          {booking.booking_status === "confirmed" && "✅"}
          {booking.booking_status === "cancelled" && "❌"}
          {booking.booking_status === "pending" && "⏳"}
        </span>
        <span className="status-text">
          Booking Status:{" "}
          <strong>{booking.booking_status.toUpperCase()}</strong>
        </span>
      </div>

      {/* Main Ticket Content */}
      <div className="ticket-content">
        {/* Flight Route Section - FIXED DATE DISPLAY */}
        <div className="flight-route">
          <div className="departure-section">
            <div className="location-card">
              <p className="time">
                {departureTime
                  ? departureTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </p>
              <p className="date">
                {departureTime
                  ? departureTime.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Invalid Date"}
              </p>
              <p className="city">{booking.flight.source_city}</p>
              <p className="detail">Departure</p>
            </div>
          </div>

          {/* Flight Path Indicator */}
          <div className="flight-path">
            <div className="flight-number">{booking.flight.flight_number}</div>
            <div className="duration-info">
              <p>
                {durationHours}h {durationMinutes}m
              </p>
              <p className="seat-info">Seat: TBD</p>
            </div>
            <svg viewBox="0 0 100 30" className="flight-line">
              <line x1="10" y1="15" x2="90" y2="15" strokeDasharray="5,5" />
              <polygon points="95,15 85,10 85,20" fill="currentColor" />
            </svg>
          </div>

          <div className="arrival-section">
            <div className="location-card">
              <p className="time">
                {arrivalTime
                  ? arrivalTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </p>
              <p className="date">
                {arrivalTime
                  ? arrivalTime.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Invalid Date"}
              </p>
              <p className="city">{booking.flight.destination_city}</p>
              <p className="detail">Arrival</p>
            </div>
          </div>
        </div>

        {/* Rest of your component remains the same */}
        {/* Passenger Details Section */}
        <div className="passenger-section">
          <h3>Passenger Details</h3>
          <div className="passenger-info">
            <div className="info-row">
              <span className="label">Number of Passengers:</span>
              <span className="value">{booking.passengers_count}</span>
            </div>
            <div className="info-row">
              <span className="label">Passenger Names:</span>
              <span className="value">TBD (Check-in Required)</span>
            </div>
          </div>
        </div>

        {/* Booking Details Section */}
        <div className="booking-details-section">
          <h3>Booking Information</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Flight Number</span>
              <span className="detail-value">
                {booking.flight.flight_number}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Route</span>
              <span className="detail-value">
                {booking.flight.source_city} → {booking.flight.destination_city}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Booking Date</span>
              <span className="detail-value">
                {formatDate(booking.booking_date)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Status</span>
              <span
                className={`detail-value payment-${booking.payment_status}`}
              >
                {booking.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Fare Section */}
        <div className="fare-section">
          <h3>Fare Details</h3>
          <div className="fare-breakdown">
            <div className="fare-row">
              <span className="fare-label">
                Base Fare (x {booking.passengers_count} passenger
                {booking.passengers_count > 1 ? "s" : ""})
              </span>
              <span className="fare-value">₹{booking.total_amount}</span>
            </div>
            <div className="fare-row total">
              <span className="fare-label">Total Amount</span>
              <span className="fare-value-total">₹{booking.total_amount}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="terms-section">
          <h3>Important Information</h3>
          <ul className="terms-list">
            <li>✓ Please arrive 2 hours before departure</li>
            <li>✓ Check baggage allowance with the airline</li>
            <li>✓ Carry a valid ID proof during check-in</li>
            <li>✓ Mobile ticket is valid for check-in</li>
            <li>✓ Keep this ticket for reference</li>
          </ul>
        </div>
      </div>

      {/* Ticket Footer */}
      <div className="ticket-footer">
        <p className="footer-text">
          Safe Travels! Have a great journey from {booking.flight.source_city}{" "}
          to {booking.flight.destination_city}
        </p>
        <div className="footer-barcode">
          <p className="barcode-placeholder">||||||||||||||||||||||</p>
          <p className="barcode-text">{booking.pnr_number}</p>
        </div>
      </div>
    </div>
  );
};

export default BookingTicket;
