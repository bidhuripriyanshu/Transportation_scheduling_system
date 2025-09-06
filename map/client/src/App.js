import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RouteDemo from './pages/RouteDemo';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🗺️ Route Mapper
            </Link>
            <div className="nav-menu">
              <Link to="/" className="nav-link">
                Route Demo
              </Link>
            </div>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<RouteDemo />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;


