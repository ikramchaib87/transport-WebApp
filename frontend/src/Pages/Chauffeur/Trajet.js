import React, { useState, useEffect } from "react";
import { MapPin, Clock, ArrowRight, RotateCw } from 'lucide-react';
import "./Trajet.css";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configuration des icônes Leaflet
L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const Trajet = () => {
  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [stopTimes, setStopTimes] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  const fetchTrajets = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Récupérer le nom du chauffeur depuis sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('user'));
    if (!userData?.displayName) {
      throw new Error('Nom du chauffeur non trouvé dans sessionStorage');
    }

    // Appel API pour récupérer tous les trajets du chauffeur
    const response = await fetch(
      `http://localhost:5000/api/plan?chauffeur=${encodeURIComponent(userData.displayName)}`
    );

    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }

    const data = await response.json();
    
    // Filtrer pour aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const trajetsToday = data.filter(trajet => {
      let activeDates = null;
      
      // Tentative de parsing sécurisée de active_dates
      if (trajet.active_dates) {
        try {
          // Vérifier si c'est déjà un objet/array ou une string
          if (typeof trajet.active_dates === 'string') {
            // Nettoyer la string avant de parser
            const cleanedString = trajet.active_dates.trim();
            if (cleanedString.startsWith('[') || cleanedString.startsWith('{')) {
              activeDates = JSON.parse(cleanedString);
            }
          } else {
            // Si c'est déjà un objet/array, l'utiliser directement
            activeDates = trajet.active_dates;
          }
        } catch (parseError) {
          console.warn(`Erreur de parsing pour active_dates du trajet ${trajet.id}:`, parseError);
          console.log('Valeur problématique:', trajet.active_dates);
          // Continuer sans les dates actives
          activeDates = null;
        }
      }
      
      return (
        // Vérifier les dates actives explicites
        (activeDates && Array.isArray(activeDates) && activeDates.includes(today)) ||
        // Ou vérifier la plage date_debut/date_fin
        (!trajet.date_debut || trajet.date_debut <= today) &&
        (!trajet.date_fin || trajet.date_fin >= today)
      );
    });

    setTrajets(trajetsToday);
    
    // Sélectionner le premier trajet par défaut
    if (trajetsToday.length > 0) {
      handleTrajetSelect(trajetsToday[0]);
    }

  } catch (err) {
    console.error("Erreur lors du chargement:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleTrajetSelect = (trajet) => {
  // Fonction utilitaire pour parser JSON de manière sécurisée
  const safeJsonParse = (jsonString, fallback = null) => {
    if (!jsonString) return fallback;
    
    try {
      if (typeof jsonString === 'string') {
        const cleaned = jsonString.trim();
        if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
          return JSON.parse(cleaned);
        }
      } else {
        // Si c'est déjà un objet/array
        return jsonString;
      }
    } catch (error) {
      console.warn('Erreur de parsing JSON:', error);
    }
    
    return fallback;
  };

  // Mettre à jour le trajet sélectionné
  setSelectedTrajet({
    ...trajet,
    ligne_stops: safeJsonParse(trajet.ligne_stops, [])
  });

  // Calculer les horaires d'arrêt
  const stopsWithTimes = calculateStopTimes(trajet.heure_depart, safeJsonParse(trajet.ligne_stops, []));
  setStopTimes(stopsWithTimes);

  // Prêt pour afficher la carte
  setMapReady(false); // Reset pour forcer un re-render
};

  const calculateStopTimes = (departTime, stops) => {
    if (!departTime || !stops?.length) return [];
    
    const [hours, minutes] = departTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    return stops.map((stop, index) => {
      if (index > 0) totalMinutes += stop.duree || 0;
      
      const stopHours = Math.floor(totalMinutes / 60) % 24;
      const stopMinutes = totalMinutes % 60;
      
      return {
        ...stop,
        heure: `${stopHours.toString().padStart(2, '0')}:${stopMinutes.toString().padStart(2, '0')}`
      };
    });
  };

  const renderMap = () => {
    if (!mapReady || !selectedTrajet?.ligne_stops || selectedTrajet.ligne_stops.length < 2) {
      return (
        <div className="map-placeholder">
          <MapPin size={24} />
          <p>Carte non disponible</p>
        </div>
      );
    }

    const validStops = selectedTrajet.ligne_stops.filter(stop => stop.lat && stop.lng);
    if (validStops.length < 2) {
      return (
        <div className="map-placeholder">
          <p>Coordonnées des arrêts manquantes</p>
        </div>
      );
    }

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
          <Marker key={index} position={[stop.lat, stop.lng]}>
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
    setTrajets([]);
    setSelectedTrajet(null);
    fetchTrajets();
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.replace(':', 'h');
  };

  useEffect(() => {
    fetchTrajets();
  }, []);

  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Mes Trajets du Jour</h2>
            <div className="emp-red-dot"></div>
          </div>

          {loading ? (
            <div className="loading-container">
              <RotateCw className="spinner" size={32} />
              <p>Chargement de vos trajets...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button onClick={handleRefresh} className="refresh-button">
                <RotateCw size={16} /> Réessayer
              </button>
            </div>
          ) : trajets.length === 0 ? (
            <div className="empty-state">
              <p>Aucun trajet prévu aujourd'hui</p>
              <button onClick={handleRefresh} className="refresh-button">
                <RotateCw size={16} /> Actualiser
              </button>
            </div>
          ) : (
            <div className="trajet-view">
              <div className="trajet-list">
                <h3>Vos trajets</h3>
                {trajets.map((trajet, index) => (
                  <div 
                    key={index}
                    className={`trajet-card ${selectedTrajet?.id === trajet.id ? 'active' : ''}`}
                    onClick={() => handleTrajetSelect(trajet)}
                  >
                    <div className="trajet-info">
                      <h4>Ligne {trajet.ligne_number}</h4>
                      <p className="route">
                        {trajet.depart} <ArrowRight size={14} /> {trajet.arrivee}
                      </p>
                    </div>
                    <div className="trajet-time">
                      <span>{formatTime(trajet.heure_depart)}</span>
                      <span>{formatTime(trajet.heure_arrivee)}</span>
                    </div>
                    <div className={`trajet-sens ${trajet.sens}`}>
                      {trajet.sens === 'aller' ? 'Aller' : 'Retour'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="trajet-details">
                {selectedTrajet ? (
                  <>
                    <div className="detail-header">
                      <h3>
                        {selectedTrajet.depart} 
                        <ArrowRight size={18} /> 
                        {selectedTrajet.arrivee}
                      </h3>
                      <div className="detail-meta">
                        <span>Ligne {selectedTrajet.ligne_number}</span>
                        <span>{selectedTrajet.heure_depart} - {selectedTrajet.heure_arrivee}</span>
                      </div>
                    </div>

                    <div className="map-container">
                      {renderMap()}
                    </div>

                    <div className="stops-timeline">
                      <h4>Itinéraire complet</h4>
                      {stopTimes.length > 0 ? (
                        stopTimes.map((stop, index) => (
                          <div key={index} className="stop-item">
                            <div className="stop-time">{stop.heure}</div>
                            <div className="stop-marker">
                              <div className="marker-dot"></div>
                              {index < stopTimes.length - 1 && <div className="marker-line"></div>}
                            </div>
                            <div className="stop-info">
                              <div className="stop-name">{stop.name}</div>
                              {stop.adresse && (
                                <div className="stop-address">{stop.adresse}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>Aucun arrêt disponible</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="no-trajet-selected">
                    <p>Sélectionnez un trajet pour voir les détails</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trajet;