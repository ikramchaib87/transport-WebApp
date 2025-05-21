import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown, ChevronUp, Clock, Users, ArrowRight, RotateCw } from 'lucide-react';
import "./Trajet.css";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Trajet = ({ match }) => {
  const [trajet, setTrajet] = useState(null);
  const [ligne, setLigne] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStop, setExpandedStop] = useState(null);
  const [stopTimes, setStopTimes] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  const trajetId = match?.params?.id;

  useEffect(() => {
    if (!trajetId) {
      setError("ID de trajet non fourni");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Fetch trajet details
        const trajetRes = await fetch(`http://localhost:5000/api/trajets/${trajetId}`);
        if (!trajetRes.ok) {
          throw new Error(`Erreur ${trajetRes.status}: ${trajetRes.statusText}`);
        }
        
        const trajetData = await trajetRes.json();
        const currentTrajet = trajetData.trajet || trajetData;
        
        if (!currentTrajet) {
          throw new Error("Aucune donnée de trajet reçue");
        }

        setTrajet(currentTrajet);

        // 2. Fetch ligne details
        if (!currentTrajet.ligne_id) {
          throw new Error("Aucun ID de ligne associé à ce trajet");
        }
        
        const ligneRes = await fetch(`http://localhost:5000/api/lines/${currentTrajet.ligne_id}`);
        if (!ligneRes.ok) {
          throw new Error(`Erreur ${ligneRes.status}: ${ligneRes.statusText}`);
        }
        
        let ligneData = await ligneRes.json();
        
        // Inverser les arrêts si c'est un trajet retour
        if (currentTrajet.sens === 'retour' && ligneData.stops) {
          ligneData.stops = [...ligneData.stops].reverse();
        }

        setLigne(ligneData);

        // 3. Calculer les heures des arrêts
        if (currentTrajet.heure_depart && ligneData.stops) {
          const calculatedTimes = calculateStopTimes(
            currentTrajet.heure_depart, 
            ligneData.stops
          );
          setStopTimes(calculatedTimes);
        }

      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        setError(err.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
        setMapReady(true);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      // Annule les requêtes en cours si nécessaire
    };
  }, [trajetId]);

  const calculateStopTimes = (departTime, stops) => {
    if (!departTime || !stops || stops.length === 0) return [];
    
    const [hours, minutes] = departTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    return stops.map((stop, index) => {
      // Ne pas ajouter de durée pour le premier arrêt
      if (index > 0) {
        totalMinutes += stop.duree || 0;
      }
      
      const stopHours = Math.floor(totalMinutes / 60) % 24;
      const stopMinutes = totalMinutes % 60;
      
      return {
        ...stop,
        heure: `${stopHours.toString().padStart(2, '0')}:${stopMinutes.toString().padStart(2, '0')}`
      };
    });
  };

  const toggleStopExpansion = (index) => {
    setExpandedStop(expandedStop === index ? null : index);
  };

  const renderMap = () => {
    if (!mapReady || !ligne?.stops || ligne.stops.length < 2) return null;

    const validStops = ligne.stops.filter(stop => stop.lat && stop.lng);
    if (validStops.length < 2) return null;

    const waypoints = validStops.map(stop => [stop.lat, stop.lng]);

    return (
      <MapContainer
        center={waypoints[0]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={() => setMapReady(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {validStops.map((stop, index) => (
          <Marker 
            key={index} 
            position={[stop.lat, stop.lng]}
          >
            <Popup>
              {index === 0 ? 'Départ' : 
               index === validStops.length - 1 ? 'Arrivée' : 
               `Arrêt ${index}`}<br />
              {stop.name}
            </Popup>
          </Marker>
        ))}
        
        <Polyline 
          positions={waypoints} 
          color="#3b82f6"
          weight={5}
          opacity={0.7}
        />
      </MapContainer>
    );
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setTrajet(null);
    setLigne(null);
    setStopTimes([]);
    setTimeout(() => window.location.reload(), 300);
  };

  if (loading) {
    return (
      <div className="trajet-container">
        <Header />
        <Navbar />
        <div className="loading-state">
          <div className="spinner-container">
            <RotateCw className="spinner-icon" size={32} />
          </div>
          <p>Chargement des détails du trajet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
          <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Ma carte de transport</h2>
            <div className="emp-red-dot"></div>
          </div>
          <p className="error-message">{error}</p>
          <button 
            onClick={handleRefresh}
            className="refresh-button"
          >
            <RotateCw size={16} /> Réessayer
          </button>
         </div>
        </div>
      </div>
    );
  }

  if (!trajet || !ligne) {
    return (
          <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Ma carte de transport</h2>
            <div className="emp-red-dot"></div>
          </div>
          <p>Aucune donnée de trajet disponible</p>
          <button 
            onClick={handleRefresh}
            className="refresh-button"
          >
            <RotateCw size={16} /> Actualiser
          </button>
        </div>
         </div>
      </div>
    );
  }

  return (
      <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Ma carte de transport</h2>
            <div className="emp-red-dot"></div>
          </div>
      
      <div className="trajet-content">
        {/* En-tête du trajet */}
        <div className="trajet-header">
          <div className="header-top">
            <h2>
              <span className="line-number">Ligne {trajet.ligne_number}</span>
              <span className="route">
                {trajet.depart} <ArrowRight size={18} /> {trajet.arrivee}
              </span>
            </h2>
            <span className={`sens-tag ${trajet.sens}`}>
              {trajet.sens === 'aller' ? 'Aller' : 'Retour'}
            </span>
          </div>

          <div className="header-meta">
            <div className="meta-item">
              <Clock size={16} />
              <span>{trajet.heure_depart} - {trajet.heure_arrivee}</span>
            </div>
            <div className="meta-item">
              <Users size={16} />
              <span>{trajet.nombre_places || 0} places</span>
            </div>
          </div>

          <button className="start-button">
            Démarrer le trajet
          </button>
        </div>

        {/* Détails des arrêts */}
        <div className="stops-section">
          <h3>Itinéraire et arrêts</h3>
          <div className="stops-list">
            {stopTimes.map((stop, index) => (
              <div 
                key={index} 
                className={`stop-item ${index === 0 ? 'first' : index === stopTimes.length - 1 ? 'last' : ''}`}
              >
                <div 
                  className="stop-header"
                  onClick={() => toggleStopExpansion(index)}
                >
                  <div className="stop-marker">
                    {index === 0 ? (
                      <div className="marker-start"></div>
                    ) : index === stopTimes.length - 1 ? (
                      <div className="marker-end"></div>
                    ) : (
                      <div className="marker-middle">{index}</div>
                    )}
                  </div>
                  <div className="stop-info">
                    <span className="stop-name">{stop.name}</span>
                    <span className="stop-time">{stop.heure}</span>
                  </div>
                  <div className="stop-toggle">
                    {expandedStop === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedStop === index && (
                  <div className="stop-details">
                    <div className="detail-row">
                      <span>Heure prévue:</span>
                      <span className="detail-value">{stop.heure}</span>
                    </div>
                    <div className="detail-row">
                      <span>Durée depuis départ:</span>
                      <span className="detail-value">{stop.duree || 0} minutes</span>
                    </div>
                    {stop.lat && stop.lng && (
                      <div className="detail-row">
                        <span>Coordonnées:</span>
                        <span className="detail-value">{stop.lat}, {stop.lng}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Carte de l'itinéraire */}
        <div className="map-section">
          <h3>Visualisation de l'itinéraire</h3>
          <div className="map-wrapper">
            {renderMap() || (
              <div className="map-placeholder">
                <MapPin size={24} />
                <p>Carte non disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
     </div>
  );
};

export default Trajet;