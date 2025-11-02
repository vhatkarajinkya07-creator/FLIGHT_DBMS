import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_, and_
from datetime import datetime, timedelta, date
from typing import List, Optional
import secrets
import json

from database import SessionLocal, User, Flight, Booking, Payment, Airline, AuditLog
import auth

app = FastAPI(title="Flight Booking System", version="1.0.0")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")
print(f"🔧 Using database URL: {DATABASE_URL}")  # Debug line

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models
from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    user_type: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    first_name: str
    last_name: str
    user_type: str
    is_active: bool

    class Config:
        from_attributes = True

class FlightCreate(BaseModel):
    flight_number: str
    airline_id: int
    source_city: str
    destination_city: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    price: float
    is_daily: bool = False

class FlightResponse(BaseModel):
    flight_id: int
    flight_number: str
    airline_id: int
    source_city: str
    destination_city: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    available_seats: int
    price: float
    flight_status: str
    is_daily: bool
    airline_name: Optional[str] = None
    airline_code: Optional[str] = None

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    flight_id: int
    passengers_count: int
    travel_date: Optional[datetime] = None
    payment_method: str = "credit_card"

class BookingResponse(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    booking_date: datetime
    travel_date: Optional[datetime]
    passengers_count: int
    total_amount: float
    booking_status: str
    payment_status: str
    pnr_number: str

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    payment_id: int
    booking_id: int
    payment_amount: float
    payment_method: str
    payment_date: datetime
    transaction_id: str
    payment_status: str

    class Config:
        from_attributes = True

class AirlineCreate(BaseModel):
    airline_name: str
    airline_code: str

class AirlineResponse(BaseModel):
    airline_id: int
    airline_name: str
    airline_code: str

    class Config:
        from_attributes = True

# Initialize data on startup
@app.on_event("startup")
def startup_event():
    from database import init_data
    init_data()
    print("Flight Booking System started with MySQL database")

# Auth endpoints
@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        print("Registering user:", user.username)
        # Check if user exists
        db_user = db.query(User).filter(
            (User.username == user.username) | 
            (User.email == user.email)
        ).first()
        if db_user:
            print("Registration failed: Username or email already registered")
            raise HTTPException(status_code=400, detail="Username or email already registered")
        
        # Create new user
        hashed_password = auth.get_password_hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            user_type=user.user_type
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print("User registered successfully:", user.username)
        return db_user
    except Exception as e:
        print("Error during registration:", e)
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        print("Logging in user:", user_data.username)
        user = db.query(User).filter(User.username == user_data.username).first()
        if not user or not auth.verify_password(user_data.password, user.password_hash):
            print("Login failed: Invalid credentials")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token = auth.create_access_token(
            data={
                "sub": user.username, 
                "user_type": user.user_type, 
                "user_id": user.user_id
            }
        )
        
        print("Login successful for user:", user.username)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_type": user.user_type,
            "user_id": user.user_id,
            "username": user.username
        }
    except Exception as e:
        print("Error during login:", e)
        raise HTTPException(status_code=500, detail="Login failed")

