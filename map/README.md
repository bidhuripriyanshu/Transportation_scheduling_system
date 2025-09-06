# Route Mapper

A web application for viewing routes between locations using OpenRouteService API. Built with Express.js backend and React frontend with MapLibre GL for interactive mapping.

## Features

- 🗺️ Interactive map with OpenStreetMap tiles
- 🚗 Multiple routing profiles (driving, cycling, walking, etc.)
- 📍 Start and end location markers
- 📊 Route information (distance, duration)
- 🎨 Clean, responsive UI
- 🔄 Real-time route calculation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenRouteService API key (free at [openrouteservice.org](https://openrouteservice.org/))

## Installation

1. **Clone or download the project**
   ```bash
   cd route-mapper
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp server/env.example server/.env
   ```
   
   Edit `server/.env` and add your OpenRouteService API key:
   ```
   ORS_API_KEY=your_openrouteservice_api_key_here
   PORT=5000
   NODE_ENV=development
   ```

4. **Get an OpenRouteService API key**
   - Visit [openrouteservice.org](https://openrouteservice.org/)
   - Sign up for a free account
   - Generate an API key
   - Add it to your `server/.env` file

## Running the Application

### Development Mode

Start both the backend and frontend in development mode:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Production Mode

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Start the backend:**
   ```bash
   npm run server
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Enter the longitude and latitude coordinates for your start and end locations
3. Select a routing profile (driving, cycling, walking, etc.)
4. Click "Find Route" to calculate and display the route on the map
5. View route information including distance and estimated duration

### Example Coordinates

- **Karlsruhe, Germany (Start):** Longitude: 8.681495, Latitude: 49.41461
- **Karlsruhe, Germany (End):** Longitude: 8.687872, Latitude: 49.420318

## API Endpoints

### Backend API

- `GET /api/health` - Health check
- `GET /api/directions/route` - Get route between two points
  - Query parameters: `start`, `end`, `profile`
  - Example: `/api/directions/route?start=8.681495,49.41461&end=8.687872,49.420318&profile=driving-car`
- `GET /api/directions/profiles` - Get available routing profiles

### Routing Profiles

- `driving-car` - Standard car routing
- `driving-hgv` - Heavy goods vehicle routing
- `cycling-regular` - Regular bicycle routing
- `cycling-road` - Road cycling routing
- `cycling-mountain` - Mountain bike routing
- `cycling-electric` - E-bike routing
- `foot-walking` - Pedestrian routing
- `foot-hiking` - Hiking trail routing
- `wheelchair` - Wheelchair accessible routing

## Project Structure

```
route-mapper/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   └── RouteMap.jsx
│   │   ├── pages/          # Page components
│   │   │   └── RouteDemo.jsx
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── routes/
│   │   └── directions.js   # Directions API routes
│   ├── index.js           # Server entry point
│   ├── env.example        # Environment variables example
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## Technologies Used

### Backend
- **Express.js** - Web framework
- **Axios** - HTTP client for API requests
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **MapLibre GL** - Interactive mapping library
- **Axios** - HTTP client

### APIs
- **OpenRouteService** - Routing and geocoding API
- **OpenStreetMap** - Map tiles

## Deployment

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

```
ORS_API_KEY=your_production_api_key
PORT=5000
NODE_ENV=production
```

### Deployment Options

- **Heroku**: Add the environment variables in your Heroku dashboard
- **Vercel**: Add environment variables in your Vercel project settings
- **Railway**: Add environment variables in your Railway project settings
- **DigitalOcean App Platform**: Add environment variables in your app settings

## Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Make sure you've set the `ORS_API_KEY` in your `server/.env` file
   - Verify the API key is correct and active

2. **"No route found" error**
   - Check that the coordinates are valid (longitude: -180 to 180, latitude: -90 to 90)
   - Try different routing profiles
   - Ensure the locations are accessible by the selected profile

3. **Map not loading**
   - Check your internet connection
   - Verify that the frontend is running on port 3000
   - Check browser console for any JavaScript errors

4. **CORS errors**
   - Make sure the backend is running on port 5000
   - Check that the proxy is configured in `client/package.json`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information about your problem


