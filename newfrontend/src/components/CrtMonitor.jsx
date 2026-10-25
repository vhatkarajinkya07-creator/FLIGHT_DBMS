import React from "react";

export const CrtMonitor = ({
  flightNumber = "FL-69",
  source = "NYC",
  destination = "LND",
  passengers = 1,
  price = 0,
  airline = "PAN AM AERO",
  departureTime = "14:20",
  title = "TACTICAL FLIGHT MONITOR",
}) => {
  return (
    <div className="crt-monitor-frame">
      {/* Curved Screen Glass */}
      <div className="crt-screen">
        <div className="crt-scanlines"></div>
        <div className="crt-vignette"></div>

        <div className="crt-content">
          <div className="crt-header">
            <span className="crt-dot">●</span> {title} // CH-01
          </div>

          <div className="crt-readout">
            <div className="crt-line">
              <span className="crt-label">FLIGHT:</span>
              <span className="crt-val crt-amber">{flightNumber}</span>
            </div>

            <div className="crt-line">
              <span className="crt-label">ROUTE:</span>
              <span className="crt-val">
                [ {source.toUpperCase()} ] ===&gt;&gt; [ {destination.toUpperCase()} ]
              </span>
            </div>

            <div className="crt-line">
              <span className="crt-label">AIRLINE:</span>
              <span className="crt-val">{airline}</span>
            </div>

            <div className="crt-line">
              <span className="crt-label">PASSENGERS:</span>
              <span className="crt-val crt-green">{passengers} ADULT(S)</span>
            </div>

            {price > 0 && (
              <div className="crt-line">
                <span className="crt-label">EST. FARE:</span>
                <span className="crt-val crt-amber">
                  ₹{(price * passengers).toLocaleString()}
                </span>
              </div>
            )}

            <div className="crt-line crt-status-row">
              <span className="crt-label">RADAR LINK:</span>
              <span className="crt-val crt-green crt-blink">
                ● ACQUIRED &amp; LOCKED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monitor chassis bezel footer */}
      <div className="crt-chassis-footer">
        <div className="crt-badge">FLIGHT-CRT 9000</div>
        <div className="crt-screws">
          <span className="crt-bolt"></span>
          <span className="crt-bolt"></span>
        </div>
      </div>
    </div>
  );
};

export default CrtMonitor;
