import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BookingTicket from "./BookingTicket";

const AdminDashboard = () => {
  const { user, logout, API_BASE } = useAuth();
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [showEditFlight, setShowEditFlight] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState(null);
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
  const [activeTab, setActiveTab] = useState("flights");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showAddAirline, setShowAddAirline] = useState(false);

  useEffect(() => {
    fetchFlights();
    fetchBookings();
    fetchAirlines();
  }, []);

  const fetchFlights = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found, redirecting to login");
        navigate("/login");
        return;
      }
      const response = await axios.get(`${API_BASE}/admin/flights`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setFlights(response.data);
    } catch (error) {
      console.error("Error fetching flights:", error);
      if (error.response?.status === 401) {
        console.error("Unauthorized access, redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    }
  };

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found, redirecting to login");
        navigate("/login");
        return;
      }
      const response = await axios.get(`${API_BASE}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      if (error.response?.status === 401) {
        console.error("Unauthorized access, redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
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

  const deleteFlight = async (flightId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this flight? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/admin/flights/${flightId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchFlights();
      alert("Flight deleted successfully!");
    } catch (error) {
      alert(
        "Error deleting flight: " +
          (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const addFlight = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      // Prepare flight data for submission
      const flightData = { ...newFlight };

      // For daily flights, convert time to datetime with today's date
      if (flightData.is_daily) {
        const today = new Date().toISOString().split("T")[0];

        if (!flightData.departure_time.includes("T")) {
          flightData.departure_time = `${today}T${flightData.departure_time}:00`;
        }

        if (!flightData.arrival_time.includes("T")) {
          flightData.arrival_time = `${today}T${flightData.arrival_time}:00`;
        }
      }

      await axios.post(`${API_BASE}/flights`, flightData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      alert("Flight added successfully!");
    } catch (error) {
      console.error("Full error:", error);
      let errorMessage = "Unknown error";
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map((err) => `${err.loc.join(".")}: ${err.msg}`)
            .join("\n");
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert("Error adding flight:\n" + errorMessage);
    }
  };

  const addAirline = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE}/admin/airlines`, newAirline, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setShowAddAirline(false);
      setNewAirline({
        airline_name: "",
        airline_code: "",
      });
      fetchAirlines();
      alert("Airline added successfully!");
    } catch (error) {
      alert(
        "Error adding airline: " +
          (error.response?.data?.detail || "Unknown error")
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditFlight = (flight) => {
    // For recurring flights, extract just the time (HH:MM)
    let departureTime = "";
    let arrivalTime = "";

    if (flight.is_daily) {
      // Daily flight - use time only
      departureTime = flight.departure_time_only
        ? flight.departure_time_only.substring(0, 5)
        : flight.departure_time.split("T")[1]?.substring(0, 5) || "";
      arrivalTime = flight.arrival_time_only
        ? flight.arrival_time_only.substring(0, 5)
        : flight.arrival_time.split("T")[1]?.substring(0, 5) || "";
    } else {
      // One-time flight - use full datetime
      departureTime = flight.departure_time.substring(0, 16);
      arrivalTime = flight.arrival_time.substring(0, 16);
    }

    // Set the form with flight data
    setNewFlight({
      flight_number: flight.flight_number,
      airline_id: flight.airline_id,
      source_city: flight.source_city,
      destination_city: flight.destination_city,
      departure_time: departureTime,
      arrival_time: arrivalTime,
      total_seats: flight.total_seats,
      price: flight.price,
      is_daily: flight.is_daily,
    });
    setEditingFlightId(flight.flight_id);
    setShowAddFlight(false);
    setShowEditFlight(true);

    // Scroll to top to see the edit form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const updateFlight = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      // Prepare flight data for submission
      const flightData = { ...newFlight };

      if (flightData.is_daily) {
        const today = new Date().toISOString().split("T")[0];

        if (!flightData.departure_time.includes("T")) {
          flightData.departure_time = `${today}T${flightData.departure_time}:00`;
        }

        if (!flightData.arrival_time.includes("T")) {
          flightData.arrival_time = `${today}T${flightData.arrival_time}:00`;
        }
      }

      await axios.put(`${API_BASE}/flights/${editingFlightId}`, flightData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setShowEditFlight(false);
      setEditingFlightId(null);
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
      alert("Flight updated successfully!");
    } catch (error) {
      console.error("Full error:", error);
      let errorMessage = "Unknown error";
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map((err) => `${err.loc.join(".")}: ${err.msg}`)
            .join("\n");
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert("Error updating flight:\n" + errorMessage);
    }
  };

  const cancelEdit = () => {
    setShowEditFlight(false);
    setEditingFlightId(null);
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
  };

  const handleViewTicket = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowTicketModal(true);
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setSelectedBookingId(null);
  };

  // Handle time input changes for daily flights
  const handleTimeChange = (field, value) => {
    setNewFlight((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          <button
            onClick={() => setActiveTab("flights")}
            className={`nav-button ${activeTab === "flights" ? "active" : ""}`}
          >
            Manage Flights
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`nav-button ${activeTab === "bookings" ? "active" : ""}`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setActiveTab("airlines")}
            className={`nav-button ${activeTab === "airlines" ? "active" : ""}`}
          >
            Manage Airlines
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {activeTab === "flights" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-header">
                <h2>Manage Flights</h2>
                <button
                  onClick={() => setShowAddFlight(true)}
                  className="add-button"
                >
                  Add New Flight
                </button>
              </div>

              {showAddFlight && (
                <div className="add-flight-form">
                  <h3>Add New Flight</h3>
                  <form onSubmit={addFlight} className="flight-form">
                    <input
                      type="text"
                      placeholder="Flight Number"
                      value={newFlight.flight_number}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          flight_number: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />

                    <select
                      value={newFlight.airline_id}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          airline_id: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    >
                      <option value="">Select Airline</option>
                      {airlines.map((airline) => (
                        <option
                          key={airline.airline_id}
                          value={airline.airline_id}
                        >
                          {airline.airline_name} ({airline.airline_code})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Source City"
                      value={newFlight.source_city}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          source_city: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Destination City"
                      value={newFlight.destination_city}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          destination_city: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />

                    {/* Daily Flight Option */}
                    <div className="daily-flight-option">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={newFlight.is_daily}
                          onChange={(e) =>
                            setNewFlight({
                              ...newFlight,
                              is_daily: e.target.checked,
                              departure_time: "",
                              arrival_time: "",
                            })
                          }
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">
                          Daily Flight (All Days)
                        </span>
                        <span className="checkbox-help">
                          Check this for flights that operate every day at the
                          same time
                        </span>
                      </label>
                    </div>

                    {/* Time/DateTime inputs based on flight type */}
                    {newFlight.is_daily ? (
                      <>
                        <div className="info-banner">
                          🔄 <strong>Daily Flight</strong> - Operates every day.
                          Enter time only.
                        </div>
                        <label className="form-label">Departure Time</label>
                        <input
                          type="time"
                          value={newFlight.departure_time}
                          onChange={(e) =>
                            handleTimeChange("departure_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                        <label className="form-label">Arrival Time</label>
                        <input
                          type="time"
                          value={newFlight.arrival_time}
                          onChange={(e) =>
                            handleTimeChange("arrival_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <div className="info-banner">
                          📅 <strong>One-Time Flight</strong> - Enter specific
                          date and time.
                        </div>
                        <label className="form-label">
                          Departure Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={newFlight.departure_time}
                          onChange={(e) =>
                            handleTimeChange("departure_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                        <label className="form-label">
                          Arrival Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={newFlight.arrival_time}
                          onChange={(e) =>
                            handleTimeChange("arrival_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                      </>
                    )}

                    <input
                      type="number"
                      placeholder="Total Seats"
                      value={newFlight.total_seats}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          total_seats: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={newFlight.price || ""}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <div className="form-actions">
                      <button type="submit" className="submit-button">
                        Add Flight
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddFlight(false)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showEditFlight && (
                <div className="add-flight-form edit-flight-form">
                  <h3>Edit Flight (ID: {editingFlightId})</h3>
                  <form onSubmit={updateFlight} className="flight-form">
                    <input
                      type="text"
                      placeholder="Flight Number"
                      value={newFlight.flight_number}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          flight_number: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />

                    <select
                      value={newFlight.airline_id}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          airline_id: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    >
                      <option value="">Select Airline</option>
                      {airlines.map((airline) => (
                        <option
                          key={airline.airline_id}
                          value={airline.airline_id}
                        >
                          {airline.airline_name} ({airline.airline_code})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Source City"
                      value={newFlight.source_city}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          source_city: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Destination City"
                      value={newFlight.destination_city}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          destination_city: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />

                    {/* Daily Flight Option */}
                    <div className="daily-flight-option">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={newFlight.is_daily}
                          onChange={(e) =>
                            setNewFlight({
                              ...newFlight,
                              is_daily: e.target.checked,
                              departure_time: "",
                              arrival_time: "",
                            })
                          }
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">
                          Daily Flight (All Days)
                        </span>
                      </label>
                    </div>

                    {/* Time/DateTime inputs based on flight type */}
                    {newFlight.is_daily ? (
                      <>
                        <div className="info-banner">
                          🔄 Daily Flight - Enter time only
                        </div>
                        <input
                          type="time"
                          placeholder="Departure Time"
                          value={newFlight.departure_time}
                          onChange={(e) =>
                            handleTimeChange("departure_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                        <input
                          type="time"
                          placeholder="Arrival Time"
                          value={newFlight.arrival_time}
                          onChange={(e) =>
                            handleTimeChange("arrival_time", e.target.value)
                          }
                          className="form-input"
                          required
                        />
                      </>
                    ) : (
                      <>
                        <div className="info-banner">
                          📅 One-Time Flight - Enter date and time
                        </div>
                        <input
                          type="datetime-local"
                          placeholder="Departure Time"
                          value={newFlight.departure_time}
                          onChange={(e) =>
                            setNewFlight({
                              ...newFlight,
                              departure_time: e.target.value,
                            })
                          }
                          className="form-input"
                          required
                        />
                        <input
                          type="datetime-local"
                          placeholder="Arrival Time"
                          value={newFlight.arrival_time}
                          onChange={(e) =>
                            setNewFlight({
                              ...newFlight,
                              arrival_time: e.target.value,
                            })
                          }
                          className="form-input"
                          required
                        />
                      </>
                    )}

                    <input
                      type="number"
                      placeholder="Total Seats"
                      value={newFlight.total_seats}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          total_seats: parseInt(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={newFlight.price}
                      onChange={(e) =>
                        setNewFlight({
                          ...newFlight,
                          price: parseFloat(e.target.value),
                        })
                      }
                      className="form-input"
                      required
                    />
                    <div className="form-actions">
                      <button type="submit" className="submit-button">
                        Update Flight
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flights-list">
                {flights.map((flight) => (
                  <div
                    key={flight.flight_id}
                    className="flight-card admin-flight-card"
                  >
                    <div className="flight-info">
                      <div className="flight-header">
                        <h3>{flight.flight_number}</h3>
                        <div className="flight-badges">
                          <span className="flight-id">
                            ID: {flight.flight_id}
                          </span>
                          {flight.is_daily && (
                            <span className="daily-badge">🔄 Daily Flight</span>
                          )}
                          <span className="airline-badge">
                            {flight.airline_name} ({flight.airline_code})
                          </span>
                        </div>
                      </div>
                      <p className="route">
                        {flight.source_city} → {flight.destination_city}
                      </p>
                      <div className="flight-details">
                        {flight.is_daily ? (
                          <>
                            <p className="flight-time">
                              <span className="time-label">Departure:</span>
                              {flight.departure_time_only ||
                                new Date(
                                  flight.departure_time
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                              (Daily)
                            </p>
                            <p className="flight-time">
                              <span className="time-label">Arrival:</span>
                              {flight.arrival_time_only ||
                                new Date(
                                  flight.arrival_time
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                              (Daily)
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="flight-time">
                              <span className="time-label">Departure:</span>
                              {new Date(flight.departure_time).toLocaleString()}
                            </p>
                            <p className="flight-time">
                              <span className="time-label">Arrival:</span>
                              {new Date(flight.arrival_time).toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flight-capacity">
                        <p className="flight-seats">
                          {flight.is_daily ? (
                            <>
                              <span className="seats-total">
                                {flight.total_seats}
                              </span>
                              <span className="seats-label">
                                seats available daily
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="seats-available">
                                {flight.available_seats}
                              </span>
                              <span className="seats-divider">/</span>
                              <span className="seats-total">
                                {flight.total_seats}
                              </span>
                              <span className="seats-label">seats</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flight-actions admin-actions">
                      <div className="flight-price-section">
                        <p className="flight-price">
                          ₹{flight.price.toLocaleString()}
                        </p>
                        <p
                          className={`flight-status status-${flight.flight_status}`}
                        >
                          {flight.flight_status}
                        </p>
                      </div>
                      <div className="admin-buttons">
                        <button
                          onClick={() => handleEditFlight(flight)}
                          className="edit-button"
                          title="Edit Flight"
                        >
                          <span className="edit-icon">✏️</span>
                          Edit
                        </button>
                        <button
                          onClick={() => deleteFlight(flight.flight_id)}
                          className="delete-button"
                          title="Delete Flight"
                        >
                          <span className="delete-icon">🗑️</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {flights.length === 0 && (
                  <div className="no-results">
                    <p>
                      No flights found. Add your first flight to get started!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="tab-content">
            <div className="card">
              <h2>All Bookings</h2>
              <div className="bookings-list">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="booking-card">
                    <div className="booking-info">
                      <h3>PNR: {booking.pnr_number}</h3>
                      <p className="booking-detail">
                        User ID: {booking.user_id} | {booking.passengers_count}{" "}
                        passenger(s)
                      </p>
                      <p className="booking-time">
                        Booked on:{" "}
                        {new Date(booking.booking_date).toLocaleString()}
                      </p>
                      <p className="booking-status">
                        Status:{" "}
                        <span className={`status-${booking.booking_status}`}>
                          {booking.booking_status}
                        </span>
                      </p>
                    </div>
                    <div className="booking-actions">
                      <p className="booking-amount">₹{booking.total_amount}</p>
                      <p className="payment-status">
                        Payment: {booking.payment_status}
                      </p>
                      <button
                        onClick={() => handleViewTicket(booking.booking_id)}
                        className="view-ticket-button"
                        title="View Booking Ticket"
                      >
                        🎫 View Ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "airlines" && (
          <div className="tab-content">
            <div className="card">
              <div className="card-header">
                <h2>Manage Airlines</h2>
                <button
                  onClick={() => setShowAddAirline(true)}
                  className="add-button"
                >
                  Add New Airline
                </button>
              </div>

              {showAddAirline && (
                <div className="add-flight-form">
                  <h3>Add New Airline</h3>
                  <form onSubmit={addAirline} className="flight-form">
                    <input
                      type="text"
                      placeholder="Airline Name"
                      value={newAirline.airline_name}
                      onChange={(e) =>
                        setNewAirline({
                          ...newAirline,
                          airline_name: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Airline Code (e.g., AI, IND)"
                      value={newAirline.airline_code}
                      onChange={(e) =>
                        setNewAirline({
                          ...newAirline,
                          airline_code: e.target.value.toUpperCase(),
                        })
                      }
                      className="form-input"
                      required
                      maxLength="3"
                    />
                    <div className="form-actions">
                      <button type="submit" className="submit-button">
                        Add Airline
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAirline(false)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flights-list">
                {airlines.map((airline) => (
                  <div key={airline.airline_id} className="flight-card">
                    <div className="flight-info">
                      <h3>{airline.airline_name}</h3>
                      <p className="route">Code: {airline.airline_code}</p>
                      <p className="flight-id">ID: {airline.airline_id}</p>
                    </div>
                  </div>
                ))}
                {airlines.length === 0 && (
                  <div className="no-results">
                    <p>No airlines found. Add your first airline!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Ticket Modal */}
      {showTicketModal && selectedBookingId && (
        <div className="modal-overlay">
          <div className="ticket-modal-content">
            <button onClick={closeTicketModal} className="ticket-modal-close">
              ✕
            </button>
            <BookingTicket bookingId={selectedBookingId} API_BASE={API_BASE} />
            <div className="ticket-modal-actions">
              <button onClick={() => window.print()} className="print-button">
                🖨️ Print Ticket
              </button>
              <button onClick={closeTicketModal} className="close-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
