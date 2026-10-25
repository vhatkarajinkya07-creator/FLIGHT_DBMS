import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BookingTicket from "./BookingTicket";
import TerminalBar from "./TerminalBar";
import { SplitFlapText } from "./SplitFlap";
import { terminalAudio } from "../utils/audio";

const UserDashboard = () => {
  const { user, logout, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cities, setCities] = useState({ sources: [], destinations: [] });
  const [airlines, setAirlines] = useState([]);
  const [searchParams, setSearchParams] = useState({
    source: "",
    destination: "",
    date: "",
    airline_id: "",
  });

  const [selectedClass, setSelectedClass] = useState("EN"); // EN, BP, 1ST
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search"); // "search" | "bookings"

  // Date select & booking confirmation modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [passengersCount, setPassengersCount] = useState(1);
  const [travelDate, setTravelDate] = useState({
    day: new Date().getDate().toString().padStart(2, "0"),
    month: (new Date().getMonth() + 1).toString().padStart(2, "0"),
    year: new Date().getFullYear().toString(),
  });

  // Cancel booking modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);

  // Ticket modal
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchCities();
    fetchBookings();
    fetchAirlines();
    searchFlights();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cities`);
      setCities(response.data);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchAirlines = async () => {
    try {
      const response = await axios.get(`${API_BASE}/airlines`);
      setAirlines(response.data);
    } catch (error) {
      console.error("Error fetching airlines:", error);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const response = await axios.get(`${API_BASE}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const searchFlights = async () => {
    setLoading(true);
    terminalAudio.playFlapClick();
    try {
      const params = new URLSearchParams();
      if (searchParams.source) params.append("source", searchParams.source);
      if (searchParams.destination)
        params.append("destination", searchParams.destination);
      if (searchParams.date) params.append("date", searchParams.date);
      if (searchParams.airline_id)
        params.append("airline_id", searchParams.airline_id);

      const response = await axios.get(`${API_BASE}/flights?${params}`);
      setFlights(response.data);
    } catch (error) {
      console.error("Error searching flights:", error);
    }
    setLoading(false);
  };

  const openBookingModal = (flight) => {
    terminalAudio.playBeep(600, 0.08);
    const today = new Date();
    // Default to tomorrow or flight date
    const d = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    setTravelDate({
      day: d.getDate().toString().padStart(2, "0"),
      month: (d.getMonth() + 1).toString().padStart(2, "0"),
      year: d.getFullYear().toString(),
    });
    setPassengersCount(1);
    setSelectedFlight(flight);
    setShowBookingModal(true);
  };

  const handleStepDay = (delta) => {
    terminalAudio.playFlapClick();
    setTravelDate((prev) => {
      let d = parseInt(prev.day, 10) + delta;
      if (d < 1) d = 31;
      if (d > 31) d = 1;
      return { ...prev, day: d.toString().padStart(2, "0") };
    });
  };

  const handleStepMonth = (delta) => {
    terminalAudio.playFlapClick();
    setTravelDate((prev) => {
      let m = parseInt(prev.month, 10) + delta;
      if (m < 1) m = 12;
      if (m > 12) m = 1;
      return { ...prev, month: m.toString().padStart(2, "0") };
    });
  };

  const handleStepYear = (delta) => {
    terminalAudio.playFlapClick();
    setTravelDate((prev) => {
      let y = parseInt(prev.year, 10) + delta;
      const curYear = new Date().getFullYear();
      if (y < curYear) y = curYear;
      if (y > curYear + 5) y = curYear;
      return { ...prev, year: y.toString() };
    });
  };

  const handleStepPassengers = (delta) => {
    terminalAudio.playFlapClick();
    setPassengersCount((prev) => {
      const next = prev + delta;
      return next >= 1 && next <= 9 ? next : prev;
    });
  };

  const confirmBooking = async () => {
    if (!selectedFlight) return;
    setLoading(true);
    terminalAudio.playBeep(880, 0.08);

    const formattedTravelDate = `${travelDate.year}-${travelDate.month}-${travelDate.day}`;

    try {
      const bookingData = {
        flight_id: selectedFlight.flight_id,
        passengers_count: passengersCount,
        payment_method: "credit_card",
      };

      if (selectedFlight.is_daily || formattedTravelDate) {
        bookingData.travel_date = formattedTravelDate;
      }

      const res = await axios.post(`${API_BASE}/bookings`, bookingData);
      terminalAudio.playGranted();
      setNotification({
        type: "success",
        message: "CLEARANCE APPROVED: Flight reservation locked in manifest!",
      });

      setShowBookingModal(false);
      setSelectedFlight(null);
      await fetchBookings();
      await searchFlights();

      // If booking id is returned, open ticket directly or switch to bookings
      if (res.data?.booking_id) {
        setSelectedBookingId(res.data.booking_id);
        setShowTicketModal(true);
      } else {
        setActiveTab("bookings");
      }
    } catch (error) {
      terminalAudio.playAlert();
      setNotification({
        type: "error",
        message: "BOOKING REJECTED: " + (error.response?.data?.detail || "Unknown error occurred"),
      });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeleteBooking = (booking) => {
    terminalAudio.playBeep(350, 0.08);
    setBookingToDelete(booking);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    setDeletingBookingId(bookingToDelete.booking_id);
    try {
      await axios.delete(`${API_BASE}/bookings/${bookingToDelete.booking_id}`);
      terminalAudio.playGranted();
      setNotification({
        type: "success",
        message: `DISPATCH NOTICE: Booking PNR #${bookingToDelete.pnr_number} cancelled.`,
      });
      await fetchBookings();
      await searchFlights();
    } catch (error) {
      terminalAudio.playAlert();
      const errorMessage =
        error.response?.data?.detail || "Failed to cancel booking";
      setNotification({
        type: "error",
        message: `REDUCTION ERROR: ${errorMessage}`,
      });
    } finally {
      setDeletingBookingId(null);
      setShowDeleteConfirm(false);
      setBookingToDelete(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const canCancelBooking = (booking) => {
    if (booking.booking_status === "cancelled") return false;
    if (booking.travel_date) {
      const bDate = new Date(booking.travel_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bDate >= today;
    }
    return true;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleViewTicket = (bookingId) => {
    terminalAudio.playBeep(660, 0.08);
    setSelectedBookingId(bookingId);
    setShowTicketModal(true);
  };

  return (
    <div className="aero-terminal-page">
      <TerminalBar user={user} onLogout={handleLogout} />

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className={`terminal-toast-banner ${notification.type}`}>
          <div className="toast-inner">
            <span className="toast-icon">
              {notification.type === "success" ? "✔" : "⚠"}
            </span>
            <span className="toast-text">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="toast-close-btn"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD CONSOLE HEADER (From Screen 3: Dashboard / My Bookings) */}
      <div className="cockpit-sub-header">
        <div className="breadcrumb-box">
          <span className="bc-main">Dashboard</span>
          <span className="bc-slash">/</span>
          <span className="bc-sub">
            {activeTab === "search" ? "Flight Dispatch" : "My Bookings"}
          </span>
        </div>

        <nav className="cockpit-nav-pills">
          <button
            onClick={() => {
              terminalAudio.playBeep(520, 0.06);
              setActiveTab("search");
            }}
            className={`cockpit-pill-btn ${activeTab === "search" ? "active-glow" : ""}`}
          >
            ✈ SEARCH FLIGHTS
          </button>
          <button
            onClick={() => {
              terminalAudio.playBeep(520, 0.06);
              setActiveTab("bookings");
            }}
            className={`cockpit-pill-btn ${activeTab === "bookings" ? "active-glow" : ""}`}
          >
            📋 MY BOOKINGS ({bookings.length})
          </button>
        </nav>

        <div className="user-clearance-tag">
          <span className="tag-pilot-ico">👤</span>
          <span className="tag-name">{user?.username?.toUpperCase()}</span>
          <span className="tag-level">CLEARANCE: PASSENGER</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="cockpit-main-content">
        {/* ======================================================== */}
        {/* TAB 1: SEARCH FLIGHTS & STATUS BOARD (Matching Screen 2) */}
        {/* ======================================================== */}
        {activeTab === "search" && (
          <div className="search-and-departure-view">
            {/* TOP MECHANICAL CONTROL STRIP (Screen 2: Dep. Date, Ret. Date, Class, Knobs) */}
            <div className="industrial-control-deck">
              <div className="control-deck-row">
                {/* FROM SOURCE SELECTOR */}
                <div className="control-group">
                  <label className="control-label">SOURCE [DEP]</label>
                  <div className="control-input-wrap">
                    <select
                      value={searchParams.source}
                      onChange={(e) => {
                        terminalAudio.playFlapClick();
                        setSearchParams({ ...searchParams, source: e.target.value });
                      }}
                      className="cockpit-select"
                    >
                      <option value="">ALL SOURCES</option>
                      {cities.sources.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DESTINATION SELECTOR */}
                <div className="control-group">
                  <label className="control-label">DESTINATION [ARR]</label>
                  <div className="control-input-wrap">
                    <select
                      value={searchParams.destination}
                      onChange={(e) => {
                        terminalAudio.playFlapClick();
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
                </div>

                {/* DATE SELECTOR */}
                <div className="control-group">
                  <label className="control-label">DEP. DATE</label>
                  <div className="control-input-wrap date-wrap">
                    <input
                      type="date"
                      value={searchParams.date}
                      onChange={(e) => {
                        terminalAudio.playFlapClick();
                        setSearchParams({ ...searchParams, date: e.target.value });
                      }}
                      className="cockpit-input-date"
                    />
                  </div>
                </div>

                {/* AIRLINE FILTER */}
                <div className="control-group">
                  <label className="control-label">AIRLINE FLEET</label>
                  <div className="control-input-wrap">
                    <select
                      value={searchParams.airline_id}
                      onChange={(e) => {
                        terminalAudio.playFlapClick();
                        setSearchParams({
                          ...searchParams,
                          airline_id: e.target.value,
                        });
                      }}
                      className="cockpit-select"
                    >
                      <option value="">ANY CARRIER</option>
                      {airlines.map((a) => (
                        <option key={a.airline_id} value={a.airline_id}>
                          {a.airline_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CLASS TOGGLES: [EN] [BP] [1ST] */}
                <div className="control-group">
                  <label className="control-label">CABIN CLASS</label>
                  <div className="class-toggle-group">
                    {["EN", "BP", "1ST"].map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          terminalAudio.playBeep(720, 0.05);
                          setSelectedClass(cls);
                        }}
                        className={`class-btn ${selectedClass === cls ? "active" : ""}`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SEARCH ACTION BUTTON */}
                <div className="control-group action-group">
                  <button
                    onClick={searchFlights}
                    disabled={loading}
                    className="cockpit-search-btn"
                  >
                    {loading ? "SCANNING..." : "SCAN DEPARTURES ➔"}
                  </button>
                </div>
              </div>
            </div>

            {/* MECHANICAL SPLIT-FLAP DEPARTURE BOARD */}
            <div className="departure-board-frame">
              {/* Frame Hex Screws */}
              <span className="hex-screw top-left"></span>
              <span className="hex-screw top-right"></span>
              <span className="hex-screw bottom-left"></span>
              <span className="hex-screw bottom-right"></span>

              <div className="board-header-strip">
                <div className="board-title-group">
                  <h2 className="board-main-title">DEPARTURE BOARD</h2>
                  <span className="board-model-sub">FL10T-FLAP TILES // REAL-TIME DISPATCH</span>
                </div>

                {/* STICKERS FROM SCREEN 2: BEST PRICE! and & LIMITED! */}
                <div className="board-badges-group">
                  <div className="sticker-burst burst-orange">
                    <span className="star-text">BEST PRICE!</span>
                  </div>
                  <div className="sticker-burst burst-yellow">
                    <span className="star-text">& LIMITED!</span>
                  </div>
                </div>
              </div>

              {/* SPLIT FLAP TABLE HEADER */}
              <div className="split-board-table-header">
                <span className="col-flight">FLIGHT NO</span>
                <span className="col-route">ROUTE (ORIGIN ➔ DEST)</span>
                <span className="col-time">SCHEDULE</span>
                <span className="col-seats">AVAILABILITY</span>
                <span className="col-price">PRICE</span>
                <span className="col-status">STATUS</span>
                <span className="col-action">MANIFEST</span>
              </div>

              {/* FLIGHT ROWS */}
              <div className="departure-rows-container">
                {flights.map((flight, idx) => {
                  const isDelayed = idx === 0 && flight.flight_number.includes("1");
                  const status = flight.is_daily ? "ON TIME" : isDelayed ? "DELAYED" : "BOARDING";
                  const statusColor =
                    status === "ON TIME"
                      ? "green"
                      : status === "DELAYED"
                      ? "amber"
                      : "yellow";

                  const src = (flight.source_city || "---").toUpperCase();
                  const dst = (flight.destination_city || "---").toUpperCase();
                  const timeStr = flight.departure_time_only || (flight.departure_time ? new Date(flight.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "12:00 PM");

                  return (
                    <div key={flight.flight_id} className="departure-flight-row">
                      {/* Flight Number split flap */}
                      <div className="row-col col-flight">
                        <span className="airline-mini-badge">{flight.airline_name}</span>
                        <SplitFlapText
                          text={flight.flight_number}
                          length={6}
                          color="ivory"
                          animate={false}
                        />
                      </div>

                      {/* Route */}
                      <div className="row-col col-route">
                        <div className="flap-route-inline">
                          <SplitFlapText text={src.slice(0, 3)} length={3} color="ivory" animate={false} />
                          <span className="flap-route-plane">✈</span>
                          <SplitFlapText text={dst.slice(0, 3)} length={3} color="ivory" animate={false} />
                        </div>
                        <span className="full-route-names">{flight.source_city} to {flight.destination_city}</span>
                      </div>

                      {/* Time */}
                      <div className="row-col col-time">
                        <div className="time-display">
                          <span className="time-val">{timeStr}</span>
                          {flight.is_daily && (
                            <span className="daily-tag">DAILY</span>
                          )}
                        </div>
                      </div>

                      {/* Seats */}
                      <div className="row-col col-seats">
                        <span className="seats-count">
                          {flight.is_daily
                            ? `${flight.total_seats} SEATS`
                            : `${flight.available_seats} SEATS`}
                        </span>
                        <span className="class-spec">{selectedClass} CABIN</span>
                      </div>

                      {/* Price */}
                      <div className="row-col col-price">
                        <span className="price-tag">₹{flight.price.toLocaleString()}</span>
                      </div>

                      {/* Status indicator with neon glow */}
                      <div className="row-col col-status">
                        <span className={`status-pill status-${statusColor}`}>
                          <span className="status-dot"></span>
                          {status}
                        </span>
                      </div>

                      {/* Action Button */}
                      <div className="row-col col-action">
                        <button
                          onClick={() => openBookingModal(flight)}
                          className="book-flight-btn"
                        >
                          BOOK NOW ➔
                        </button>
                      </div>
                    </div>
                  );
                })}

                {flights.length === 0 && !loading && (
                  <div className="empty-board-message">
                    <SplitFlapText
                      text="NO MATCHING FLIGHTS"
                      length={19}
                      color="amber"
                      align="center"
                    />
                    <p className="empty-sub">
                      ADJUST ROUTE SELECTORS OR SCAN ALL DESTINATIONS
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MY BOOKINGS (Matching Screen 3)                   */}
        {/* ======================================================== */}
        {activeTab === "bookings" && (
          <div className="my-bookings-view">
            <div className="bolted-chassis-frame">
              <span className="hex-screw top-left"></span>
              <span className="hex-screw top-right"></span>
              <span className="hex-screw bottom-left"></span>
              <span className="hex-screw bottom-right"></span>

              {/* VINTAGE STICKERS FROM SCREEN 3 */}
              <div className="chassis-stickers">
                <div className="sticker-tag tag-utility">UTILITY</div>
                <div className="sticker-tag tag-stamps">STAMPS</div>
                <div className="sticker-tag tag-lntd">LNTD 29%</div>
                <div className="sticker-badge badge-flight-status">FLIGHT STATUS</div>
                <div className="sticker-starburst starburst-limited">LIMITED!</div>
              </div>

              <div className="chassis-header">
                <h2 className="chassis-title">ACTIVE PASSENGER MANIFESTS</h2>
                <span className="chassis-sub">OFFICIAL FLIGHT CLEARANCE REGISTER</span>
              </div>

              {loadingBookings ? (
                <div className="loading-manifest-box">
                  <span className="beacon-led pulse-amber"></span>
                  <p>QUERYING FLIGHT DISPATCH RECORDS...</p>
                </div>
              ) : bookings.length === 0 ? (
                /* SCREEN 3 NO ACTIVE BOOKINGS DISPLAY */
                <div className="no-bookings-split-flap-box">
                  <div className="flap-message-board">
                    <div className="message-line">
                      <SplitFlapText
                        text="NO ACTIVE BOOKINGS"
                        length={18}
                        color="ivory"
                        align="center"
                      />
                    </div>
                    <div className="message-line">
                      <SplitFlapText
                        text="FOUND // STATUS:"
                        length={18}
                        color="amber"
                        align="center"
                      />
                    </div>
                    <div className="message-line">
                      <SplitFlapText
                        text="STANDBY..."
                        length={18}
                        color="green"
                        align="center"
                      />
                    </div>
                  </div>
                  <div className="standby-actions">
                    <button
                      onClick={() => setActiveTab("search")}
                      className="cockpit-search-btn"
                    >
                      SCAN SCHEDULE & BOOK A FLIGHT ➔
                    </button>
                  </div>
                </div>
              ) : (
                /* LIST OF ACTIVE BOOKINGS */
                <div className="bookings-grid-deck">
                  {bookings.map((booking) => (
                    <div
                      key={booking.booking_id}
                      className={`booking-manifest-card ${
                        booking.booking_status === "cancelled" ? "cancelled-card" : ""
                      }`}
                    >
                      <div className="manifest-card-header">
                        <div className="pnr-strip">
                          <span className="pnr-tag">PNR CODE</span>
                          <span className="pnr-val">{booking.pnr_number}</span>
                        </div>
                        <span
                          className={`manifest-status-pill status-${
                            booking.booking_status === "confirmed"
                              ? "confirmed"
                              : booking.booking_status === "cancelled"
                              ? "cancelled"
                              : "pending"
                          }`}
                        >
                          {booking.booking_status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="manifest-route-info">
                        <div className="flight-id-badge">
                          FLIGHT: {booking.flight?.flight_number || "AERO"}
                        </div>
                        <div className="route-arrow-row">
                          <span className="route-city">{booking.flight?.source_city || "DEP"}</span>
                          <span className="route-plane">✈ ── ✈</span>
                          <span className="route-city">{booking.flight?.destination_city || "ARR"}</span>
                        </div>
                      </div>

                      <div className="manifest-details-grid">
                        <div className="m-detail">
                          <span className="m-label">PASSENGERS:</span>
                          <span className="m-val">{booking.passengers_count} PERSON(S)</span>
                        </div>
                        <div className="m-detail">
                          <span className="m-label">TRAVEL DATE:</span>
                          <span className="m-val">
                            {booking.travel_date
                              ? new Date(booking.travel_date).toLocaleDateString()
                              : "STANDARD FLIGHT"}
                          </span>
                        </div>
                        <div className="m-detail">
                          <span className="m-label">TOTAL FARE:</span>
                          <span className="m-val fare-price">₹{booking.total_amount}</span>
                        </div>
                        <div className="m-detail">
                          <span className="m-label">PAYMENT:</span>
                          <span className="m-val">{booking.payment_status?.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="manifest-actions-row">
                        <button
                          onClick={() => handleViewTicket(booking.booking_id)}
                          className="manifest-view-ticket-btn"
                        >
                          🎫 VIEW BOARDING PASS
                        </button>

                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => handleDeleteBooking(booking)}
                            disabled={deletingBookingId === booking.booking_id}
                            className="manifest-cancel-btn"
                          >
                            {deletingBookingId === booking.booking_id
                              ? "CANCELLING..."
                              : "✕ CANCEL"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* SCREEN 4: DATE SELECT, CONFIRMATION & CHECKOUT MODAL                      */}
      {/* ========================================================================= */}
      {showBookingModal && selectedFlight && (
        <div className="modal-backdrop">
          <div className="modal-chassis-window">
            <div className="window-header-bar">
              <div className="window-title-left">
                <span className="plane-icon">✈</span>
                <span className="window-title">SELECT TRAVEL DATE & CHECKOUT</span>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="modal-close-cross"
              >
                ✕
              </button>
            </div>

            <div className="modal-body-two-panel">
              {/* LEFT PANEL: MECHANICAL FLIP-DIGIT REEL COUNTER (Screen 4) */}
              <div className="modal-left-control">
                <h3 className="section-title">SELECT TRAVEL DATE</h3>

                <div className="flip-date-reel-container">
                  {/* DAY COUNTER */}
                  <div className="reel-column">
                    <button
                      type="button"
                      onClick={() => handleStepDay(1)}
                      className="reel-step-btn"
                    >
                      ▲
                    </button>
                    <div className="reel-tile">
                      <SplitFlapText text={travelDate.day} length={2} color="ivory" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStepDay(-1)}
                      className="reel-step-btn"
                    >
                      ▼
                    </button>
                    <span className="reel-label">DD</span>
                  </div>

                  <span className="reel-separator">/</span>

                  {/* MONTH COUNTER */}
                  <div className="reel-column">
                    <button
                      type="button"
                      onClick={() => handleStepMonth(1)}
                      className="reel-step-btn"
                    >
                      ▲
                    </button>
                    <div className="reel-tile">
                      <SplitFlapText text={travelDate.month} length={2} color="ivory" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStepMonth(-1)}
                      className="reel-step-btn"
                    >
                      ▼
                    </button>
                    <span className="reel-label">MM</span>
                  </div>

                  <span className="reel-separator">/</span>

                  {/* YEAR COUNTER */}
                  <div className="reel-column">
                    <button
                      type="button"
                      onClick={() => handleStepYear(1)}
                      className="reel-step-btn"
                    >
                      ▲
                    </button>
                    <div className="reel-tile">
                      <SplitFlapText text={travelDate.year} length={4} color="ivory" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStepYear(-1)}
                      className="reel-step-btn"
                    >
                      ▼
                    </button>
                    <span className="reel-label">YYYY</span>
                  </div>
                </div>

                {/* PASSENGERS STEPPER */}
                <div className="passengers-reel-row">
                  <span className="reel-group-title">PASSENGERS:</span>
                  <div className="stepper-box">
                    <button
                      type="button"
                      onClick={() => handleStepPassengers(-1)}
                      className="stepper-btn"
                    >
                      -
                    </button>
                    <span className="stepper-val">{passengersCount}</span>
                    <button
                      type="button"
                      onClick={() => handleStepPassengers(1)}
                      className="stepper-btn"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* CONFIRMATION ALERTS BOX (From Screen 4) */}
                <div className="confirmation-alerts-box">
                  <div className="alert-box-header">
                    <span className="alert-tri-icon">⚠</span>
                    <span className="alert-box-title">CONFIRMATION ALERTS</span>
                  </div>
                  <p className="alert-box-text">
                    Your reservation creates an electronic manifest dispatch. Cancellation is permitted prior to scheduled flight departure.
                  </p>
                </div>

                <div className="modal-actions-bar">
                  <button
                    onClick={confirmBooking}
                    disabled={loading}
                    className="confirm-booking-btn"
                  >
                    {loading ? "LOCKING MANIFEST..." : "CONFIRM BOOKING ➔"}
                  </button>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="cancel-modal-btn"
                  >
                    CANCEL
                  </button>
                </div>
              </div>

              {/* RIGHT PANEL: CRT MONITOR RADAR PREVIEW (Screen 4) */}
              <div className="modal-right-monitor">
                <div className="crt-monitor-frame">
                  <div className="crt-scanline-screen">
                    <div className="crt-bezel-reflection"></div>
                    <div className="crt-terminal-readout">
                      <div className="crt-row">
                        <span className="crt-label">FLIGHT:</span>
                        <span className="crt-val">{selectedFlight.flight_number}</span>
                      </div>
                      <div className="crt-row">
                        <span className="crt-label">AIRLINE:</span>
                        <span className="crt-val">{selectedFlight.airline_name}</span>
                      </div>
                      <div className="crt-row">
                        <span className="crt-label">ROUTE:</span>
                        <span className="crt-val highlight">
                          [ {selectedFlight.source_city?.toUpperCase()} =====&gt;&gt; {selectedFlight.destination_city?.toUpperCase()} ]
                        </span>
                      </div>
                      <div className="crt-row">
                        <span className="crt-label">PASSENGERS:</span>
                        <span className="crt-val">{passengersCount}</span>
                      </div>
                      <div className="crt-row">
                        <span className="crt-label">CABIN:</span>
                        <span className="crt-val">{selectedClass} CLASS</span>
                      </div>
                      <div className="crt-row">
                        <span className="crt-label">DATE:</span>
                        <span className="crt-val">
                          {travelDate.day}.{travelDate.month}.{travelDate.year}
                        </span>
                      </div>
                      <div className="crt-separator">====================================</div>
                      <div className="crt-row total-row">
                        <span className="crt-label">TOTAL FARE:</span>
                        <span className="crt-val crt-price">
                          ₹{(selectedFlight.price * passengersCount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VINTAGE BOARDING PASS MODAL (Screen 4)                                     */}
      {/* ========================================================================= */}
      {showTicketModal && selectedBookingId && (
        <div className="modal-backdrop">
          <div className="ticket-modal-chassis">
            <button
              onClick={() => {
                setShowTicketModal(false);
                setSelectedBookingId(null);
              }}
              className="ticket-modal-close-x"
            >
              ✕
            </button>
            <BookingTicket bookingId={selectedBookingId} API_BASE={API_BASE} />
            <div className="ticket-modal-footer-actions">
              <button
                onClick={() => window.print()}
                className="ticket-print-action-btn"
              >
                🖨️ PRINT BOARDING PASS
              </button>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedBookingId(null);
                }}
                className="ticket-dismiss-btn"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE / CANCEL CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {showDeleteConfirm && bookingToDelete && (
        <div className="modal-backdrop">
          <div className="modal-chassis-window small-confirm">
            <div className="window-header-bar">
              <div className="window-title-left">
                <span className="plane-icon">⚠</span>
                <span className="window-title">CANCEL FLIGHT RESERVATION</span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="modal-close-cross"
              >
                ✕
              </button>
            </div>

            <div className="confirm-modal-inner">
              <p className="confirm-warning-desc">
                Are you sure you want to cancel PNR <strong>#{bookingToDelete.pnr_number}</strong>?
              </p>
              <div className="confirm-summary-box">
                <div>ROUTE: {bookingToDelete.flight?.source_city} → {bookingToDelete.flight?.destination_city}</div>
                <div>PASSENGERS: {bookingToDelete.passengers_count}</div>
                <div>REFUND AMOUNT: ₹{bookingToDelete.total_amount}</div>
              </div>
              <div className="confirm-btn-actions">
                <button
                  onClick={confirmDeleteBooking}
                  disabled={deletingBookingId === bookingToDelete.booking_id}
                  className="confirm-cancel-execute-btn"
                >
                  {deletingBookingId === bookingToDelete.booking_id
                    ? "CANCELLING..."
                    : "YES, CANCEL BOOKING"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="keep-booking-btn"
                >
                  KEEP RESERVATION
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="aero-bottom-hazard-bar">
        <div className="hazard-tape"></div>
        <div className="hazard-bar-status">
          <span className="status-item">
            <span className="beacon-led pulse-green"></span> SYS_STATUS: ONLINE
          </span>
          <span className="status-item">
            CONNECTED TO CENTRAL AIRWAYS DISPATCH // FL10T-FLAP
          </span>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;
