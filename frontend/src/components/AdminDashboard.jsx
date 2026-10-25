import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BookingTicket from "./BookingTicket";
import TerminalBar from "./TerminalBar";
import { SplitFlapText } from "./SplitFlap";
import { terminalAudio } from "../utils/audio";

const AdminDashboard = () => {
  const { user, logout, API_BASE } = useAuth();
  const navigate = useNavigate();

  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [airlines, setAirlines] = useState([]);

  const [showAddFlight, setShowAddFlight] = useState(false);
  const [showEditFlight, setShowEditFlight] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState(null);
  const [showAddAirline, setShowAddAirline] = useState(false);

  const [newFlight, setNewFlight] = useState({
    flight_number: "",
    airline_id: "",
    source_city: "",
    destination_city: "",
    departure_time: "",
    arrival_time: "",
    total_seats: 180,
    price: 0,
    is_daily: false,
  });

  const [newAirline, setNewAirline] = useState({
    airline_name: "",
    airline_code: "",
  });

  const [activeTab, setActiveTab] = useState("flights"); // flights | bookings | airlines
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchFlights();
    fetchBookings();
    fetchAirlines();
  }, []);

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchFlights = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const res = await axios.get(`${API_BASE}/admin/flights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFlights(res.data);
    } catch (error) {
      if (error.response?.status === 401) navigate("/login");
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const res = await axios.get(`${API_BASE}/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (error) {
      if (error.response?.status === 401) navigate("/login");
    }
  };

  const fetchAirlines = async () => {
    try {
      const res = await axios.get(`${API_BASE}/airlines`);
      setAirlines(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddFlight = async (e) => {
    e.preventDefault();
    terminalAudio.playBeep(700, 0.08);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/admin/flights`, newFlight, {
        headers: { Authorization: `Bearer ${token}` },
      });
      terminalAudio.playGranted();
      notify("success", "ATC CLEARANCE: New flight registered to manifest!");
      setShowAddFlight(false);
      setNewFlight({
        flight_number: "",
        airline_id: "",
        source_city: "",
        destination_city: "",
        departure_time: "",
        arrival_time: "",
        total_seats: 180,
        price: 0,
        is_daily: false,
      });
      fetchFlights();
    } catch (error) {
      terminalAudio.playAlert();
      notify("error", "DISPATCH ERROR: " + (error.response?.data?.detail || "Failed to add flight"));
    }
  };

  const handleEditFlight = (flight) => {
    terminalAudio.playBeep(600, 0.08);
    setEditingFlightId(flight.flight_id);
    setNewFlight({
      flight_number: flight.flight_number,
      airline_id: flight.airline_id,
      source_city: flight.source_city,
      destination_city: flight.destination_city,
      departure_time: flight.departure_time ? flight.departure_time.slice(0, 16) : "",
      arrival_time: flight.arrival_time ? flight.arrival_time.slice(0, 16) : "",
      total_seats: flight.total_seats,
      price: flight.price,
      is_daily: Boolean(flight.is_daily),
    });
    setShowEditFlight(true);
  };

  const handleUpdateFlight = async (e) => {
    e.preventDefault();
    terminalAudio.playBeep(700, 0.08);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE}/admin/flights/${editingFlightId}`, newFlight, {
        headers: { Authorization: `Bearer ${token}` },
      });
      terminalAudio.playGranted();
      notify("success", "ATC CLEARANCE: Flight details revised!");
      setShowEditFlight(false);
      setEditingFlightId(null);
      fetchFlights();
    } catch (error) {
      terminalAudio.playAlert();
      notify("error", "UPDATE ERROR: " + (error.response?.data?.detail || "Failed to update flight"));
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm("CONFIRM REMOVAL of flight from active air space?")) return;
    terminalAudio.playBeep(350, 0.08);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/admin/flights/${flightId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      terminalAudio.playGranted();
      notify("success", "FLIGHT STRICKEN FROM MANIFEST");
      fetchFlights();
    } catch (error) {
      terminalAudio.playAlert();
      notify("error", "DELETE ERROR: " + (error.response?.data?.detail || "Failed to delete"));
    }
  };

  const handleAddAirline = async (e) => {
    e.preventDefault();
    terminalAudio.playBeep(700, 0.08);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/admin/airlines`, newAirline, {
        headers: { Authorization: `Bearer ${token}` },
      });
      terminalAudio.playGranted();
      notify("success", "CARRIER REGISTERED: New airline added to operations!");
      setShowAddAirline(false);
      setNewAirline({ airline_name: "", airline_code: "" });
      fetchAirlines();
    } catch (error) {
      terminalAudio.playAlert();
      notify("error", "CARRIER ERROR: " + (error.response?.data?.detail || "Failed to add airline"));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="aero-terminal-page">
      <TerminalBar user={user} onLogout={handleLogout} />

      {notification && (
        <div className={`terminal-toast-banner ${notification.type}`}>
          <div className="toast-inner">
            <span className="toast-icon">{notification.type === "success" ? "✔" : "⚠"}</span>
            <span className="toast-text">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="toast-close-btn">✕</button>
          </div>
        </div>
      )}

      {/* ATC TOP HEADER */}
      <div className="cockpit-sub-header">
        <div className="breadcrumb-box">
          <span className="bc-main">AIR TRAFFIC CONTROL</span>
          <span className="bc-slash">/</span>
          <span className="bc-sub">MASTER OPERATIONS</span>
        </div>

        <nav className="cockpit-nav-pills">
          <button
            onClick={() => {
              terminalAudio.playBeep(520, 0.06);
              setActiveTab("flights");
            }}
            className={`cockpit-pill-btn ${activeTab === "flights" ? "active-glow" : ""}`}
          >
            ✈ FLIGHTS MANIFEST ({flights.length})
          </button>
          <button
            onClick={() => {
              terminalAudio.playBeep(520, 0.06);
              setActiveTab("bookings");
            }}
            className={`cockpit-pill-btn ${activeTab === "bookings" ? "active-glow" : ""}`}
          >
            📋 BOOKINGS LEDGER ({bookings.length})
          </button>
          <button
            onClick={() => {
              terminalAudio.playBeep(520, 0.06);
              setActiveTab("airlines");
            }}
            className={`cockpit-pill-btn ${activeTab === "airlines" ? "active-glow" : ""}`}
          >
            🏢 FLEET AIRLINES ({airlines.length})
          </button>
        </nav>

        <div className="user-clearance-tag admin-clearance">
          <span className="tag-pilot-ico">🛡️</span>
          <span className="tag-name">{user?.username?.toUpperCase()}</span>
          <span className="tag-level">CHIEF CONTROLLER</span>
        </div>
      </div>

      <main className="cockpit-main-content">
        {/* ATC TELEMETRY STATS COUNTER BAR */}
        <div className="atc-stats-strip">
          <div className="atc-stat-card">
            <span className="stat-label">ACTIVE FLIGHTS</span>
            <span className="stat-value">{flights.length}</span>
            <span className="stat-sub">MONITORED</span>
          </div>
          <div className="atc-stat-card">
            <span className="stat-label">TOTAL BOOKINGS</span>
            <span className="stat-value">{bookings.length}</span>
            <span className="stat-sub">CONFIRMED/STANDBY</span>
          </div>
          <div className="atc-stat-card">
            <span className="stat-label">REGISTERED AIRLINES</span>
            <span className="stat-value">{airlines.length}</span>
            <span className="stat-sub">GLOBAL FLEET</span>
          </div>
          <div className="atc-stat-card">
            <span className="stat-label">SYSTEM HEALTH</span>
            <span className="stat-value green">100%</span>
            <span className="stat-sub">ATC RADAR ACTIVE</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: FLIGHTS MANIFEST                                 */}
        {/* ======================================================== */}
        {activeTab === "flights" && (
          <div className="departure-board-frame">
            <span className="hex-screw top-left"></span>
            <span className="hex-screw top-right"></span>
            <span className="hex-screw bottom-left"></span>
            <span className="hex-screw bottom-right"></span>

            <div className="board-header-strip">
              <div className="board-title-group">
                <h2 className="board-main-title">AIR TRAFFIC FLIGHT MANIFEST</h2>
                <span className="board-model-sub">ALL REGISTERED ROUTES & FLIGHT VECTORS</span>
              </div>

              <div className="board-actions">
                <button
                  onClick={() => {
                    terminalAudio.playBeep(660, 0.08);
                    setShowAddFlight(true);
                  }}
                  className="cockpit-search-btn"
                >
                  + DISPATCH NEW FLIGHT
                </button>
              </div>
            </div>

            <div className="split-board-table-header">
              <span className="col-flight">FLIGHT NO</span>
              <span className="col-route">ORIGIN ➔ DESTINATION</span>
              <span className="col-time">SCHEDULE</span>
              <span className="col-seats">CAPACITY</span>
              <span className="col-price">PRICE</span>
              <span className="col-status">AIRLINE</span>
              <span className="col-action">CONTROLS</span>
            </div>

            <div className="departure-rows-container">
              {flights.map((f) => (
                <div key={f.flight_id} className="departure-flight-row">
                  <div className="row-col col-flight">
                    <SplitFlapText text={f.flight_number} length={6} color="ivory" animate={false} />
                  </div>
                  <div className="row-col col-route">
                    <div className="flap-route-inline">
                      <SplitFlapText text={(f.source_city || "---").slice(0, 3)} length={3} color="ivory" animate={false} />
                      <span className="flap-route-plane">✈</span>
                      <SplitFlapText text={(f.destination_city || "---").slice(0, 3)} length={3} color="ivory" animate={false} />
                    </div>
                    <span className="full-route-names">{f.source_city} to {f.destination_city}</span>
                  </div>
                  <div className="row-col col-time">
                    <span className="time-val">
                      {f.departure_time_only || (f.departure_time ? new Date(f.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "DAILY")}
                    </span>
                    {f.is_daily && <span className="daily-tag">DAILY</span>}
                  </div>
                  <div className="row-col col-seats">
                    <span className="seats-count">{f.available_seats || f.total_seats} / {f.total_seats} SEATS</span>
                  </div>
                  <div className="row-col col-price">
                    <span className="price-tag">₹{f.price}</span>
                  </div>
                  <div className="row-col col-status">
                    <span className="airline-mini-badge">{f.airline_name || "CARRIER"}</span>
                  </div>
                  <div className="row-col col-action">
                    <div className="admin-actions-pair">
                      <button
                        onClick={() => handleEditFlight(f)}
                        className="admin-edit-btn"
                        title="Edit Flight"
                      >
                        ✎ EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteFlight(f.flight_id)}
                        className="admin-del-btn"
                        title="Delete Flight"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BOOKINGS LEDGER                                   */}
        {/* ======================================================== */}
        {activeTab === "bookings" && (
          <div className="bolted-chassis-frame">
            <span className="hex-screw top-left"></span>
            <span className="hex-screw top-right"></span>
            <span className="hex-screw bottom-left"></span>
            <span className="hex-screw bottom-right"></span>

            <div className="chassis-header">
              <h2 className="chassis-title">ALL PASSENGER RESERVATIONS</h2>
              <span className="chassis-sub">MASTER AIRLINE BOOKING DISPATCH</span>
            </div>

            <div className="bookings-grid-deck">
              {bookings.map((b) => (
                <div key={b.booking_id} className="booking-manifest-card">
                  <div className="manifest-card-header">
                    <div className="pnr-strip">
                      <span className="pnr-tag">PNR</span>
                      <span className="pnr-val">{b.pnr_number}</span>
                    </div>
                    <span className={`manifest-status-pill status-${b.booking_status}`}>
                      {b.booking_status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="manifest-route-info">
                    <div className="flight-id-badge">FLIGHT: {b.flight?.flight_number}</div>
                    <div className="route-arrow-row">
                      <span>{b.flight?.source_city}</span>
                      <span>✈ ── ✈</span>
                      <span>{b.flight?.destination_city}</span>
                    </div>
                  </div>
                  <div className="manifest-details-grid">
                    <div className="m-detail">
                      <span className="m-label">PASSENGER:</span>
                      <span className="m-val">{b.user?.username || "TRAVELER"}</span>
                    </div>
                    <div className="m-detail">
                      <span className="m-label">COUNT:</span>
                      <span className="m-val">{b.passengers_count} PAX</span>
                    </div>
                    <div className="m-detail">
                      <span className="m-label">TOTAL FARE:</span>
                      <span className="m-val fare-price">₹{b.total_amount}</span>
                    </div>
                    <div className="m-detail">
                      <span className="m-label">PAYMENT:</span>
                      <span className="m-val">{b.payment_status}</span>
                    </div>
                  </div>
                  <div className="manifest-actions-row">
                    <button
                      onClick={() => {
                        setSelectedBookingId(b.booking_id);
                        setShowTicketModal(true);
                      }}
                      className="manifest-view-ticket-btn"
                    >
                      🎫 VIEW PASS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: AIRLINES FLEET                                    */}
        {/* ======================================================== */}
        {activeTab === "airlines" && (
          <div className="bolted-chassis-frame">
            <span className="hex-screw top-left"></span>
            <span className="hex-screw top-right"></span>
            <span className="hex-screw bottom-left"></span>
            <span className="hex-screw bottom-right"></span>

            <div className="chassis-header">
              <h2 className="chassis-title">REGISTERED AIRLINE FLEETS</h2>
              <span className="chassis-sub">OFFICIAL CARRIER DIRECTORY</span>
              <div className="chassis-actions">
                <button
                  onClick={() => setShowAddAirline(true)}
                  className="cockpit-search-btn"
                >
                  + REGISTER AIRLINE
                </button>
              </div>
            </div>

            <div className="airlines-grid">
              {airlines.map((a) => (
                <div key={a.airline_id} className="airline-card-retro">
                  <div className="airline-card-top">
                    <span className="air-icon">✈</span>
                    <span className="air-code">{a.airline_code}</span>
                  </div>
                  <h3 className="air-name">{a.airline_name}</h3>
                  <div className="air-status">
                    <span className="beacon-led pulse-green"></span>
                    <span>AUTHORITY: CERTIFIED CARRIER</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ADD / EDIT FLIGHT MODAL */}
      {(showAddFlight || showEditFlight) && (
        <div className="modal-backdrop">
          <div className="modal-chassis-window small-confirm">
            <div className="window-header-bar">
              <div className="window-title-left">
                <span className="plane-icon">✈</span>
                <span className="window-title">
                  {showEditFlight ? "EDIT FLIGHT DISPATCH" : "REGISTER NEW FLIGHT"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowAddFlight(false);
                  setShowEditFlight(false);
                }}
                className="modal-close-cross"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={showEditFlight ? handleUpdateFlight : handleAddFlight}
              className="retro-admin-form"
            >
              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label className="terminal-label">FLIGHT NUMBER</label>
                  <input
                    type="text"
                    required
                    className="terminal-input"
                    placeholder="e.g. AI-202"
                    value={newFlight.flight_number}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, flight_number: e.target.value })
                    }
                  />
                </div>
                <div className="terminal-input-group">
                  <label className="terminal-label">AIRLINE</label>
                  <select
                    required
                    className="terminal-input"
                    value={newFlight.airline_id}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, airline_id: e.target.value })
                    }
                  >
                    <option value="">SELECT CARRIER</option>
                    {airlines.map((a) => (
                      <option key={a.airline_id} value={a.airline_id}>
                        {a.airline_name} ({a.airline_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label className="terminal-label">SOURCE CITY</label>
                  <input
                    type="text"
                    required
                    className="terminal-input"
                    placeholder="e.g. NYC or MP"
                    value={newFlight.source_city}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, source_city: e.target.value })
                    }
                  />
                </div>
                <div className="terminal-input-group">
                  <label className="terminal-label">DESTINATION CITY</label>
                  <input
                    type="text"
                    required
                    className="terminal-input"
                    placeholder="e.g. LND or DEH"
                    value={newFlight.destination_city}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        destination_city: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label className="terminal-label">DEPARTURE TIME</label>
                  <input
                    type="datetime-local"
                    required
                    className="terminal-input"
                    value={newFlight.departure_time}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, departure_time: e.target.value })
                    }
                  />
                </div>
                <div className="terminal-input-group">
                  <label className="terminal-label">ARRIVAL TIME</label>
                  <input
                    type="datetime-local"
                    required
                    className="terminal-input"
                    value={newFlight.arrival_time}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, arrival_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-two-col">
                <div className="terminal-input-group">
                  <label className="terminal-label">TOTAL SEATS</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="terminal-input"
                    value={newFlight.total_seats}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        total_seats: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="terminal-input-group">
                  <label className="terminal-label">PRICE (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="terminal-input"
                    value={newFlight.price}
                    onChange={(e) =>
                      setNewFlight({
                        ...newFlight,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="terminal-input-group">
                <label className="checkbox-label-retro">
                  <input
                    type="checkbox"
                    checked={newFlight.is_daily}
                    onChange={(e) =>
                      setNewFlight({ ...newFlight, is_daily: e.target.checked })
                    }
                  />
                  <span>RUNS AS DAILY RECURRING SCHEDULE</span>
                </label>
              </div>

              <div className="confirm-btn-actions">
                <button type="submit" className="confirm-booking-btn">
                  {showEditFlight ? "SAVE REVISION" : "DISPATCH FLIGHT"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFlight(false);
                    setShowEditFlight(false);
                  }}
                  className="cancel-modal-btn"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD AIRLINE MODAL */}
      {showAddAirline && (
        <div className="modal-backdrop">
          <div className="modal-chassis-window small-confirm">
            <div className="window-header-bar">
              <div className="window-title-left">
                <span className="plane-icon">✈</span>
                <span className="window-title">REGISTER AIRLINE CARRIER</span>
              </div>
              <button
                onClick={() => setShowAddAirline(false)}
                className="modal-close-cross"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAirline} className="retro-admin-form">
              <div className="terminal-input-group">
                <label className="terminal-label">CARRIER FULL NAME</label>
                <input
                  type="text"
                  required
                  className="terminal-input"
                  placeholder="e.g. Pan American Airways"
                  value={newAirline.airline_name}
                  onChange={(e) =>
                    setNewAirline({ ...newAirline, airline_name: e.target.value })
                  }
                />
              </div>

              <div className="terminal-input-group">
                <label className="terminal-label">IATA 2/3 LETTER CODE</label>
                <input
                  type="text"
                  required
                  maxLength="4"
                  className="terminal-input"
                  placeholder="e.g. PA"
                  value={newAirline.airline_code}
                  onChange={(e) =>
                    setNewAirline({
                      ...newAirline,
                      airline_code: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="confirm-btn-actions">
                <button type="submit" className="confirm-booking-btn">
                  AUTHORIZE AIRLINE
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAirline(false)}
                  className="cancel-modal-btn"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET VIEW MODAL */}
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
              <button onClick={() => window.print()} className="ticket-print-action-btn">
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

      <footer className="aero-bottom-hazard-bar">
        <div className="hazard-tape"></div>
        <div className="hazard-bar-status">
          <span className="status-item">
            <span className="beacon-led pulse-green"></span> ATC_STATUS: CHIEF OPERATIONAL
          </span>
          <span className="status-item">STITCH FLIGHT DISPATCH MATRIX</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
