DROP DATABASE IF EXISTS flight_bookings_ayushman;
CREATE DATABASE flight_bookings_ayushman;
USE flight_bookings_ayushman;

CREATE TABLE users (
	user_id INTEGER NOT NULL AUTO_INCREMENT, 
	username VARCHAR(50) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	first_name VARCHAR(50) NOT NULL, 
	last_name VARCHAR(50) NOT NULL, 
	phone_number VARCHAR(15), 
	user_type VARCHAR(10), 
	created_at DATETIME, 
	is_active BOOLEAN, 
	PRIMARY KEY (user_id)
);

CREATE TABLE airlines (
	airline_id INTEGER NOT NULL AUTO_INCREMENT, 
	airline_name VARCHAR(100) NOT NULL, 
	airline_code VARCHAR(5) NOT NULL, 
	contact_number VARCHAR(15), 
	email VARCHAR(100), 
	is_active BOOLEAN, 
	PRIMARY KEY (airline_id), 
	UNIQUE (airline_code)
);

CREATE TABLE flights (
	flight_id INTEGER NOT NULL AUTO_INCREMENT, 
	flight_number VARCHAR(10) NOT NULL, 
	airline_id INTEGER, 
	source_city VARCHAR(50) NOT NULL, 
	destination_city VARCHAR(50) NOT NULL, 
	departure_time DATETIME NOT NULL, 
	arrival_time DATETIME NOT NULL, 
	total_seats INTEGER NOT NULL, 
	available_seats INTEGER NOT NULL, 
	price FLOAT NOT NULL, 
	flight_status VARCHAR(20), 
	created_by INTEGER, 
	created_at DATETIME, is_daily BOOLEAN DEFAULT 0, departure_time_only VARCHAR(8), arrival_time_only VARCHAR(8), duration_minutes INTEGER, weekdays TEXT, 
	PRIMARY KEY (flight_id), 
	UNIQUE (flight_number), 
	FOREIGN KEY(airline_id) REFERENCES airlines (airline_id), 
	FOREIGN KEY(created_by) REFERENCES users (user_id)
);

CREATE TABLE bookings (
	booking_id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER, 
	flight_id INTEGER, 
	booking_date DATETIME, 
	passengers_count INTEGER NOT NULL, 
	total_amount FLOAT NOT NULL, 
	booking_status VARCHAR(20), 
	payment_status VARCHAR(20), 
	pnr_number VARCHAR(10) NOT NULL, travel_date DATETIME, 
	PRIMARY KEY (booking_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id), 
	FOREIGN KEY(flight_id) REFERENCES flights (flight_id), 
	UNIQUE (pnr_number)
);

CREATE TABLE payments (
	payment_id INTEGER NOT NULL AUTO_INCREMENT, 
	booking_id INTEGER, 
	payment_amount FLOAT NOT NULL, 
	payment_method VARCHAR(20) NOT NULL, 
	payment_date DATETIME, 
	transaction_id VARCHAR(100), 
	payment_status VARCHAR(20), 
	PRIMARY KEY (payment_id), 
	FOREIGN KEY(booking_id) REFERENCES bookings (booking_id), 
	UNIQUE (transaction_id)
);

CREATE TABLE audit_log (
		audit_id INTEGER PRIMARY KEY AUTO_INCREMENT AUTO_INCREMENT,
		table_name VARCHAR(100) NOT NULL,
		operation VARCHAR(50) NOT NULL, 
		record_id INTEGER NOT NULL,
		old_value TEXT,
		new_value TEXT,
		changed_by INTEGER,
		changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		description TEXT
);


