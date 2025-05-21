import React, { useState, useEffect } from "react";
import { MapPin, Clock, Map, Check, X, Navigation, MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import "./Accueille.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";

// Configuration des icônes Leaflet
let DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Composant pour gérer le routage sur la carte
function RoutingMachine({ waypoints }) {
  const map = useMap();
  const routingLayerRef = React.useRef(null);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    if (routingLayerRef.current) {
      try {
        map.removeLayer(routingLayerRef.current);
        routingLayerRef.current = null;
      } catch (error) {
        console.error("Erreur lors de la suppression de la couche:", error);
      }
    }

    const createCustomRoutingLayer = async () => {
      const routeWaypoints = waypoints
        .filter(wp => wp && wp.lat && wp.lng)
        .map(wp => L.latLng(wp.lat, wp.lng));
      
      if (routeWaypoints.length < 2) return;

      try {
        const routingLayer = L.layerGroup().addTo(map);
        routingLayerRef.current = routingLayer;

        const waypointsString = routeWaypoints
          .map(wp => `${wp.lng},${wp.lat}`)
          .join(';');
        
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${waypointsString}?overview=full&geometries=geojson`
        );
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          const routePath = L.geoJSON(route.geometry, {
            style: {
              color: '#FF6600',
              weight: 5,
              opacity: 0.7
            }
          }).addTo(routingLayer);
          
          map.fitBounds(routePath.getBounds());
        } else {
          console.error("Pas d'itinéraire trouvé:", data);
        }
      } catch (error) {
        console.error("Erreur lors de la création de l'itinéraire:", error);
      }
    };

    const timer = setTimeout(() => {
      createCustomRoutingLayer();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (routingLayerRef.current && map) {
        try {
          map.removeLayer(routingLayerRef.current);
          routingLayerRef.current = null;
        } catch (error) {
          console.error("Erreur lors du nettoyage:", error);
        }
      }
    };
  }, [map, waypoints]);

  return null;
}

// Fonction pour géocoder les adresses
const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Erreur lors du géocodage:", error);
    return null;
  }
};

const Accueil = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapWaypoints, setMapWaypoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [nextStationIndex, setNextStationIndex] = useState(0);

  // Récupérer les données de l'employé connecté et sa ligne
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        
        // Récupérer l'employé connecté
        const employeeResponse = await fetch('http://localhost:5000/api/employee/current', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!employeeResponse.ok) {
          throw new Error(`Erreur ${employeeResponse.status} lors de la récupération des données employé`);
        }
        
        const employeeData = await employeeResponse.json();
        setEmployeeData(employeeData);
        
        // Si l'employé a une ligne, charger les détails
        if (employeeData.line_id) {
          const lineResponse = await fetch(`http://localhost:5000/api/lines/${employeeData.line_id}`);
          
          if (!lineResponse.ok) {
            throw new Error(`Erreur ${lineResponse.status} lors de la récupération de la ligne`);
          }
          
          const lineData = await lineResponse.json();
          
          // Charger les coordonnées des arrêts
          const stopsWithCoordinates = await loadStopCoordinates(lineData);
          
          setEmployeeData(prev => ({
            ...prev,
            line: lineData,
            stops: stopsWithCoordinates
          }));
          
          // Déterminer l'index du prochain arrêt
          if (employeeData.stop_id) {
            const stopIndex = lineData.stops.findIndex(stop => stop.id === employeeData.stop_id);
            setNextStationIndex(stopIndex !== -1 ? stopIndex : 0);
          }
        }
        
      } catch (err) {
        console.error("Erreur:", err);
        setError("Erreur lors du chargement des données. Mode démonstration activé.");
        
        // Données fictives pour la démo
        const mockData = {
          id: 1,
          nom: "Benali",
          prenom: "Mohamed",
          email: "m.benali@sonatrach.dz",
          line_id: 1,
          stop_id: 3,
          line: {
            id: 1,
            number: "L100",
            name: "Siège - Cheraga",
            depart: "SONATRACH Direction Générale, Hydra",
            arrivee: "Gare Routière, Cheraga",
            distance: "12.5 km",
            duree: "30 min",
            stops: [
              { id: 1, name: "SONATRACH Direction Générale, Hydra", duree: 0 },
              { id: 2, name: "Place 1er Mai, Alger", duree: 8 },
              { id: 3, name: "Dar El Beida, Alger", duree: 15 },
              { id: 4, name: "Bab Ezzouar, Alger", duree: 22 },
              { id: 5, name: "Gare Routière, Cheraga", duree: 30 }
            ]
          }
        };
        
        setEmployeeData(mockData);
        loadStopCoordinates(mockData.line);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
    
    // Récupérer la position de l'utilisateur si possible
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.warn("Erreur de géolocalisation:", err);
        }
      );
    }
  }, []);

  // Charger les coordonnées des arrêts
  const loadStopCoordinates = async (line) => {
    if (!line || !line.stops || line.stops.length < 2) return [];
    
    try {
      const waypointsPromises = line.stops.map(stop => 
        geocodeAddress(stop.name)
      );

      const results = await Promise.all(waypointsPromises);
      const validWaypoints = results.filter(wp => wp !== null);
      
      setMapWaypoints(validWaypoints);
      return validWaypoints;
    } catch (error) {
      console.error("Erreur lors du chargement des coordonnées:", error);
      return [];
    }
  };

  // Trouver l'arrêt de l'employé dans la ligne
  const findEmployeeStop = () => {
    if (!employeeData || !employeeData.line || !employeeData.line.stops || !employeeData.stop_id) return null;
    
    return employeeData.line.stops.find(stop => stop.id === employeeData.stop_id) || null;
  };

  const employeeStop = findEmployeeStop();

  if (loading) {
    return (
      <div className="page-container">
        <Header />
        <div className="content-container">
          <Navbar />
          <div className="main-content">
            <div className="loading-container">
              <Clock className="loading-icon" size={32} />
              <p>Chargement de vos informations de transport...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <div className="content-container">
        <Navbar />
        <div className="main-content">          
          {error && <div className="info-alert">{error}</div>}
          
          {employeeData?.line ? (
            <div className="dashboard-container">
              {/* Partie gauche: Détails de la ligne et des stations */}
              <div className="ligne-section">
                <div className="section-header">
                  <MapPin size={18} /> 
                  <span>Votre Ligne de Transport</span>
                </div>
                <div className="ligne-content">
                  <div className="ligne-info">
                    <div className="ligne-number">Ligne N°{employeeData.line.number}</div>
                    <div className="ligne-name">{employeeData.line.name}</div>
                    <div className="ligne-metrics">
                      <span>{employeeData.line.distance}</span>
                      <span>{employeeData.line.duree}</span>
                    </div>
                  </div>

                  <div className="adresses">
                    <div className="adresse-depart">{employeeData.line.depart}</div>
                    <div className="adresse-separator">→</div>
                    <div className="adresse-arrivee">{employeeData.line.arrivee}</div>
                  </div>
                  
                  {employeeStop && (
                    <div className="your-stop">
                      <div className="your-stop-label">Votre arrêt</div>
                      <div className="your-stop-name">{employeeStop.name}</div>
                    </div>
                  )}
                  
                  <div className="stations-container">
                    {employeeData.line.stops.map((stop, index) => (
                      <div 
                        key={stop.id || index} 
                        className={`station-item ${employeeStop && employeeStop.id === stop.id ? 'your-station' : ''}`}
                      >
                        <div className="station-timeline">
                          <div className={`station-dot ${index <= nextStationIndex ? 'active' : 'inactive'}`}></div>
                          {index < employeeData.line.stops.length - 1 && (
                            <div className="station-line"></div>
                          )}
                        </div>
                        <div className="station-info">
                          <div className="station-name">
                            {stop.name}
                            {employeeStop && employeeStop.id === stop.id && (
                              <span className="your-station-badge">Votre arrêt</span>
                            )}
                          </div>
                          <div className="station-time">
                            <span className="duree">{stop.duree} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Partie droite: Carte avec l'itinéraire */}
              <div className="bus-section">
                <div className="section-header">
                  <MapIcon size={18} />
                  <span>Carte d'Itinéraire</span>
                </div>
                <div className="map-container">
                  {mapWaypoints.length >= 2 ? (
                    <MapContainer 
                      center={mapWaypoints[0]} 
                      zoom={12} 
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      
                      {/* Marqueurs pour chaque arrêt */}
                      {mapWaypoints.map((waypoint, index) => {
                        const stop = employeeData.line.stops[index];
                        const isEmployeeStop = employeeStop && employeeStop.id === stop?.id;
                        
                        return (
                          <Marker 
                            key={index} 
                            position={[waypoint.lat, waypoint.lng]}
                            icon={isEmployeeStop ? new L.Icon({
                              iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                              iconSize: [30, 46],
                              iconAnchor: [15, 46],
                              className: "employee-marker"
                            }) : DefaultIcon}
                          >
                            <Popup>
                              <div className="popup-content">
                                <div className={`popup-title ${isEmployeeStop ? 'employee-stop' : ''}`}>
                                  {stop?.name || "Arrêt"}
                                </div>
                                <div className="popup-info">
                                  {isEmployeeStop ? "Votre arrêt de ramassage" : `Arrêt n°${index + 1}`}
                                </div>
                                <div className="popup-time">
                                  Temps de trajet: {stop?.duree || "0"} min
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                      
                      {/* Marqueur pour la position de l'utilisateur si disponible */}
                      {userLocation && (
                        <Marker 
                          position={[userLocation.lat, userLocation.lng]}
                          icon={new L.Icon({
                            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            className: "user-location-marker"
                          })}
                        >
                          <Popup>
                            <div>Votre position actuelle</div>
                          </Popup>
                        </Marker>
                      )}
                      
                      {/* Composant de routage pour afficher l'itinéraire */}
                      <RoutingMachine waypoints={mapWaypoints} />
                    </MapContainer>
                  ) : (
                    <div className="map-placeholder">
                      <MapIcon size={32} className="map-placeholder-icon" />
                      <p>Chargement de la carte...</p>
                    </div>
                  )}
                </div>
                
                {/* Informations complémentaires sur les prochains départs */}
                <div className="bus-status-card">
                  <h3 className="bus-status-title">État du service</h3>
                  <div className="bus-status-item">
                    <div className="status-icon active">
                      <Check size={16} />
                    </div>
                    <div className="status-info">
                      <div className="status-title">Service actif aujourd'hui</div>
                      <div className="status-details">Prochain départ: 16h30</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-line-assigned">
              <div className="no-line-icon">
                <X size={32} />
              </div>
              <h2 className="no-line-title">Aucune ligne de transport assignée</h2>
              <p className="no-line-message">
                Vous n'avez pas encore de ligne de transport assignée. Veuillez contacter votre administrateur.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accueil;