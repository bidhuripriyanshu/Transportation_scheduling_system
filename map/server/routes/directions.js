const express = require('express');
const axios = require('axios');
const router = express.Router();

// OpenRouteService API configuration
const ORS_API_KEY = process.env.ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEyZjQ5MzlkNmY4ODRkMzI4ZWU1NjA0ZGQzYWE4ZWQwIiwiaCI6Im11cm11cjY0In0=';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions';

if (!ORS_API_KEY) {
  console.warn('Warning: ORS_API_KEY not found in environment variables');
} else {
  console.log('✅ OpenRouteService API key loaded successfully');
}

/**
 * GET /api/directions/route
 * Query parameters:
 * - start: "longitude,latitude" (e.g., "8.681495,49.41461")
 * - end: "longitude,latitude" (e.g., "8.687872,49.420318")
 * - profile: driving-car, driving-hgv, cycling-regular, cycling-road, cycling-mountain, cycling-electric, foot-walking, foot-hiking, wheelchair
 */
router.get('/route', async (req, res) => {
  try {
    const { start, end, profile = 'driving-car' } = req.query;

    // Validate required parameters
    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both start and end coordinates are required (format: "longitude,latitude")'
      });
    }

    // Validate coordinate format
    const startCoords = start.split(',').map(coord => parseFloat(coord.trim()));
    const endCoords = end.split(',').map(coord => parseFloat(coord.trim()));

    if (startCoords.length !== 2 || endCoords.length !== 2 ||
        isNaN(startCoords[0]) || isNaN(startCoords[1]) ||
        isNaN(endCoords[0]) || isNaN(endCoords[1])) {
      return res.status(400).json({
        error: 'Invalid coordinate format',
        message: 'Coordinates must be in format "longitude,latitude" (e.g., "8.681495,49.41461")'
      });
    }

    // Validate longitude and latitude ranges
    if (startCoords[0] < -180 || startCoords[0] > 180 || endCoords[0] < -180 || endCoords[0] > 180) {
      return res.status(400).json({
        error: 'Invalid longitude',
        message: 'Longitude must be between -180 and 180'
      });
    }

    if (startCoords[1] < -90 || startCoords[1] > 90 || endCoords[1] < -90 || endCoords[1] > 90) {
      return res.status(400).json({
        error: 'Invalid latitude',
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (!ORS_API_KEY) {
      return res.status(500).json({
        error: 'API configuration error',
        message: 'OpenRouteService API key not configured'
      });
    }

    // Prepare request to OpenRouteService
    const requestBody = {
      coordinates: [startCoords, endCoords],
      format: 'geojson'
    };

    // Make request to OpenRouteService
    const response = await axios.post(`${ORS_BASE_URL}/${profile}/geojson`, requestBody, {
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    // Extract route information
    const routeData = response.data;
    
    if (!routeData.features || routeData.features.length === 0) {
      return res.status(404).json({
        error: 'No route found',
        message: 'Unable to find a route between the specified locations'
      });
    }

    // Calculate route summary
    const route = routeData.features[0];
    const summary = route.properties.summary || {};
    
    const routeInfo = {
      distance: summary.distance || 0, // in meters
      duration: summary.duration || 0, // in seconds
      distanceKm: Math.round((summary.distance || 0) / 1000 * 100) / 100,
      durationMinutes: Math.round((summary.duration || 0) / 60 * 100) / 100,
      profile: profile
    };

    // Return GeoJSON with additional route information
    res.json({
      type: 'FeatureCollection',
      features: [{
        ...route,
        properties: {
          ...route.properties,
          routeInfo: routeInfo
        }
      }],
      routeInfo: routeInfo
    });

  } catch (error) {
    console.error('Directions API error:', error.message);
    
    if (error.response) {
      // OpenRouteService API error
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        return res.status(400).json({
          error: 'Invalid request',
          message: data.error?.message || 'Invalid route parameters'
        });
      } else if (status === 401) {
        return res.status(500).json({
          error: 'API authentication error',
          message: 'Invalid OpenRouteService API key'
        });
      } else if (status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests to OpenRouteService API'
        });
      } else {
        return res.status(500).json({
          error: 'External API error',
          message: 'Error from OpenRouteService API'
        });
      }
    } else if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'Request to OpenRouteService timed out'
      });
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch route data'
      });
    }
  }
});

/**
 * GET /api/directions/geocode
 * Geocode location names to coordinates
 * Query parameters:
 * - location: location name (e.g., "New York, NY" or "Paris, France")
 */
router.get('/geocode', async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Location parameter is required'
      });
    }

    if (!ORS_API_KEY) {
      return res.status(500).json({
        error: 'API configuration error',
        message: 'OpenRouteService API key not configured'
      });
    }

    // Make request to OpenRouteService Geocoding API
    const response = await axios.get('https://api.openrouteservice.org/geocode/search', {
      params: {
        api_key: ORS_API_KEY,
        text: location,
        size: 5
      },
      timeout: 10000
    });

    const results = response.data.features || [];
    
    if (results.length === 0) {
      return res.status(404).json({
        error: 'Location not found',
        message: `No results found for "${location}"`
      });
    }

    // Format results
    const formattedResults = results.map(feature => ({
      name: feature.properties.label,
      coordinates: feature.geometry.coordinates,
      country: feature.properties.country,
      region: feature.properties.region,
      locality: feature.properties.locality
    }));

    res.json({
      query: location,
      results: formattedResults
    });

  } catch (error) {
    console.error('Geocoding API error:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        return res.status(400).json({
          error: 'Invalid request',
          message: data.error?.message || 'Invalid geocoding parameters'
        });
      } else if (status === 401) {
        return res.status(500).json({
          error: 'API authentication error',
          message: 'Invalid OpenRouteService API key'
        });
      } else if (status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests to OpenRouteService API'
        });
      } else {
        return res.status(500).json({
          error: 'External API error',
          message: 'Error from OpenRouteService Geocoding API'
        });
      }
    } else if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'Request to OpenRouteService timed out'
      });
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to geocode location'
      });
    }
  }
});

/**
 * GET /api/directions/profiles
 * Returns available routing profiles
 */
router.get('/profiles', (req, res) => {
  const profiles = [
    { id: 'driving-car', name: 'Driving (Car)', description: 'Standard car routing' },
    { id: 'driving-hgv', name: 'Driving (Heavy Goods Vehicle)', description: 'Truck routing with restrictions' },
    { id: 'cycling-regular', name: 'Cycling (Regular)', description: 'Regular bicycle routing' },
    { id: 'cycling-road', name: 'Cycling (Road)', description: 'Road cycling routing' },
    { id: 'cycling-mountain', name: 'Cycling (Mountain)', description: 'Mountain bike routing' },
    { id: 'cycling-electric', name: 'Cycling (Electric)', description: 'E-bike routing' },
    { id: 'foot-walking', name: 'Walking', description: 'Pedestrian routing' },
    { id: 'foot-hiking', name: 'Hiking', description: 'Hiking trail routing' },
    { id: 'wheelchair', name: 'Wheelchair', description: 'Wheelchair accessible routing' }
  ];

  res.json({ profiles });
});

module.exports = router;
