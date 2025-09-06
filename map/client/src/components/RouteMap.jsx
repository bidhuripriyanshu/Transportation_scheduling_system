import React, { useEffect, useRef, useState } from 'react';
import './RouteMap.css';

const loadGoogleMapsScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const RouteMap = ({ 
  startCoords, 
  endCoords, 
  routePath, 
  onMapLoad
}) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef({ start: null, end: null });
  const polylineRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (!mapContainer.current) return;
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      await loadGoogleMapsScript(apiKey);

      mapRef.current = new window.google.maps.Map(mapContainer.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMapLoaded(true);
      if (onMapLoad) onMapLoad(mapRef.current);
    };

    init();

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      if (markersRef.current.start) markersRef.current.start.setMap(null);
      if (markersRef.current.end) markersRef.current.end.setMap(null);
    };
  }, [onMapLoad]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Update markers
    const map = mapRef.current;
    if (startCoords) {
      const pos = { lng: startCoords[0], lat: startCoords[1] };
      if (!markersRef.current.start) {
        markersRef.current.start = new window.google.maps.Marker({
          position: pos,
          map,
          label: 'A'
        });
      } else {
        markersRef.current.start.setPosition(pos);
      }
    }

    if (endCoords) {
      const pos = { lng: endCoords[0], lat: endCoords[1] };
      if (!markersRef.current.end) {
        markersRef.current.end = new window.google.maps.Marker({
          position: pos,
          map,
          label: 'B'
        });
      } else {
        markersRef.current.end.setPosition(pos);
      }
    }

    // Fit bounds
    if (startCoords && endCoords) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lng: startCoords[0], lat: startCoords[1] });
      bounds.extend({ lng: endCoords[0], lat: endCoords[1] });
      map.fitBounds(bounds, 50);
    }
  }, [startCoords, endCoords, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (routePath && routePath.length > 0) {
      polylineRef.current = new window.google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      polylineRef.current.setMap(mapRef.current);
    }
  }, [routePath, mapLoaded]);

  return (
    <div className="route-map-container">
      <div ref={mapContainer} className="route-map" />
      {!mapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default RouteMap;

