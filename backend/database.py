from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import dotenv
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

dotenv.load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:@localhost/flight_booking")
print(f"🔧 Database URL: {DATABASE_URL}")  # Debug line to verify

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone_number = Column(String(15))
    user_type = Column(String(10), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    flights_created = relationship("Flight", back_populates="creator")
    bookings = relationship("Booking", back_populates="user")

class Airline(Base):
    __tablename__ = "airlines"
    
    airline_id = Column(Integer, primary_key=True, index=True)
    airline_name = Column(String(100), nullable=False)
    airline_code = Column(String(5), unique=True, nullable=False)
    contact_number = Column(String(15))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    
    flights = relationship("Flight", back_populates="airline")

class Flight(Base):
    __tablename__ = "flights"
    
    flight_id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String(10), unique=True, nullable=False)
    airline_id = Column(Integer, ForeignKey("airlines.airline_id"))
    source_city = Column(String(50), nullable=False)
    destination_city = Column(String(50), nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)
    total_seats = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    flight_status = Column(String(20), default="scheduled")
    is_daily = Column(Boolean, default=False)
    departure_time_only = Column(String(8))
    arrival_time_only = Column(String(8))
    duration_minutes = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    airline = relationship("Airline", back_populates="flights")
    creator = relationship("User", back_populates="flights_created")
    bookings = relationship("Booking", back_populates="flight")

class Booking(Base):
    __tablename__ = "bookings"
    
    booking_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    flight_id = Column(Integer, ForeignKey("flights.flight_id"))
    booking_date = Column(DateTime, default=datetime.utcnow)
    travel_date = Column(DateTime)
    passengers_count = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    booking_status = Column(String(20), default="confirmed")
    payment_status = Column(String(20), default="pending")
    pnr_number = Column(String(10), unique=True, nullable=False)
    
    user = relationship("User", back_populates="bookings")
    flight = relationship("Flight", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking")

class Payment(Base):
    __tablename__ = "payments"
    
    payment_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id"))
    payment_amount = Column(Float, nullable=False)
    payment_method = Column(String(20), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    transaction_id = Column(String(100), unique=True)
    payment_status = Column(String(20), default="pending")
    
    booking = relationship("Booking", back_populates="payments")

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    audit_id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    operation = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(Integer, ForeignKey("users.user_id"))
    changed_at = Column(DateTime, default=datetime.utcnow)
    description = Column(Text)
    
    changer = relationship("User")

def create_tables():
    # Note: In MySQL, tables are created by your SQL script
    # This is kept for compatibility but won't create tables in MySQL
    print("Note: Tables should be created using the provided SQL script")
    pass

def init_data():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@flight.com",
                password_hash=get_password_hash("admin123"),
                first_name="System",
                last_name="Admin",
                user_type="admin"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created")
        else:
            print("Admin user already exists")
            
    except Exception as e:
        print(f"Error initializing data: {e}")
        db.rollback()
    finally:
        db.close()