-- creating indexes
CREATE INDEX idx_audit_log_table ON audit_log(table_name, operation);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, booking_status);
CREATE INDEX idx_flights_route ON flights(source_city, destination_city);
CREATE INDEX ix_airlines_airline_id ON airlines (airline_id);
CREATE INDEX ix_bookings_booking_id ON bookings (booking_id);
CREATE INDEX ix_flights_flight_id ON flights (flight_id);
CREATE INDEX ix_payments_payment_id ON payments (payment_id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_user_id ON users (user_id);
CREATE UNIQUE INDEX ix_users_username ON users (username);


-- views
CREATE VIEW daily_flight_schedule AS
        SELECT 
            f.flight_id,
            f.flight_number,
            a.airline_name,
            a.airline_code,
            f.source_city,
            f.destination_city,
            f.departure_time_only as departure_time,
            f.arrival_time_only as arrival_time,
            f.duration_minutes,
            CONCAT(LPAD(FLOOR(f.duration_minutes / 60), 2, '0'), ':', LPAD(f.duration_minutes % 60, 2, '0')) AS duration_formatted,
            f.price,
            f.total_seats,
            f.flight_status
        FROM flights f INNER JOIN airlines a ON f.airline_id = a.airline_id WHERE f.is_daily = 1 ORDER BY f.departure_time_only;
	
CREATE VIEW flight_revenue_summary AS
        SELECT 
            f.flight_id,
            f.flight_number,
            f.source_city,
            f.destination_city,
            a.airline_name,
            COUNT(DISTINCT b.booking_id) as total_bookings,
            SUM(b.passengers_count) as total_passengers,
            SUM(b.total_amount) as total_revenue,
            f.total_seats - f.available_seats as seats_booked,
            ROUND((CAST(f.total_seats - f.available_seats AS FLOAT) / f.total_seats * 100), 2) as occupancy_percentage
        FROM flights f LEFT JOIN bookings b ON f.flight_id = b.flight_id AND b.booking_status != 'cancelled'
        LEFT JOIN airlines a ON f.airline_id = a.airline_id GROUP BY f.flight_id;
        
CREATE VIEW user_booking_history AS
        SELECT 
            u.user_id,
            u.username,
            u.email,
            b.booking_id,
            b.pnr_number,
            f.flight_number,
            f.source_city,
            f.destination_city,
            a.airline_name,
            b.booking_date,
            b.travel_date,
            b.passengers_count,
            b.total_amount,
            b.booking_status,
            b.payment_status
        FROM users u INNER JOIN bookings b ON u.user_id = b.user_id INNER JOIN flights f ON b.flight_id = f.flight_id
        INNER JOIN airlines a ON f.airline_id = a.airline_id ORDER BY b.booking_date DESC;
        

-- triggers
-- trigger-1
DELIMITER $$
CREATE TRIGGER audit_booking_changes
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF OLD.booking_status <> NEW.booking_status THEN
        INSERT INTO audit_log (
            table_name,
            operation,
            record_id,
            old_value,
            new_value,
            changed_by,
            description
        )
        VALUES (
            'bookings',
            'UPDATE',
            NEW.booking_id,
            OLD.booking_status,
            NEW.booking_status,
            NEW.user_id,
            CONCAT('Booking status changed from ', OLD.booking_status, ' to ', NEW.booking_status)
        );
    END IF;
END$$
DELIMITER ;

-- trigger-2
DELIMITER $$
CREATE TRIGGER restore_seats_on_cancellation
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE flight_daily INT;
    -- Get whether the flight is daily or not
    SELECT is_daily INTO flight_daily FROM flights WHERE flight_id = NEW.flight_id;
    -- Only proceed if booking changed to cancelled and flight is not daily
    IF OLD.booking_status <> 'cancelled'
       AND NEW.booking_status = 'cancelled'
       AND flight_daily = 0 THEN
        -- Restore the seats
        UPDATE flights
        SET available_seats = available_seats + NEW.passengers_count
        WHERE flight_id = NEW.flight_id;
        -- Add an entry in the audit log
        INSERT INTO audit_log (
            table_name,
            operation,
            record_id,
            description
        )
        VALUES (
            'flights',
            'SEAT_RESTORE',
            NEW.flight_id,
            CONCAT('Restored ', NEW.passengers_count, ' seats from cancelled booking #', NEW.booking_id)
        );
    END IF;
END$$
DELIMITER ;

-- trigger-3
DELIMITER $$
CREATE TRIGGER update_available_seats_on_booking
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE flight_daily INT;
    -- Get whether the flight is daily or not
    SELECT is_daily INTO flight_daily FROM flights WHERE flight_id = NEW.flight_id;
    -- Only update if the flight is not daily
    IF flight_daily = 0 THEN
        -- Decrease available seats
        UPDATE flights
        SET available_seats = available_seats - NEW.passengers_count
        WHERE flight_id = NEW.flight_id;
        -- Log the change in audit_log
        INSERT INTO audit_log (
            table_name,
            operation,
            record_id,
            description
        )
        VALUES (
            'flights',
            'SEAT_UPDATE',
            NEW.flight_id,
            CONCAT('Reduced ', NEW.passengers_count, ' seats for booking #', NEW.booking_id)
        );
    END IF;
END$$
DELIMITER ;

-- trigger-4
DELIMITER $$
CREATE TRIGGER validate_flight_capacity
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE available INT;
    DECLARE flight_daily INT;
    -- Fetch flight details
    SELECT available_seats, is_daily
    INTO available, flight_daily
    FROM flights
    WHERE flight_id = NEW.flight_id;
    -- If not daily flight and insufficient seats
    IF flight_daily = 0 AND available < NEW.passengers_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient seats available for this flight';
    END IF;
END$$
DELIMITER ;


-- functions
-- Function 1: Calculate flight duration in hours
DELIMITER $$
CREATE FUNCTION fn_calculate_flight_duration(
    dep_time DATETIME, 
    arr_time DATETIME
) 
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE duration_hours DECIMAL(10,2);
    SET duration_hours = TIMESTAMPDIFF(MINUTE, dep_time, arr_time) / 60.0;
    RETURN duration_hours;
END$$
DELIMITER ;

-- Function 2: Check seat availability
DELIMITER $$
CREATE FUNCTION fn_check_seat_availability(
    p_flight_id INT
) 
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_available_seats INT;
    SELECT available_seats INTO v_available_seats
    FROM flights 
    WHERE flight_id = p_flight_id;
    
    RETURN COALESCE(v_available_seats, 0);
END$$
DELIMITER ;

-- Function 3: Generate PNR number
DELIMITER $$
CREATE FUNCTION fn_generate_pnr()
RETURNS VARCHAR(10)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_pnr VARCHAR(10);
    SET v_pnr = UPPER(SUBSTRING(MD5(CONCAT(RAND(), NOW())), 1, 10));
    RETURN v_pnr;
END$$
DELIMITER ;


-- procedures
-- Procedure 1: Book flight with exception handling
DELIMITER $$
CREATE PROCEDURE sp_book_flight(
    IN p_user_id INT,
    IN p_flight_id INT,
    IN p_passengers_count INT,
    OUT p_booking_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_available_seats INT;
    DECLARE v_flight_price FLOAT;
    DECLARE v_total_amount FLOAT;
    DECLARE v_pnr VARCHAR(10);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 @sqlstate = RETURNED_SQLSTATE, 
        @errno = MYSQL_ERRNO, @text = MESSAGE_TEXT;
        SET p_message = CONCAT('Error: ', @errno, ' - ', @text);
        SET p_booking_id = NULL;
    END;
    START TRANSACTION;
    -- Check flight existence and get details
    SELECT available_seats, price
    INTO v_available_seats, v_flight_price
    FROM flights 
    WHERE flight_id = p_flight_id;
    IF v_available_seats IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Flight not found';
    END IF;
    -- Check seat availability
    IF v_available_seats < p_passengers_count THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough seats available';
    END IF;
    -- Generate PNR and calculate amount
    SET v_pnr = fn_generate_pnr();
    SET v_total_amount = v_flight_price * p_passengers_count;
    -- Create booking
    INSERT INTO bookings (
        user_id, flight_id, booking_date, passengers_count, 
        total_amount, booking_status, payment_status, pnr_number, travel_date
    ) VALUES (
        p_user_id, p_flight_id, NOW(), p_passengers_count,
        v_total_amount, 'confirmed', 'pending', v_pnr, NOW()
    );
    SET p_booking_id = LAST_INSERT_ID();
    SET p_message = 'Booking created successfully';
    COMMIT;
END$$
DELIMITER ;

-- Procedure 2: Cancel booking with refund processing
DELIMITER $$
CREATE PROCEDURE sp_cancel_booking(
    IN p_booking_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_total_amount FLOAT;
    DECLARE v_refund_amount FLOAT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'Error occurred during cancellation';
    END;
    START TRANSACTION;
    -- Get booking details
    SELECT booking_status, total_amount
    INTO v_booking_status, v_total_amount
    FROM bookings 
    WHERE booking_id = p_booking_id;
    IF v_booking_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking not found';
    END IF;
    IF v_booking_status = 'cancelled' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking is already cancelled';
    END IF;
    -- Calculate refund (80% refund for example)
    SET v_refund_amount = v_total_amount * 0.8;
    -- Update booking status
    UPDATE bookings 
    SET booking_status = 'cancelled',
        payment_status = 'refunded'
    WHERE booking_id = p_booking_id;
    -- Record refund payment
    INSERT INTO payments (
        booking_id, payment_amount, payment_method, 
        payment_date, transaction_id, payment_status
    ) VALUES (
        p_booking_id, -v_refund_amount, 'refund',
        NOW(), CONCAT('REFUND_', p_booking_id), 'completed'
    );
    SET p_message = CONCAT('Booking cancelled. Refund processed: $', ROUND(v_refund_amount, 2));
    COMMIT;
END$$
DELIMITER ;

-- Procedure 3: Update flight prices with validation
DELIMITER $$
CREATE PROCEDURE sp_update_flight_prices(
    IN p_airline_id INT,
    IN p_percentage_change DECIMAL(5,2)
)
BEGIN
    DECLARE v_airline_exists INT;
    DECLARE v_affected_rows INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    -- Check if airline exists
    SELECT COUNT(*) INTO v_airline_exists 
    FROM airlines 
    WHERE airline_id = p_airline_id;
    IF v_airline_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Airline not found';
    END IF;
    -- Update prices
    UPDATE flights 
    SET price = price * (1 + p_percentage_change/100)
    WHERE airline_id = p_airline_id 
    AND flight_status != 'cancelled';
    SET v_affected_rows = ROW_COUNT();
    COMMIT;
    SELECT CONCAT('Updated ', v_affected_rows, ' flight prices') as result;
END$$
DELIMITER ;


-- cursors
-- cursor-1
DELIMITER $$
CREATE PROCEDURE sp_airline_performance_report()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_airline_name VARCHAR(100);
    DECLARE v_total_flights INT;
    DECLARE v_total_revenue DECIMAL(12,2);
    DECLARE v_avg_occupancy DECIMAL(5,2);
    DECLARE v_row_count INT DEFAULT 0;
    DECLARE airline_cursor CURSOR FOR
        SELECT 
            a.airline_name,
            COUNT(f.flight_id) as total_flights,
            COALESCE(SUM(b.total_amount), 0) as total_revenue,
            ROUND(AVG((f.total_seats - f.available_seats) * 100.0 / f.total_seats), 2) as avg_occupancy
        FROM airlines a
        LEFT JOIN flights f ON a.airline_id = f.airline_id
        LEFT JOIN bookings b ON f.flight_id = b.flight_id AND b.booking_status != 'cancelled'
        GROUP BY a.airline_id, a.airline_name
        ORDER BY total_revenue DESC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DROP TEMPORARY TABLE IF EXISTS airline_report;
    CREATE TEMPORARY TABLE airline_report (
        airline_name VARCHAR(100),
        total_flights INT,
        total_revenue DECIMAL(12,2),
        avg_occupancy DECIMAL(5,2),
        performance_rating VARCHAR(10)
    );
    OPEN airline_cursor;
    read_loop: LOOP
        FETCH airline_cursor INTO v_airline_name, v_total_flights, v_total_revenue, v_avg_occupancy;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET v_row_count = v_row_count + 1;
        INSERT INTO airline_report (airline_name, total_flights, total_revenue, avg_occupancy)
        VALUES (v_airline_name, v_total_flights, v_total_revenue, v_avg_occupancy);
    END LOOP;
    CLOSE airline_cursor;
    -- Update performance rating
    UPDATE airline_report 
    SET performance_rating = CASE 
        WHEN avg_occupancy >= 80 THEN 'Excellent'
        WHEN avg_occupancy >= 60 THEN 'Good' 
        WHEN avg_occupancy >= 40 THEN 'Average'
        ELSE 'Poor'
    END;    
    SELECT CONCAT(v_row_count, ' airlines processed') as summary;
    SELECT * FROM airline_report;
END$$
DELIMITER ;

-- cursor-2
DELIMITER $$
CREATE PROCEDURE sp_user_booking_analysis()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_user_id INT;
    DECLARE v_username VARCHAR(50);
    DECLARE v_total_bookings INT;
    DECLARE v_total_spent DECIMAL(12,2);
    DECLARE v_customer_tier VARCHAR(20);
    DECLARE v_processed_count INT DEFAULT 0;
    DECLARE user_cursor CURSOR FOR
        SELECT 
            u.user_id,
            u.username,
            COUNT(b.booking_id) as total_bookings,
            COALESCE(SUM(b.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN bookings b ON u.user_id = b.user_id AND b.booking_status != 'cancelled'
        GROUP BY u.user_id, u.username
        HAVING total_bookings > 0
        ORDER BY total_spent DESC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DROP TEMPORARY TABLE IF EXISTS user_analysis;
    CREATE TEMPORARY TABLE user_analysis (
        user_id INT,
        username VARCHAR(50),
        total_bookings INT,
        total_spent DECIMAL(12,2),
        customer_tier VARCHAR(20)
    );
    OPEN user_cursor;
    user_loop: LOOP
        FETCH user_cursor INTO v_user_id, v_username, v_total_bookings, v_total_spent;
        IF done THEN
            LEAVE user_loop;
        END IF;
        SET v_processed_count = v_processed_count + 1;
        -- Determine customer tier based on spending and bookings
        SET v_customer_tier = CASE 
            WHEN v_total_spent >= 5000 THEN 'Platinum'
            WHEN v_total_spent >= 2000 THEN 'Gold'
            WHEN v_total_spent >= 500 THEN 'Silver'
            ELSE 'Bronze'
        END;
        INSERT INTO user_analysis (user_id, username, total_bookings, total_spent, customer_tier)
        VALUES (v_user_id, v_username, v_total_bookings, v_total_spent, v_customer_tier);
    END LOOP;
    CLOSE user_cursor;
    SELECT CONCAT(v_processed_count, ' users analyzed') as summary;
    SELECT * FROM user_analysis ORDER BY total_spent DESC;
END$$
DELIMITER ;

-- cursor-3
DELIMITER $$
CREATE PROCEDURE sp_flight_revenue_analysis()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_flight_number VARCHAR(10);
    DECLARE v_source_city VARCHAR(50);
    DECLARE v_destination_city VARCHAR(50);
    DECLARE v_total_revenue DECIMAL(12,2);
    DECLARE v_occupancy_rate DECIMAL(5,2);
    DECLARE v_total_bookings INT;
    DECLARE v_flight_count INT DEFAULT 0;
    DECLARE flight_cursor CURSOR FOR
        SELECT 
            f.flight_number,
            f.source_city,
            f.destination_city,
            COALESCE(SUM(b.total_amount), 0) as total_revenue,
            ROUND(((f.total_seats - f.available_seats) * 100.0 / f.total_seats), 2) as occupancy_rate,
            COUNT(b.booking_id) as total_bookings
        FROM flights f
        LEFT JOIN bookings b ON f.flight_id = b.flight_id AND b.booking_status != 'cancelled'
        GROUP BY f.flight_id, f.flight_number, f.source_city, f.destination_city, f.total_seats, f.available_seats
        ORDER BY total_revenue DESC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DROP TEMPORARY TABLE IF EXISTS flight_analysis;
    CREATE TEMPORARY TABLE flight_analysis (
        flight_number VARCHAR(10),
        route VARCHAR(100),
        total_revenue DECIMAL(12,2),
        occupancy_rate DECIMAL(5,2),
        total_bookings INT,
        profitability VARCHAR(20)
    );
    OPEN flight_cursor;
    flight_loop: LOOP
        FETCH flight_cursor INTO v_flight_number, v_source_city, v_destination_city, v_total_revenue, v_occupancy_rate, v_total_bookings;
        IF done THEN
            LEAVE flight_loop;
        END IF;
        SET v_flight_count = v_flight_count + 1;
        INSERT INTO flight_analysis (flight_number, route, total_revenue, occupancy_rate, total_bookings)
        VALUES (v_flight_number, CONCAT(v_source_city, ' to ', v_destination_city), v_total_revenue, v_occupancy_rate, v_total_bookings);
    END LOOP;
    CLOSE flight_cursor;
    -- Update profitability rating
    UPDATE flight_analysis 
    SET profitability = CASE 
        WHEN occupancy_rate >= 75 AND total_revenue > 10000 THEN 'High'
        WHEN occupancy_rate >= 50 AND total_revenue > 5000 THEN 'Medium'
        WHEN occupancy_rate >= 25 THEN 'Low'
        ELSE 'Very Low'
    END;
    SELECT CONCAT(v_flight_count, ' flights analyzed') as summary;
    SELECT * FROM flight_analysis ORDER BY total_revenue DESC;
END$$
DELIMITER ;
