import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "./Navbar";
import { SplitFlapText, SolariStatusBadge } from "./SplitFlapBoard";
import { ChalkArrow, StarburstBadge, RetroStampsBadge } from "./ChalkDoodles";
import BoardingTicket from "./BoardingTicket";
import {
  playMechanicalClick,
  playSplitFlap,
  playAlertSound,
} from "../utils/soundEffects";

export const AdminDashboard = () => {
  const { API_BASE } = useAuth();
  const [activeTab, setActiveTab] = useState("flights");

  // Admin Data State
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Flight Creation / Editing Modals
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [flightForm, setFlightForm] = useState({
    flight_number: "",
    airline_id: "",
    source_city: "",
    destination_city: "",
    departure_time: "",
    arrival_time: "",
    total_seats: 180,
    price: 3500,
    is_daily: false,
  });

  // Airline Creation Modal
  const [showAddAirline, setShowAddAirline] = useState(false);
  const [airlineForm, setAirlineForm] = useState({
    airline_name: "",
    airline_code: "",
  });

  // Ticket Inspector
  const [inspectTicketId, setInspectTicketId] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const fetchAllAdminData = async () => {
    setLoading(true);
    await Promise.all([fetchFlights(), fetchBookings(), fetchAirlines()]);
    setLoading(false);
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchFlights = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/flights`, {
        headers: getHeaders(),
      });
      setFlights(res.data);
    } catch (e) {
      console.error("Admin fetch flights failed", e);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/bookings`, {
        headers: getHeaders(),
      });
      setBookings(res.data);
    } catch (e) {
      console.error("Admin fetch bookings failed", e);
    }
  };

  const fetchAirlines = async () => {
    try {
      const res = await axios.get(`${API_BASE}/airlines`);
      setAirlines(res.data);
    } catch (e) {
      console.error("Admin fetch airlines failed", e);
    }
  };

  // Add Flight
  const handleSaveFlight = async (e) => {
    e.preventDefault();
    playMechanicalClick();

    try {
      const data = { ...flightForm };
      if (data.is_daily) {
        const today = new Date().toISOString().split("T")[0];
        if (!data.departure_time.includes("T")) {
          data.departure_time = `${today}T${data.departure_time}:00`;
        }
        if (!data.arrival_time.includes("T")) {
          data.arrival_time = `${today}T${data.arrival_time}:00`;
        }
      }

      if (editingFlight) {
        await axios.put(
          `${API_BASE}/flights/${editingFlight.flight_id}`,
          data,
          { headers: getHeaders() }
        );
        setToast({ type: "success", text: "FLIGHT SCHEDULE UPDATED!" });
      } else {
        await axios.post(`${API_BASE}/flights`, data, {
          headers: getHeaders(),
        });
        setToast({ type: "success", text: "NEW FLIGHT DISPATCHED TO BOARD!" });
      }

      playAlertSound();
      setShowAddFlight(false);
      setEditingFlight(null);
      resetFlightForm();
      fetchFlights();
    } catch (err) {
      const msg = err.response?.data?.detail || "Operation failed";
      setToast({ type: "error", text: msg });
    }
  };

  // Delete Flight
  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm("DECOMMISSION FLIGHT FROM ACTIVE SCHEDULE?")) return;
    playMechanicalClick();

    try {
      await axios.delete(`${API_BASE}/admin/flights/${flightId}`, {
        headers: getHeaders(),
      });
      setToast({ type: "success", text: "FLIGHT DECOMMISSIONED." });
      fetchFlights();
    } catch (err) {
      setToast({ type: "error", text: "Failed to delete flight." });
    }
  };

  // Add Airline
  const handleAddAirline = async (e) => {
    e.preventDefault();
    playMechanicalClick();

    try {
      await axios.post(`${API_BASE}/airlines`, airlineForm, {
        headers: getHeaders(),
      });
      playAlertSound();
      setToast({ type: "success", text: "NEW CARRIER COMMISSIONED TO FLEET!" });
      setShowAddAirline(false);
      setAirlineForm({ airline_name: "", airline_code: "" });
      fetchAirlines();
    } catch (err) {
      setToast({ type: "error", text: "Carrier commissioning failed." });
    }
  };

  const openEditModal = (flight) => {
    playMechanicalClick();
    setEditingFlight(flight);
    setFlightForm({
      flight_number: flight.flight_number,
      airline_id: flight.airline_id,
      source_city: flight.source_city,
      destination_city: flight.destination_city,
      departure_time: flight.is_daily
        ? (flight.departure_time_only || "10:00").slice(0, 5)
        : flight.departure_time?.slice(0, 16) || "",
      arrival_time: flight.is_daily
        ? (flight.arrival_time_only || "14:00").slice(0, 5)
        : flight.arrival_time?.slice(0, 16) || "",
      total_seats: flight.total_seats,
      price: flight.price,
      is_daily: flight.is_daily,
    });
    setShowAddFlight(true);
  };

  const resetFlightForm = () => {
    setFlightForm({
      flight_number: "",
      airline_id: airlines[0]?.airline_id || "",
      source_city: "",
      destination_city: "",
      departure_time: "",
      arrival_time: "",
      total_seats: 180,
      price: 3500,
      is_daily: false,
    });
  };

  return (
    <div className="cockpit-viewport admin-dashboard-page">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={true} />

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
            TAB 1: FLIGHT OPERATIONS (Solari Master Schedule)
            ================================================================= */}
        {activeTab === "flights" && (
          <div className="admin-flights-tab">
            <div className="cockpit-bezel admin-console-header">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              <div className="admin-status-hud">
                <div className="hud-metric">
                  <span className="hud-label">SCHEDULED FLIGHTS</span>
                  <span className="hud-val">{flights.length}</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">FLEET AIRLINES</span>
                  <span className="hud-val">{airlines.length}</span>
                </div>
                <div className="hud-metric">
                  <span className="hud-label">TOTAL PASSENGERS</span>
                  <span className="hud-val">{bookings.length}</span>
                </div>
              </div>

              <div className="admin-header-actions">
                <button
                  type="button"
                  className="tactile-btn tactile-btn-primary"
                  onClick={() => {
                    playMechanicalClick();
                    setEditingFlight(null);
                    resetFlightForm();
                    setShowAddFlight(true);
                  }}
                >
                  ✚ DISPATCH NEW FLIGHT
                </button>
                <button
                  type="button"
                  className="tactile-btn"
                  onClick={fetchFlights}
                >
                  ↻ SYNC RADAR
                </button>
              </div>
            </div>

            {/* Solari Departure Board */}
            <div className="departure-board-frame">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              <div className="departure-board-header">
                <div className="solari-title">
                  <span className="led-indicator led-green"></span>
                  GLOBAL AIR TRAFFIC SCHEDULE // MASTER BOARD
                </div>
                <div className="solari-model-tag">
                  ATC DISPATCH CONSOLE // CH-ADMIN
                </div>
              </div>

              <div className="solari-grid">
                {flights.map((flight) => (
                  <div key={flight.flight_id} className="solari-row admin-solari-row">
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

                    <div className="solari-carrier-col">
                      <span className="flight-num-pill">
                        {flight.flight_number}
                      </span>
                      <span className="flight-airline-name">
                        {flight.airline_name}
                      </span>
                    </div>

                    <div className="solari-time-col">
                      <SplitFlapText
                        text={
                          flight.departure_time_only
                            ? flight.departure_time_only.slice(0, 5)
                            : flight.departure_time?.slice(11, 16) || "12:00"
                        }
                        length={5}
                        size="md"
                      />
                    </div>

                    <div className="solari-status-col">
                      <SolariStatusBadge
                        status={flight.is_daily ? "DAILY" : "ON TIME"}
                      />
                    </div>

                    <div className="solari-price-col">
                      <div className="price-tag">
                        ₹{flight.price.toLocaleString()}
                      </div>
                      <div className="seats-tag">
                        {flight.available_seats} / {flight.total_seats} SEATS
                      </div>
                    </div>

                    <div className="solari-action-col admin-action-buttons">
                      <button
                        type="button"
                        className="tactile-btn"
                        onClick={() => openEditModal(flight)}
                        title="Edit Flight Dispatch"
                      >
                        ⚙ EDIT
                      </button>
                      <button
                        type="button"
                        className="tactile-btn tactile-btn-danger"
                        onClick={() => handleDeleteFlight(flight.flight_id)}
                        title="Decommission Flight"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {flights.length === 0 && !loading && (
                  <div className="solari-empty-state">
                    <SplitFlapText
                      text="NO ACTIVE FLIGHTS ON RADAR"
                      length={26}
                      size="md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: PASSENGER MANIFEST & ALL BOOKINGS
            ================================================================= */}
        {activeTab === "bookings" && (
          <div className="admin-manifest-tab">
            <div className="cockpit-bezel">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              <div className="bookings-header-panel">
                <h2 className="solari-title">
                  <span className="led-indicator led-green"></span>
                  MASTER PASSENGER MANIFEST // {bookings.length} RESERVATIONS
                </h2>
                <button
                  type="button"
                  className="tactile-btn"
                  onClick={fetchBookings}
                >
                  ↻ REFRESH MANIFEST
                </button>
              </div>

              <div className="bookings-solari-list">
                {bookings.map((booking) => {
                  const flight = booking.flight || {};
                  return (
                    <div
                      key={booking.booking_id}
                      className="booking-manifest-card"
                    >
                      <div className="manifest-top">
                        <div className="manifest-pnr">
                          <span className="pnr-label">PNR:</span>
                          <span className="pnr-code">{booking.pnr_number}</span>
                        </div>

                        <div className="manifest-route">
                          <span className="passenger-user-tag">
                            PASSENGER: {booking.user?.username || `ID#${booking.user_id}`}
                          </span>
                        </div>

                        <SolariStatusBadge
                          status={booking.booking_status || "CONFIRMED"}
                        />
                      </div>

                      <div className="manifest-details">
                        <div className="manifest-item">
                          <span className="manifest-label">FLIGHT ROUTE</span>
                          <span className="manifest-val">
                            {flight.flight_number} // {flight.source_city} ➔ {flight.destination_city}
                          </span>
                        </div>

                        <div className="manifest-item">
                          <span className="manifest-label">PASSENGERS</span>
                          <span className="manifest-val">
                            {booking.passengers_count}
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
                            setInspectTicketId(booking.booking_id);
                          }}
                        >
                          🎫 INSPECT BOARDING PASS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 3: FLEET & AIRLINES MANAGEMENT
            ================================================================= */}
        {activeTab === "airlines" && (
          <div className="admin-airlines-tab">
            <div className="cockpit-bezel">
              <div className="rivet rivet-tl"></div>
              <div className="rivet rivet-tr"></div>
              <div className="rivet rivet-bl"></div>
              <div className="rivet rivet-br"></div>

              <div className="bookings-header-panel">
                <h2 className="solari-title">
                  <span className="led-indicator led-green"></span>
                  FLEET CARRIERS // {airlines.length} AIRLINES
                </h2>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-primary"
                  onClick={() => setShowAddAirline(true)}
                >
                  ✚ COMMISSION NEW AIRLINE
                </button>
              </div>

              <div className="airlines-grid">
                {airlines.map((airline) => (
                  <div key={airline.airline_id} className="airline-card-chassis">
                    <div className="airline-badge-icon">✈</div>
                    <div className="airline-info-block">
                      <span className="airline-code-badge">
                        {airline.airline_code}
                      </span>
                      <h4 className="airline-title-text">
                        {airline.airline_name}
                      </h4>
                      <span className="airline-sub-stat">STATUS: LICENSED &amp; ACTIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================
          MODAL: ADD / EDIT FLIGHT
          ================================================================= */}
      {showAddFlight && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel flight-editor-modal">
            <div className="rivet rivet-tl"></div>
            <div className="rivet rivet-tr"></div>
            <div className="rivet rivet-bl"></div>
            <div className="rivet rivet-br"></div>

            <div className="panel4-modal-header">
              <h3 className="cockpit-plate-title">
                {editingFlight
                  ? "EDIT FLIGHT DISPATCH PARAMETERS"
                  : "COMMISSION NEW FLIGHT DISPATCH"}
              </h3>
              <button
                type="button"
                className="retro-win-btn close"
                onClick={() => setShowAddFlight(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFlight} className="admin-flight-form">
              <div className="terminal-form-grid">
                <div className="terminal-input-group">
                  <label className="terminal-label">FLIGHT NUMBER</label>
                  <input
                    type="text"
                    required
                    value={flightForm.flight_number}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        flight_number: e.target.value.toUpperCase(),
                      })
                    }
                    className="terminal-input"
                    placeholder="E.G. AI-302"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">CARRIER AIRLINE</label>
                  <select
                    required
                    value={flightForm.airline_id}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        airline_id: e.target.value,
                      })
                    }
                    className="cockpit-select"
                  >
                    <option value="">SELECT CARRIER</option>
                    {airlines.map((a) => (
                      <option key={a.airline_id} value={a.airline_id}>
                        {a.airline_name} ({a.airline_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">SOURCE CITY</label>
                  <input
                    type="text"
                    required
                    value={flightForm.source_city}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        source_city: e.target.value,
                      })
                    }
                    className="terminal-input"
                    placeholder="E.G. Mumbai"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">DESTINATION CITY</label>
                  <input
                    type="text"
                    required
                    value={flightForm.destination_city}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        destination_city: e.target.value,
                      })
                    }
                    className="terminal-input"
                    placeholder="E.G. Delhi"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">
                    DEPARTURE {flightForm.is_daily ? "TIME (HH:MM)" : "DATE/TIME"}
                  </label>
                  <input
                    type={flightForm.is_daily ? "time" : "datetime-local"}
                    required
                    value={flightForm.departure_time}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        departure_time: e.target.value,
                      })
                    }
                    className="terminal-input"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">
                    ARRIVAL {flightForm.is_daily ? "TIME (HH:MM)" : "DATE/TIME"}
                  </label>
                  <input
                    type={flightForm.is_daily ? "time" : "datetime-local"}
                    required
                    value={flightForm.arrival_time}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        arrival_time: e.target.value,
                      })
                    }
                    className="terminal-input"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">TOTAL SEATS</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="800"
                    value={flightForm.total_seats}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        total_seats: parseInt(e.target.value),
                      })
                    }
                    className="terminal-input"
                  />
                </div>

                <div className="terminal-input-group">
                  <label className="terminal-label">BASE FARE (₹)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={flightForm.price}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        price: parseFloat(e.target.value),
                      })
                    }
                    className="terminal-input"
                  />
                </div>
              </div>

              {/* Daily Flight Toggle */}
              <div className="daily-flight-toggle-row">
                <label className="tactile-checkbox-label">
                  <input
                    type="checkbox"
                    checked={flightForm.is_daily}
                    onChange={(e) =>
                      setFlightForm({
                        ...flightForm,
                        is_daily: e.target.checked,
                      })
                    }
                  />
                  <span>🔄 SCHEDULE AS RECURRING DAILY FLIGHT</span>
                </label>
              </div>

              <div className="alert-buttons-row" style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  className="tactile-btn tactile-btn-primary"
                >
                  {editingFlight ? "COMMIT UPDATES ➔" : "DISPATCH FLIGHT ➔"}
                </button>
                <button
                  type="button"
                  className="tactile-btn"
                  onClick={() => setShowAddFlight(false)}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
          MODAL: ADD AIRLINE
          ================================================================= */}
      {showAddAirline && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel add-airline-modal">
            <h3 className="cockpit-plate-title">COMMISSION FLEET AIRLINE</h3>
            <form onSubmit={handleAddAirline} style={{ marginTop: "16px" }}>
              <div className="terminal-input-group">
                <label className="terminal-label">AIRLINE NAME</label>
                <input
                  type="text"
                  required
                  value={airlineForm.airline_name}
                  onChange={(e) =>
                    setAirlineForm({
                      ...airlineForm,
                      airline_name: e.target.value,
                    })
                  }
                  className="terminal-input"
                  placeholder="E.G. Pan American World Airways"
                />
              </div>

              <div className="terminal-input-group" style={{ marginTop: "12px" }}>
                <label className="terminal-label">IATA 2-LETTER CODE</label>
                <input
                  type="text"
                  required
                  maxLength="4"
                  value={airlineForm.airline_code}
                  onChange={(e) =>
                    setAirlineForm({
                      ...airlineForm,
                      airline_code: e.target.value.toUpperCase(),
                    })
                  }
                  className="terminal-input"
                  placeholder="E.G. PA"
                />
              </div>

              <div className="alert-buttons-row" style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  className="tactile-btn tactile-btn-primary"
                >
                  COMMISSION AIRLINE ➔
                </button>
                <button
                  type="button"
                  className="tactile-btn"
                  onClick={() => setShowAddAirline(false)}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
          MODAL: INSPECT BOARDING PASS
          ================================================================= */}
      {inspectTicketId && (
        <div className="cockpit-modal-overlay">
          <div className="cockpit-bezel ticket-view-modal">
            <div className="ticket-view-header">
              <h3 className="cockpit-plate-title">PASSENGER BOARDING PASS</h3>
              <button
                type="button"
                className="retro-win-btn close"
                onClick={() => setInspectTicketId(null)}
              >
                ✕
              </button>
            </div>
            <BoardingTicket bookingId={inspectTicketId} API_BASE={API_BASE} />
          </div>
        </div>
      )}

      {/* Bottom Ticker Tape */}
      <div className="ticker-bar">
        <div className="ticker-text">
          <span className="led-indicator led-green"></span>
          SYS_STATUS: ONLINE // ATC OPERATIONS ROOM
        </div>
        <div className="ticker-text" style={{ color: "#38bdf8" }}>
          SURVEILLANCE RADAR: OPERATIONAL // DATA LINK: CRYPTO SECURE
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

export default AdminDashboard;
