import React, { useState, useEffect } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "./Navbar";
import { SplitFlapText, SolariStatusBadge } from "./SplitFlapBoard";
import { ChalkArrow, StarburstBadge, RetroStampsBadge } from "./ChalkDoodles";
import DateTumbler from "./DateTumbler";
import CrtMonitor from "./CrtMonitor";
import BoardingTicket from "./BoardingTicket";
import {
  playMechanicalClick,
  playSplitFlap,
  playAlertSound,
} from "../utils/soundEffects";

export const UserDashboard = () => {
  const { user, API_BASE } = useAuth();
  const [activeTab, setActiveTab] = useState("search");

  // Flight Search State
  const [flights, setFlights] = useState([]);
  const [cities, setCities] = useState({ sources: [], destinations: [] });
  const [airlines, setAirlines] = useState([]);
  const [searchParams, setSearchParams] = useState({
    source: "",
    destination: "",
    date: "",
    airline_id: "",
  });
  const [selectedClass, setSelectedClass] = useState("ECN"); // ECN, BIZ, FIRST
  const [loadingFlights, setLoadingFlights] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking Modal State (Panel 4)
  const [bookingModalFlight, setBookingModalFlight] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [selectedTravelDate, setSelectedTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Boarding Pass / Ticket Modal
  const [viewTicketId, setViewTicketId] = useState(null);

  // Delete Confirm Modal
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Notification Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchCities(), fetchAirlines(), searchFlights(), fetchBookings()]);
  };

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cities`);
      setCities(res.data);
    } catch (e) {
      console.error("Failed to load cities", e);
    }
  };

  const fetchAirlines = async () => {
    try {
      const res = await axios.get(`${API_BASE}/airlines`);
      setAirlines(res.data);
    } catch (e) {
      console.error("Failed to load airlines", e);
    }
  };

  const searchFlights = async () => {
    setLoadingFlights(true);
    playSplitFlap();
    try {
      const params = new URLSearchParams();
      if (searchParams.source) params.append("source", searchParams.source);
      if (searchParams.destination)
        params.append("destination", searchParams.destination);
      if (searchParams.date) params.append("date", searchParams.date);
      if (searchParams.airline_id)
        params.append("airline_id", searchParams.airline_id);

      const res = await axios.get(`${API_BASE}/flights?${params}`);
      setFlights(res.data);
    } catch (e) {
      console.error("Search flights failed", e);
    } finally {
      setLoadingFlights(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/bookings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setBookings(res.data);
    } catch (e) {
      console.error("Fetch bookings failed", e);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Open Panel 4 Booking Modal
  const handleOpenBookingModal = (flight) => {
    playMechanicalClick();
    setBookingModalFlight(flight);
    setPassengerCount(1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedTravelDate(tomorrow.toISOString().split("T")[0]);
  };

  // Confirm Flight Booking
  const handleConfirmBooking = async () => {
    if (!bookingModalFlight) return;
    playMechanicalClick();
    setBookingSubmitting(true);

    try {
      const payload = {
        flight_id: bookingModalFlight.flight_id,
        passengers_count: passengerCount,
        payment_method: "credit_card",
      };

      if (bookingModalFlight.is_daily || selectedTravelDate) {
        payload.travel_date = selectedTravelDate;
      }

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/bookings`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      playAlertSound();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setToast({
        type: "success",
        text: `BOOKING DISPATCHED! PNR: ${res.data.pnr_number || "CONFIRMED"}`,
      });
      setTimeout(() => setToast(null), 5000);

      const newBookingId = res.data.booking_id;
      setBookingModalFlight(null);
      await fetchBookings();
      await searchFlights();

      // Automatically show the ticket
      if (newBookingId) {
        setViewTicketId(newBookingId);
      }
    } catch (err) {
      playAlertSound();
      const msg = err.response?.data?.detail || "Booking failed to dispatch";
      setToast({ type: "error", text: msg });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Cancel Booking
  const handleConfirmCancel = async () => {
    if (!bookingToDelete) return;
    setDeletingId(bookingToDelete.booking_id);
    playMechanicalClick();

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/bookings/${bookingToDelete.booking_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setToast({
        type: "success",
        text: `PNR #${bookingToDelete.pnr_number} CANCELLED. SEATS RESTORED.`,
      });
      setTimeout(() => setToast(null), 5000);

      await fetchBookings();
      await searchFlights();
    } catch (err) {
      const msg = err.response?.data?.detail || "Cancellation failed";
      setToast({ type: "error", text: msg });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setDeletingId(null);
      setBookingToDelete(null);
    }
  };

  // Safe time formatting
  const formatTimeOnly = (flight) => {
    if (flight.departure_time_only) return flight.departure_time_only.slice(0, 5);
    try {
      const d = new Date(flight.departure_time);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "12:00";
    }
  };

  const getStatusForFlight = (flight) => {
    if (flight.is_daily) return "ON TIME";
    if (flight.available_seats <= 5) return "BOARDING";
    return "ON TIME";
  };

  return (
    <div className="cockpit-viewport user-dashboard-page">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Toast Alert */}
      {toast && (
        <div className={`cockpit-toast ${toast.type}`}>
          <span
            className={`led-indicator ${
              toast.type === "success" ? "led-green" : "led-red"
            }`}
          ></span>
          <span className="toast-message">{toast.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>
      )}

      <main className="dashboard-content-area">
        {/* =================================================================
            TAB 1: SEARCH FLIGHTS & STATUS (Panel 2)
            ================================================================= */}
        {activeTab === "search" && (
          <div className="search-tab-layout">
            {/* TOP COCKPIT CONSOLE (Panel 2 Top) */}
            <div className="cockpit-bezel flight-search-console">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              {/* Doodles and Stickers from reference image */}
              <StarburstBadge
                type="best-price"
                textTop="BEST"
                textBottom="PRICE!"
                style={{ top: "10px", right: "260px" }}
              />
              <StarburstBadge
                type="limited"
                textTop="&"
                textBottom="LIMITED!"
                style={{ top: "15px", right: "160px" }}
              />
              <ChalkArrow
                color="#f59e0b"
                d="M 10 30 Q 50 80 90 20"
                style={{ top: "5px", left: "20px" }}
              />
              <ChalkArrow
                color="#06b6d4"
                d="M 90 70 Q 50 10 10 50"
                style={{ bottom: "10px", right: "30px" }}
              />

              <div className="console-row-top">
                {/* Mechanical Rotary Dial & Labels */}
                <div className="rotary-unit">
                  <div className="rotary-knob" title="Frequency Dial"></div>
                  <span className="rotary-label">PUSH-80825</span>
                </div>

                {/* Class Selector Tactile Buttons */}
                <div className="console-control-group">
                  <span className="control-group-label">CLASS SELECT</span>
                  <div className="class-selector-group">
                    {["ECN", "BIZ", "FIRST"].map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        className={`tactile-btn class-btn ${
                          selectedClass === cls ? "tactile-btn-primary" : ""
                        }`}
                        onClick={() => {
                          playMechanicalClick();
                          setSelectedClass(cls);
                        }}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Stepper Readouts */}
                <div className="console-control-group">
                  <span className="control-group-label">DEP. DATE</span>
                  <div className="mech-counter-box">
                    <input
                      type="date"
                      value={searchParams.date}
                      onChange={(e) =>
                        setSearchParams({ ...searchParams, date: e.target.value })
                      }
                      className="mech-counter-input"
                    />
                  </div>
                </div>

                {/* Search Action Push Button */}
                <button
                  type="button"
                  className="tactile-btn tactile-btn-primary execute-search-btn"
                  onClick={searchFlights}
                  disabled={loadingFlights}
                >
                  {loadingFlights ? "FLIPPING..." : "SEARCH DISPATCH ➔"}
                </button>
              </div>

              {/* Console Route Filters */}
              <div className="console-row-bottom">
                <div className="filter-select-wrapper">
                  <label className="filter-label">FROM (ORIGIN)</label>
                  <select
                    value={searchParams.source}
                    onChange={(e) => {
                      playMechanicalClick();
                      setSearchParams({ ...searchParams, source: e.target.value });
                    }}
                    className="cockpit-select"
                  >
                    <option value="">ALL ORIGINS [WORLDWIDE]</option>
                    {cities.sources.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-arrow-icon">✈ ➔</div>

                <div className="filter-select-wrapper">
                  <label className="filter-label">TO (DESTINATION)</label>
                  <select
                    value={searchParams.destination}
                    onChange={(e) => {
                      playMechanicalClick();
                      setSearchParams({
                        ...searchParams,
                        destination: e.target.value,
                      });
                    }}
                    className="cockpit-select"
                  >
                    <option value="">ALL DESTINATIONS</option>
                    {cities.destinations.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-wrapper">
                  <label className="filter-label">FLEET AIRLINE</label>
                  <select
                    value={searchParams.airline_id}
                    onChange={(e) => {
                      playMechanicalClick();
                      setSearchParams({
                        ...searchParams,
                        airline_id: e.target.value,
                      });
                    }}
                    className="cockpit-select"
                  >
                    <option value="">ALL CARRIERS</option>
                    {airlines.map((a) => (
                      <option key={a.airline_id} value={a.airline_id}>
                        {a.airline_name.toUpperCase()} ({a.airline_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* MASTER DEPARTURE BOARD (Panel 2 Solari Split-Flap) */}
            <div className="departure-board-frame">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              {/* Hand-drawn chalk arrows on the board */}
              <ChalkArrow
                color="#ec4899"
                d="M 10 10 Q 40 40 70 20"
                style={{ top: "30px", left: "-25px" }}
              />
              <ChalkArrow
                color="#22c55e"
                d="M 50 10 Q 30 50 10 30"
                style={{ bottom: "20px", left: "40%" }}
              />
              <ChalkArrow
                color="#eab308"
                d="M 10 50 Q 50 10 90 40"
                style={{ bottom: "25px", right: "20px" }}
              />

              <div className="departure-board-header">
                <div className="solari-title">
                  <span className="led-indicator led-green"></span>
                  DEPARTURE BOARD
                </div>
                <div className="solari-model-tag">
                  FL10T-FLAP T2LES // DISPATCH FREQ: ACTIVE
                </div>
              </div>

              {/* Solari Departure Rows */}
              <div className="solari-grid">
                {flights.map((flight) => {
                  const status = getStatusForFlight(flight);
                  const timeStr = formatTimeOnly(flight);
                  const priceMultiplier =
                    selectedClass === "FIRST"
                      ? 2.2
                      : selectedClass === "BIZ"
                      ? 1.5
                      : 1;
                  const finalPrice = Math.round(flight.price * priceMultiplier);

                  return (
                    <div key={flight.flight_id} className="solari-row">
                      {/* Split-Flap Route */}
                      <div className="solari-route-col">
                        <SplitFlapText
                          text={flight.source_city || "NYC"}
                          length={3}
                          size="md"
                        />
                        <span className="solari-plane-icon">✈</span>
                        <SplitFlapText
                          text={flight.destination_city || "LND"}
                          length={7}
                          size="md"
                        />
                      </div>

                      {/* Flight Number & Carrier */}
                      <div className="solari-carrier-col">
                        <span className="flight-num-pill">
                          {flight.flight_number}
                        </span>
                        <span className="flight-airline-name">
                          {flight.airline_name}
                        </span>
                        {flight.is_daily && (
                          <span className="daily-tag">DAILY</span>
                        )}
                      </div>

                      {/* Split-Flap Time */}
                      <div className="solari-time-col">
                        <SplitFlapText text={timeStr} length={5} size="md" />
                      </div>

                      {/* Status Badge */}
                      <div className="solari-status-col">
                        <SolariStatusBadge status={status} />
                      </div>

                      {/* Seats & Price */}
                      <div className="solari-price-col">
                        <div className="price-tag">
                          ₹{finalPrice.toLocaleString()}
                        </div>
                        <div className="seats-tag">
                          {flight.is_daily
                            ? `${flight.total_seats} SEATS / DAY`
                            : `${flight.available_seats} SEATS LEFT`}
                        </div>
                      </div>

                      {/* Book Flight Action */}
                      <div className="solari-action-col">
                        <button
                          type="button"
                          className="tactile-btn tactile-btn-primary book-flight-btn"
                          onClick={() => handleOpenBookingModal(flight)}
                        >
                          BOOK ➔
                        </button>
                      </div>
                    </div>
                  );
                })}

                {flights.length === 0 && !loadingFlights && (
                  <div className="solari-empty-state">
                    <SplitFlapText
                      text="NO MATCHING FLIGHTS ON DISPATCH BOARD"
                      length={36}
                      size="md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: MY BOOKINGS (Panel 3)
            ================================================================= */}
        {activeTab === "bookings" && (
          <div className="my-bookings-tab-layout">
            <div className="cockpit-bezel bookings-chassis">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              {/* Maximalist Stickers from Panel 3 */}
              <div className="panel3-stickers-row">
                <RetroStampsBadge text="UTILITY" variant="utility" />
                <RetroStampsBadge text="STAMPS" variant="stamps" />
                <RetroStampsBadge text="LNTD 29%" variant="limited" />
                <RetroStampsBadge text="FLIGHT STATUS" variant="status" />
                <StarburstBadge
                  type="limited"
                  textTop="LIMITED"
                  textBottom="SEATS!"
                  style={{ top: "0px", right: "20px" }}
                />
              </div>

              {/* Decorative Chalk Arrows */}
              <ChalkArrow
                color="#06b6d4"
                d="M 10 30 Q 60 70 120 10"
                style={{ top: "50px", left: "10px" }}
              />
              <ChalkArrow
                color="#f97316"
                d="M 120 50 Q 70 10 10 40"
                style={{ bottom: "20px", right: "30px" }}
              />

              <div className="bookings-header-panel">
                <h2 className="solari-title">
                  <span className="led-indicator led-green"></span>
                  PASSENGER MANIFEST // MY RESERVATIONS
                </h2>
                <button
                  type="button"
                  className="tactile-btn"
                  onClick={fetchBookings}
                >
                  ↻ REFRESH MANIFEST
                </button>
              </div>

              {/* Empty state: Split Flap "NO ACTIVE BOOKINGS FOUND // STATUS: STANDBY..." (Panel 3) */}
              {bookings.length === 0 && !loadingBookings ? (
                <div className="split-flap-empty-chassis">
                  <div className="empty-solari-box">
                    <SplitFlapText
                      text="NO ACTIVE BOOKINGS"
                      length={18}
                      size="lg"
                    />
                    <div style={{ margin: "10px 0" }}>
                      <SplitFlapText
                        text="FOUND // STATUS:"
                        length={16}
                        size="lg"
                      />
                    </div>
                    <SplitFlapText
                      text="STANDBY . . ."
                      length={13}
                      size="lg"
                    />
                  </div>
                  <div style={{ marginTop: "24px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="tactile-btn tactile-btn-primary"
                      onClick={() => setActiveTab("search")}
                    >
                      SEARCH FLIGHTS NOW ➔
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bookings-solari-list">
                  {bookings.map((booking) => {
                    const isCancelled = booking.booking_status === "cancelled";
                    const flight = booking.flight || {};

                    return (
                      <div
                        key={booking.booking_id}
                        className={`booking-manifest-card ${
                          isCancelled ? "manifest-cancelled" : ""
                        }`}
                      >
                        <div className="manifest-top">
                          <div className="manifest-pnr">
                            <span className="pnr-label">PNR:</span>
                            <span className="pnr-code">
                              {booking.pnr_number}
                            </span>
                          </div>

                          <div className="manifest-route">
                            <SplitFlapText
                              text={flight.source_city || "NYC"}
                              length={3}
                              size="sm"
                            />
                            <span className="solari-plane-icon">✈</span>
                            <SplitFlapText
                              text={flight.destination_city || "LND"}
                              length={3}
                              size="sm"
                            />
                          </div>

                          <SolariStatusBadge
                            status={booking.booking_status || "CONFIRMED"}
                          />
                        </div>

                        <div className="manifest-details">
                          <div className="manifest-item">
                            <span className="manifest-label">PASSENGERS</span>
                            <span className="manifest-val">
                              {booking.passengers_count}
                            </span>
                          </div>

                          <div className="manifest-item">
                            <span className="manifest-label">TRAVEL DATE</span>
                            <span className="manifest-val">
                              {booking.travel_date
                                ? new Date(
                                    booking.travel_date
                                  ).toLocaleDateString()
                                : "CONFIRMED SCHEDULE"}
                            </span>
                          </div>

                          <div className="manifest-item">
                            <span className="manifest-label">TOTAL FARE</span>
                            <span className="manifest-val manifest-price">
                              ₹{booking.total_amount?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="manifest-actions">
                          <button
                            type="button"
                            className="tactile-btn tactile-btn-primary"
                            onClick={() => {
                              playMechanicalClick();
                              setViewTicketId(booking.booking_id);
                            }}
                          >
                            🎫 VIEW BOARDING PASS
                          </button>

                          {!isCancelled && (
                            <button
                              type="button"
                              className="tactile-btn tactile-btn-danger"
                              onClick={() => {
                                playMechanicalClick();
                                setBookingToDelete(booking);
                              }}
                            >
                              ✕ CANCEL FLIGHT
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================
          PANEL 4: DATE SELECT, CONFIRMATION & CHECKOUT MODAL
          ================================================================= */}
      {bookingModalFlight && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel panel4-modal">
            <div className="rivet rivet-tl"></div>
            <div className="rivet rivet-tr"></div>
            <div className="rivet rivet-bl"></div>
            <div className="rivet rivet-br"></div>

            <div className="panel4-modal-header">
              <h3 className="cockpit-plate-title">
                DATE SELECT, CONFIRMATION &amp; CHECKOUT
              </h3>
              <button
                type="button"
                className="retro-win-btn close"
                onClick={() => setBookingModalFlight(null)}
              >
                ✕
              </button>
            </div>

            <div className="panel4-modal-grid">
              {/* LEFT: MECHANICAL DATE TUMBLER */}
              <div className="panel4-left">
                <DateTumbler
                  value={selectedTravelDate}
                  onChange={(dateStr) => setSelectedTravelDate(dateStr)}
                />

                {/* PASSENGER COUNTER */}
                <div className="passenger-stepper-box">
                  <span className="passenger-stepper-label">
                    PASSENGER COUNT:
                  </span>
                  <div className="stepper-controls">
                    <button
                      type="button"
                      className="tactile-btn"
                      onClick={() => {
                        playMechanicalClick();
                        setPassengerCount((p) => Math.max(1, p - 1));
                      }}
                    >
                      -
                    </button>
                    <span className="stepper-display">{passengerCount}</span>
                    <button
                      type="button"
                      className="tactile-btn"
                      onClick={() => {
                        playMechanicalClick();
                        setPassengerCount((p) => Math.min(9, p + 1));
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: TACTICAL CRT FLIGHT MONITOR */}
              <div className="panel4-right">
                <CrtMonitor
                  flightNumber={bookingModalFlight.flight_number}
                  source={bookingModalFlight.source_city}
                  destination={bookingModalFlight.destination_city}
                  passengers={passengerCount}
                  price={bookingModalFlight.price}
                  airline={bookingModalFlight.airline_name}
                  departureTime={formatTimeOnly(bookingModalFlight)}
                />
              </div>
            </div>

            {/* CONFIRMATION ALERTS DIALOGUE BOX (from Panel 4 bottom) */}
            <div className="confirmation-alerts-box">
              <div className="alert-content-row">
                <div className="alert-warning-icon">⚠️</div>
                <div className="alert-warning-text">
                  <strong>CONFIRMATION ALERTS // AIR TRAFFIC DISPATCH</strong>
                  <p>
                    Your reservation coordinates are confirmed upon lock. Seat
                    allocation will be validated on the master passenger manifest.
                  </p>
                </div>
              </div>

              <div className="alert-buttons-row">
                <button
                  type="button"
                  className="tactile-btn tactile-btn-primary confirm-booking-btn"
                  onClick={handleConfirmBooking}
                  disabled={bookingSubmitting}
                >
                  {bookingSubmitting ? "DISPATCHING..." : "CONFIRM BOOKING ➔"}
                </button>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-danger"
                  onClick={() => setBookingModalFlight(null)}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          BOARDING PASS MODAL (Panel 4 Tickets)
          ================================================================= */}
      {viewTicketId && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel ticket-view-modal">
            <div className="ticket-view-header">
              <h3 className="cockpit-plate-title">OFFICIAL BOARDING PASS</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-primary"
                  onClick={() => {
                    playMechanicalClick();
                    window.print();
                  }}
                >
                  🖨 PRINT PASS
                </button>
                <button
                  type="button"
                  className="retro-win-btn close"
                  onClick={() => setViewTicketId(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <BoardingTicket bookingId={viewTicketId} API_BASE={API_BASE} />
          </div>
        </div>
      )}

      {/* =================================================================
          DELETE CONFIRMATION MODAL
          ================================================================= */}
      {bookingToDelete && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel delete-modal">
            <h3 className="cockpit-plate-title" style={{ color: "#ef4444" }}>
              ⚠️ CANCEL RESERVATION
            </h3>
            <p style={{ margin: "14px 0", fontSize: "1.1rem" }}>
              Confirm cancellation of flight PNR{" "}
              <strong>{bookingToDelete.pnr_number}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-danger"
                onClick={handleConfirmCancel}
                disabled={deletingId === bookingToDelete.booking_id}
              >
                {deletingId ? "CANCELLING..." : "YES, CANCEL RESERVATION"}
              </button>
              <button
                type="button"
                className="tactile-btn"
                onClick={() => setBookingToDelete(null)}
              >
                KEEP RESERVATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Ticker Tape */}
      <div className="ticker-bar">
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          SYS_STATUS: ONLINE
        </div>
        <div className="ticker-text" style={{ color: "#facc15" }}>
          FLIGHT RADAR ACTIVE // DISPATCH READY // SOLARI SYSTEM NOMINAL
        </div>
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          SYS_STATUS: ONLINE
        </div>
      </div>
      <div className="hazard-tape"></div>
    </div>
  );
};

export default UserDashboard;