# Flight endpoints - FIXED VERSION
@app.get("/flights", response_model=List[FlightResponse])
def get_flights(
    source: str = None,
    destination: str = None,
    date: str = None,
    airline_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        print(f"🔍 Flight search - source: {source}, destination: {destination}, date: {date}, airline: {airline_id}")
        
        # Base query with airline join
        query = db.query(Flight, Airline).join(Airline, Flight.airline_id == Airline.airline_id)
        
        # Only show flights with available seats
        query = query.filter(Flight.available_seats > 0)
        
        # Apply source filter
        if source and source.strip():
            query = query.filter(Flight.source_city.ilike(f"%{source.strip()}%"))
        
        # Apply destination filter  
        if destination and destination.strip():
            query = query.filter(Flight.destination_city.ilike(f"%{destination.strip()}%"))
        
        # Apply airline filter
        if airline_id:
            query = query.filter(Flight.airline_id == airline_id)
        
        # Apply date filter ONLY if date is provided
        if date and date.strip():
            try:
                search_date = datetime.strptime(date.strip(), "%Y-%m-%d").date()
                print(f"📅 Searching for date: {search_date}")
                
                # For daily flights OR flights matching the specific date
                query = query.filter(
                    or_(
                        # Daily flights (operate every day)
                        Flight.is_daily == True,
                        # Regular flights on exact date
                        and_(
                            func.date(Flight.departure_time) == search_date,
                            Flight.is_daily == False
                        )
                    )
                )
                
                print(f"✅ Applied date filter for: {search_date}")
                
            except ValueError as e:
                print(f"❌ Invalid date format: {e}, skipping date filter")
                pass
        
        # Execute query
        results = query.order_by(Flight.departure_time).all()
        
        # Convert to FlightResponse with airline info
        flights = []
        for flight, airline in results:
            flight_data = FlightResponse.from_orm(flight)
            flight_data.airline_name = airline.airline_name
            flight_data.airline_code = airline.airline_code
            flights.append(flight_data)
        
        print(f"✅ Found {len(flights)} flights")
        return flights
        
    except Exception as e:
        print(f"❌ Error in flight search: {str(e)}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return []

@app.get("/flights/{flight_id}", response_model=FlightResponse)
def get_flight_details(flight_id: int, db: Session = Depends(get_db)):
    result = db.query(Flight, Airline).join(Airline, Flight.airline_id == Airline.airline_id).filter(Flight.flight_id == flight_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    flight, airline = result
    flight_data = FlightResponse.from_orm(flight)
    flight_data.airline_name = airline.airline_name
    flight_data.airline_code = airline.airline_code
    return flight_data

@app.post("/flights", response_model=FlightResponse)
def create_flight(
    flight: FlightCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if flight number already exists
    existing_flight = db.query(Flight).filter(Flight.flight_number == flight.flight_number).first()
    if existing_flight:
        raise HTTPException(status_code=400, detail="Flight number already exists")
    
    # Check if airline exists
    airline = db.query(Airline).filter(Airline.airline_id == flight.airline_id).first()
    if not airline:
        raise HTTPException(status_code=400, detail="Invalid airline ID")
    
    # Calculate duration and time-only fields for daily flights
    duration_minutes = None
    departure_time_only = None
    arrival_time_only = None
    
    if flight.is_daily:
        # Calculate duration in minutes
        duration = flight.arrival_time - flight.departure_time
        duration_minutes = int(duration.total_seconds() / 60)
        
        # Extract time components for daily flights
        departure_time_only = flight.departure_time.strftime("%H:%M:%S")
        arrival_time_only = flight.arrival_time.strftime("%H:%M:%S")
    
    # Create flight WITHOUT weekdays field
    db_flight = Flight(
        flight_number=flight.flight_number,
        airline_id=flight.airline_id,
        source_city=flight.source_city,
        destination_city=flight.destination_city,
        departure_time=flight.departure_time,
        arrival_time=flight.arrival_time,
        total_seats=flight.total_seats,
        price=flight.price,
        is_daily=flight.is_daily,
        # NO weekdays field - removed
        departure_time_only=departure_time_only,
        arrival_time_only=arrival_time_only,
        duration_minutes=duration_minutes,
        available_seats=flight.total_seats,
        created_by=current_user.user_id
    )
    
    db.add(db_flight)
    db.commit()
    db.refresh(db_flight)
    
    # Return flight with airline info
    flight_data = FlightResponse.from_orm(db_flight)
    flight_data.airline_name = airline.airline_name
    flight_data.airline_code = airline.airline_code
    return flight_data

@app.put("/flights/{flight_id}", response_model=FlightResponse)
def update_flight(
    flight_id: int,
    flight: FlightCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not db_flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    # Check if flight number already exists (excluding current flight)
    existing_flight = db.query(Flight).filter(
        Flight.flight_number == flight.flight_number,
        Flight.flight_id != flight_id
    ).first()
    if existing_flight:
        raise HTTPException(status_code=400, detail="Flight number already exists")
    
    # Check if airline exists
    airline = db.query(Airline).filter(Airline.airline_id == flight.airline_id).first()
    if not airline:
        raise HTTPException(status_code=400, detail="Invalid airline ID")
    
    # Calculate duration and time-only fields for daily flights
    duration_minutes = None
    departure_time_only = None
    arrival_time_only = None
    
    if flight.is_daily:
        duration = flight.arrival_time - flight.departure_time
        duration_minutes = int(duration.total_seconds() / 60)
        departure_time_only = flight.departure_time.strftime("%H:%M:%S")
        arrival_time_only = flight.arrival_time.strftime("%H:%M:%S")
    
    # Update flight fields WITHOUT weekdays
    db_flight.flight_number = flight.flight_number
    db_flight.airline_id = flight.airline_id
    db_flight.source_city = flight.source_city
    db_flight.destination_city = flight.destination_city
    db_flight.departure_time = flight.departure_time
    db_flight.arrival_time = flight.arrival_time
    db_flight.total_seats = flight.total_seats
    db_flight.price = flight.price
    db_flight.is_daily = flight.is_daily
    # NO weekdays field - removed
    db_flight.departure_time_only = departure_time_only
    db_flight.arrival_time_only = arrival_time_only
    db_flight.duration_minutes = duration_minutes
    
    # Update available seats if total seats changed for non-daily flights
    if not db_flight.is_daily and db_flight.total_seats != flight.total_seats:
        booked_seats = db_flight.total_seats - db_flight.available_seats
        db_flight.available_seats = max(0, flight.total_seats - booked_seats)
    
    db.commit()
    db.refresh(db_flight)
    
    # Return flight with airline info
    flight_data = FlightResponse.from_orm(db_flight)
    flight_data.airline_name = airline.airline_name
    flight_data.airline_code = airline.airline_code
    return flight_data

@app.delete("/flights/{flight_id}")
def delete_flight(
    flight_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    # Check for active bookings
    active_bookings = db.query(Booking).filter(
        Booking.flight_id == flight_id,
        Booking.booking_status.in_(["confirmed", "pending"])
    ).count()
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete flight with {active_bookings} active booking(s)"
        )
    
    db.delete(flight)
    db.commit()
    return {"message": "Flight deleted successfully"}

# Airline endpoints
@app.get("/airlines", response_model=List[AirlineResponse])
def get_airlines(db: Session = Depends(get_db)):
    airlines = db.query(Airline).all()
    return [AirlineResponse.from_orm(airline) for airline in airlines]

# Airline management endpoints (Admin only)
@app.post("/admin/airlines", response_model=AirlineResponse)
def create_airline(
    airline: AirlineCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if airline code already exists
    existing_airline = db.query(Airline).filter(
        (Airline.airline_name == airline.airline_name) | 
        (Airline.airline_code == airline.airline_code)
    ).first()
    if existing_airline:
        raise HTTPException(status_code=400, detail="Airline name or code already exists")
    
    db_airline = Airline(
        airline_name=airline.airline_name,
        airline_code=airline.airline_code
    )
    
    db.add(db_airline)
    db.commit()
    db.refresh(db_airline)
    return AirlineResponse.from_orm(db_airline)

@app.put("/admin/airlines/{airline_id}", response_model=AirlineResponse)
def update_airline(
    airline_id: int,
    airline: AirlineCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_airline = db.query(Airline).filter(Airline.airline_id == airline_id).first()
    if not db_airline:
        raise HTTPException(status_code=404, detail="Airline not found")
    
    # Check if airline name or code already exists (excluding current airline)
    existing_airline = db.query(Airline).filter(
        ((Airline.airline_name == airline.airline_name) | 
         (Airline.airline_code == airline.airline_code)),
        Airline.airline_id != airline_id
    ).first()
    if existing_airline:
        raise HTTPException(status_code=400, detail="Airline name or code already exists")
    
    db_airline.airline_name = airline.airline_name
    db_airline.airline_code = airline.airline_code
    
    db.commit()
    db.refresh(db_airline)
    return AirlineResponse.from_orm(db_airline)

@app.delete("/admin/airlines/{airline_id}")
def delete_airline(
    airline_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    airline = db.query(Airline).filter(Airline.airline_id == airline_id).first()
    if not airline:
        raise HTTPException(status_code=404, detail="Airline not found")
    
    # Check if airline has flights
    flights_count = db.query(Flight).filter(Flight.airline_id == airline_id).count()
    if flights_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete airline with {flights_count} associated flight(s)"
        )
    
    db.delete(airline)
    db.commit()
    return {"message": "Airline deleted successfully"}

# Booking endpoints
@app.post("/bookings", response_model=BookingResponse)
def create_booking(
    booking: BookingCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Use your stored procedure for booking
        result = db.execute(
            text("CALL sp_book_flight(:user_id, :flight_id, :passengers_count, @booking_id, @message)"),
            {
                "user_id": current_user.user_id,
                "flight_id": booking.flight_id,
                "passengers_count": booking.passengers_count
            }
        )
        
        # Get output parameters
        result = db.execute(text("SELECT @booking_id as booking_id, @message as message"))
        output = result.fetchone()
        
        if not output or not output[0]:  # booking_id
            raise HTTPException(status_code=400, detail=output[1] if output else "Booking failed")
        
        # Get the created booking
        db_booking = db.query(Booking).filter(Booking.booking_id == output[0]).first()
        
        # Update travel date if provided
        if booking.travel_date:
            db_booking.travel_date = booking.travel_date
            db.commit()
        
        # Create payment record
        db_payment = Payment(
            booking_id=db_booking.booking_id,
            payment_amount=db_booking.total_amount,
            payment_method=booking.payment_method,
            transaction_id=f"TXN{secrets.token_hex(8)}".upper(),
            payment_status="completed"
        )
        
        db.add(db_payment)
        
        # Update booking payment status
        db_booking.payment_status = "completed"
        db.commit()
        db.refresh(db_booking)
        
        return db_booking
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/bookings", response_model=List[BookingResponse])
def get_user_bookings(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Booking).filter(Booking.user_id == current_user.user_id).order_by(Booking.booking_date.desc()).all()

@app.get("/bookings/{booking_id}")
def get_booking_details(
    booking_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    if booking.user_id != current_user.user_id and current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    airline = db.query(Airline).filter(Airline.airline_id == flight.airline_id).first() if flight else None
    user = db.query(User).filter(User.user_id == booking.user_id).first()
    payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    
    return {
        "booking_id": booking.booking_id,
        "user_id": booking.user_id,
        "username": user.username if user else "Unknown",
        "email": user.email if user else "N/A",
        "flight_id": booking.flight_id,
        "booking_date": booking.booking_date,
        "travel_date": booking.travel_date,
        "passengers_count": booking.passengers_count,
        "total_amount": booking.total_amount,
        "booking_status": booking.booking_status,
        "payment_status": booking.payment_status,
        "pnr_number": booking.pnr_number,
        "flight": {
            "flight_number": flight.flight_number if flight else "Unknown",
            "source_city": flight.source_city if flight else "Unknown",
            "destination_city": flight.destination_city if flight else "Unknown",
            "departure_time": flight.departure_time if flight else None,
            "arrival_time": flight.arrival_time if flight else None,
            "is_daily": flight.is_daily if flight else False,
            "price": flight.price if flight else 0,
            "airline": {
                "airline_name": airline.airline_name if airline else "Unknown",
                "airline_code": airline.airline_code if airline else "N/A"
            }
        },
        "payment": {
            "payment_method": payment.payment_method if payment else "N/A",
            "transaction_id": payment.transaction_id if payment else "N/A",
            "payment_date": payment.payment_date if payment else None
        } if payment else None
    }

@app.delete("/bookings/{booking_id}")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check if user owns the booking
        booking = db.query(Booking).filter(
            Booking.booking_id == booking_id,
            Booking.user_id == current_user.user_id
        ).first()
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found or not authorized")
        
        # Use your stored procedure for cancellation
        result = db.execute(
            text("CALL sp_cancel_booking(:booking_id, @message)"),
            {"booking_id": booking_id}
        )
        
        # Get output message
        result = db.execute(text("SELECT @message as message"))
        output = result.fetchone()
        
        if output:
            return {"message": output[0], "booking_id": booking_id}
        else:
            raise HTTPException(status_code=400, detail="Cancellation failed")
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Payment endpoints
@app.get("/payments/{booking_id}", response_model=PaymentResponse)
def get_booking_payment(
    booking_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check if user owns the booking
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if booking.user_id != current_user.user_id and current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return payment

# Admin endpoints
@app.get("/admin/flights", response_model=List[FlightResponse])
def get_all_flights(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    results = db.query(Flight, Airline).join(Airline, Flight.airline_id == Airline.airline_id).order_by(Flight.departure_time).all()
    
    flights = []
    for flight, airline in results:
        flight_data = FlightResponse.from_orm(flight)
        flight_data.airline_name = airline.airline_name
        flight_data.airline_code = airline.airline_code
        flights.append(flight_data)
    
    return flights

@app.get("/admin/bookings", response_model=List[BookingResponse])
def get_all_bookings(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(Booking).order_by(Booking.booking_date.desc()).all()

@app.get("/admin/users", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(User).all()

# Debug endpoint to check flights
@app.get("/debug/flights")
def debug_flights(db: Session = Depends(get_db)):
    """Debug endpoint to check all flights"""
    flights = db.query(Flight).all()
    result = []
    for flight in flights:
        result.append({
            "flight_id": flight.flight_id,
            "flight_number": flight.flight_number,
            "source": flight.source_city,
            "destination": flight.destination_city,
            "departure_time": flight.departure_time,
            "available_seats": flight.available_seats,
            "is_daily": flight.is_daily,
            "airline_id": flight.airline_id
        })
    return {"total_flights": len(flights), "flights": result}

# Advanced features - Reports
@app.get("/admin/reports/airline-performance")
def get_airline_performance_report(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = db.execute(text("CALL sp_airline_performance_report()"))
        reports = result.fetchall()
        return {"report": [dict(row) for row in reports]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.get("/admin/reports/user-analysis")
def get_user_analysis_report(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = db.execute(text("CALL sp_user_booking_analysis()"))
        analysis = result.fetchall()
        return {"analysis": [dict(row) for row in analysis]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/reports/flight-revenue")
def get_flight_revenue_report(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = db.execute(text("CALL sp_flight_revenue_analysis()"))
        revenue_data = result.fetchall()
        return {"revenue_data": [dict(row) for row in revenue_data]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Using your views
@app.get("/flights/daily-schedule")
def get_daily_schedule(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM daily_flight_schedule"))
    return [dict(row) for row in result.fetchall()]

@app.get("/flights/revenue-summary")
def get_flight_revenue_summary(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM flight_revenue_summary"))
    return [dict(row) for row in result.fetchall()]

@app.get("/user-booking-history/{user_id}")
def get_user_booking_history(user_id: int, db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM user_booking_history WHERE user_id = :user_id"), {"user_id": user_id})
    return [dict(row) for row in result.fetchall()]

# Using your functions
@app.get("/flights/{flight_id}/duration")
def get_flight_duration(flight_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT fn_calculate_flight_duration(departure_time, arrival_time) as duration_hours FROM flights WHERE flight_id = :flight_id"),
        {"flight_id": flight_id}
    )
    duration = result.fetchone()
    return {"duration_hours": duration[0] if duration else None}

@app.get("/flights/{flight_id}/available-seats")
def get_available_seats(flight_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT fn_check_seat_availability(:flight_id) as available_seats"),
        {"flight_id": flight_id}
    )
    seats = result.fetchone()
    return {"available_seats": seats[0] if seats else 0}

# Utility endpoints
@app.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    sources = db.query(Flight.source_city).distinct().all()
    destinations = db.query(Flight.destination_city).distinct().all()
    
    return {
        "sources": [s[0] for s in sources],
        "destinations": [d[0] for d in destinations]
    }

# Profile endpoints
@app.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(auth.get_current_user)):
    return current_user

@app.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserCreate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if username or email already exists (excluding current user)
    existing_user = db.query(User).filter(
        (User.username == profile_data.username) | (User.email == profile_data.email),
        User.user_id != current_user.user_id
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    current_user.username = profile_data.username
    current_user.email = profile_data.email
    current_user.first_name = profile_data.first_name
    current_user.last_name = profile_data.last_name
    current_user.phone_number = profile_data.phone_number
    
    if profile_data.password:
        current_user.password_hash = auth.get_password_hash(profile_data.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Health check
@app.get("/")
def read_root():
    return {"message": "Flight Booking System API is running with MySQL!"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)