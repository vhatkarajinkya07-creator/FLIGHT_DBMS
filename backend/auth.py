from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import SessionLocal, User

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Token utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        print("Access token created successfully for:", data.get("sub"))
        return token
    except Exception as e:
        print("Error creating access token:", e)
        raise HTTPException(status_code=500, detail="Token creation failed")

def create_refresh_token(data: dict) -> str:
    try:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        print("Refresh token created successfully for:", data.get("sub"))
        return token
    except Exception as e:
        print("Error creating refresh token:", e)
        raise HTTPException(status_code=500, detail="Token creation failed")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication
def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    try:
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        if not user:
            print("Authentication failed: User not found")
            return None
        if not verify_password(password, user.password_hash):
            print("Authentication failed: Incorrect password")
            return None
        print("User authenticated successfully:", username)
        return user
    except Exception as e:
        print("Error during user authentication:", e)
        return None

def generate_tokens(user: User) -> dict:
    access_token = create_access_token({
        "sub": user.username,
        "user_type": user.user_type,
        "user_id": user.user_id
    })
    refresh_token = create_refresh_token({"sub": user.username})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Dependencies
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "access":
            print("Invalid token type")
            raise credentials_exception
            
        username = payload.get("sub")
        user_type = payload.get("user_type")
        user_id = payload.get("user_id")
        
        if any(v is None for v in [username, user_type, user_id]):
            print("Invalid token payload")
            raise credentials_exception
            
    except JWTError as e:
        print("JWT decoding error:", e)
        raise credentials_exception
    
    user = db.query(User).filter(
        User.username == username,
        User.user_id == user_id,
        User.is_active == True
    ).first()
    
    if not user:
        print("User not found or inactive")
        raise credentials_exception
    
    print("Current user retrieved successfully:", username)
    return user

def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user