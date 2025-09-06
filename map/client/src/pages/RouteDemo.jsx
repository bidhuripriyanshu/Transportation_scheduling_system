import React, { useState, useCallback } from 'react';
import RouteMap from '../components/RouteMap';
import './RouteDemo.css';

const RouteDemo = () => {
  const [startLocation, setStartLocation] = useState('Karlsruhe, Germany');
  const [endLocation, setEndLocation] = useState('Heidelberg, Germany');
  const [startCoords, setStartCoords] = useState([8.681495, 49.41461]); // Karlsruhe, Germany
  const [endCoords, setEndCoords] = useState([8.687872, 49.420318]); // Heidelberg, Germany
  const [routePath, setRoutePath] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);

  // No server profiles; using Google travel modes

  const handleMapLoad = useCallback((map) => {
    console.log('Map loaded successfully');
  }, []);

  // Geocode using Google Maps Geocoder
  const geocodeLocation = async (location, type) => {
    if (!location.trim()) return;
    setGeocodingLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ address: location.trim() });
      if (results && results.length > 0) {
        const r = results[0];
        const lng = r.geometry.location.lng();
        const lat = r.geometry.location.lat();
        const coords = [lng, lat];
        const formatted = [{
          name: r.formatted_address,
          coordinates: coords,
          country: '',
          region: '',
          locality: ''
        }];
        if (type === 'start') {
          setStartCoords(coords);
          setStartSuggestions(formatted);
          setShowStartSuggestions(true);
        } else {
          setEndCoords(coords);
          setEndSuggestions(formatted);
          setShowEndSuggestions(true);
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(`Failed to find location: ${location}`);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Handle location input changes with debouncing
  const handleStartLocationChange = (value) => {
    setStartLocation(value);
    if (value.length > 2) {
      const timeoutId = setTimeout(() => {
        geocodeLocation(value, 'start');
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleEndLocationChange = (value) => {
    setEndLocation(value);
    if (value.length > 2) {
      const timeoutId = setTimeout(() => {
        geocodeLocation(value, 'end');
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Select a location from suggestions
  const selectLocation = (location, type) => {
    if (type === 'start') {
      setStartLocation(location.name);
      setStartCoords(location.coordinates);
      setShowStartSuggestions(false);
    } else {
      setEndLocation(location.name);
      setEndCoords(location.coordinates);
      setShowEndSuggestions(false);
    }
  };

  const fetchRoute = async () => {
    if (!startLocation.trim() || !endLocation.trim()) {
      setError('Please provide both start and end locations');
      return;
    }

    setLoading(true);
    setError(null);
    setRoutePath([]);
    setRouteInfo(null);

    try {
      const geocoder = new window.google.maps.Geocoder();
      const [startRes, endRes] = await Promise.all([
        geocoder.geocode({ address: startLocation.trim() }),
        geocoder.geocode({ address: endLocation.trim() })
      ]);

      const s = startRes.results[0];
      const e = endRes.results[0];
      if (!s || !e) {
        setError('Could not find coordinates for one or both locations');
        return;
      }
      const sPos = { lat: s.geometry.location.lat(), lng: s.geometry.location.lng() };
      const ePos = { lat: e.geometry.location.lat(), lng: e.geometry.location.lng() };
      setStartCoords([sPos.lng, sPos.lat]);
      setEndCoords([ePos.lng, ePos.lat]);

      const directionsService = new window.google.maps.DirectionsService();
      const response = await directionsService.route({
        origin: sPos,
        destination: ePos,
        travelMode: travelMode,
      });

      const leg = response.routes[0].legs[0];
      const overviewPath = response.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
      setRoutePath(overviewPath);
      setRouteInfo({
        distance: leg.distance.value, // meters
        duration: Math.round(leg.duration.value), // seconds
        profile: travelMode,
      });
    } catch (err) {
      console.error('Route fetch error:', err);
      setError('Failed to fetch route');
    } finally {
      setLoading(false);
    }
  };



  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  return (
    <div className="route-demo">
      <div className="demo-header">
        <h1>Route Mapper Demo</h1>
        <p>Enter location names to find routes between places using Google Maps</p>
      </div>

      <div className="demo-content">
        <div className="controls-panel">
          <div className="location-inputs">
            <div className="location-group">
              <h3>Start Location</h3>
              <div className="location-input-container">
                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => handleStartLocationChange(e.target.value)}
                  placeholder="Enter start location (e.g., New York, NY)"
                  className="location-input"
                />
                {geocodingLoading && <div className="loading-indicator">🔍</div>}
                {showStartSuggestions && startSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {startSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => selectLocation(suggestion, 'start')}
                      >
                        <div className="suggestion-name">{suggestion.name}</div>
                        <div className="suggestion-details">
                          {suggestion.locality && `${suggestion.locality}, `}
                          {suggestion.region && `${suggestion.region}, `}
                          {suggestion.country}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="location-group">
              <h3>End Location</h3>
              <div className="location-input-container">
                <input
                  type="text"
                  value={endLocation}
                  onChange={(e) => handleEndLocationChange(e.target.value)}
                  placeholder="Enter end location (e.g., Los Angeles, CA)"
                  className="location-input"
                />
                {geocodingLoading && <div className="loading-indicator">🔍</div>}
                {showEndSuggestions && endSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {endSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => selectLocation(suggestion, 'end')}
                      >
                        <div className="suggestion-name">{suggestion.name}</div>
                        <div className="suggestion-details">
                          {suggestion.locality && `${suggestion.locality}, `}
                          {suggestion.region && `${suggestion.region}, `}
                          {suggestion.country}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-selection">
            <h3>Travel Mode</h3>
            <select value={travelMode} onChange={(e) => setTravelMode(e.target.value)}>
              <option value="DRIVING">Driving</option>
              <option value="WALKING">Walking</option>
              <option value="BICYCLING">Bicycling</option>
              <option value="TRANSIT">Transit</option>
            </select>
          </div>

          <button 
            className="fetch-route-btn"
            onClick={fetchRoute}
            disabled={loading}
          >
            {loading ? 'Finding Route...' : 'Find Route'}
          </button>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {routeInfo && (
            <div className="route-info">
              <h3>Route Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Distance:</span>
                  <span className="info-value">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Duration:</span>
                  <span className="info-value">{formatDuration(routeInfo.duration)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Mode:</span>
                  <span className="info-value">{travelMode}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="map-container">
          <RouteMap
            startCoords={startCoords}
            endCoords={endCoords}
            routePath={routePath}
            onMapLoad={handleMapLoad}
          />
        </div>
      </div>
    </div>
  );
};

export default RouteDemo;
