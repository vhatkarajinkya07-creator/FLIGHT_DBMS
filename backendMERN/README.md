# ✈️ Flight Booking System - Express.js / Node.js Backend (`backendMERN`)

This is the Node.js / Express backend converted from the original FastAPI backend, maintaining 100% API parity with the React frontend and connecting to your active MySQL database.

---

## 🚀 Getting Started

### 1. Configure `.env`
The `.env` file is already copied from `backend/.env`. It includes:

```env
DATABASE_URL=mysql://root:ajinkya@localhost:3306/flight_bookings_ayushman
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
PORT=8000
```

> **Note:** The server automatically supports both `mysql://...` and `mysql+pymysql://...` URLs.

---

### 2. Install Dependencies
```bash
cd backendMERN
npm install
```

---

### 3. Start the Server
* **Production mode:**
  ```bash
  npm start
  ```
* **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```

Server will be running at: `http://localhost:8000`

---

## 🛠️ API Routes Parity
- **Auth:** `POST /register`, `POST /login`, `GET /profile`, `PUT /profile`
- **Flights:** `GET /flights`, `GET /flights/:id`, `POST /flights`, `PUT /flights/:id`, `DELETE /flights/:id`
- **Airlines:** `GET /airlines`, `POST /admin/airlines`, `PUT /admin/airlines/:id`, `DELETE /admin/airlines/:id`
- **Bookings:** `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `DELETE /bookings/:id`
- **Admin & Reports:** `GET /admin/flights`, `GET /admin/bookings`, `GET /admin/users`, `GET /admin/reports/*`
- **Views & Stored Procedures:** Fully integrated with MySQL stored procedures (`sp_book_flight`, `sp_cancel_booking`, etc.) and database views.
