// Étape 1: D'abord, installez les dépendances avec npm ou yarn
// npm install leaflet react-leaflet leaflet-routing-machine

import React, { useState, useEffect, useRef } from "react";
import { Map, MapPin, Plus, Edit, Trash2, Save, X, ChevronRight, Search, Move } from 'lucide-react';
import "./Lignes.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
// Ajout des importations pour Leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
// Composant pour gérer le routage
// In the RoutingMachine component
// Composant pour gérer le routage avec une approche alternative
function RoutingMachine({ waypoints, updateRouteInfo }) {
  const map = useMap();
  const routingMachineRef = useRef(null);
  const routingLayerRef = useRef(null);

  // Création d'une solution de contournement pour les problèmes de leaflet-routing-machine
  useEffect(() => {
    // Ne rien faire s'il n'y a pas de carte ou pas assez de waypoints
    if (!map || !waypoints || waypoints.length < 2) return;

    // Nettoyer toute couche de routage existante si elle existe
    if (routingLayerRef.current) {
      try {
        map.removeLayer(routingLayerRef.current);
        routingLayerRef.current = null;
      } catch (error) {
        console.error("Erreur lors de la suppression de la couche:", error);
      }
    }

    // Créer une couche de routage personnalisée au lieu d'utiliser L.Routing.control
    const createCustomRoutingLayer = async () => {
      // Filtrer et formater les waypoints
      const routeWaypoints = waypoints
        .filter(wp => wp && wp.lat && wp.lng)
        .map(wp => L.latLng(wp.lat, wp.lng));
      
      if (routeWaypoints.length < 2) return;

      try {
        // Créer un groupe de couches pour notre routage personnalisé
        const routingLayer = L.layerGroup().addTo(map);
        routingLayerRef.current = routingLayer;

        // Configurer la requête OSRM pour obtenir l'itinéraire
        const waypointsString = routeWaypoints
          .map(wp => `${wp.lng},${wp.lat}`)
          .join(';');
        
        // Utiliser l'API OSRM publique pour obtenir les données d'itinéraire
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${waypointsString}?overview=full&geometries=geojson`
        );
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Créer une ligne pour l'itinéraire
          const routePath = L.geoJSON(route.geometry, {
            style: {
              color: '#3b82f6',
              weight: 5,
              opacity: 0.7
            }
          }).addTo(routingLayer);
          
          // Centrer la carte sur l'itinéraire
          map.fitBounds(routePath.getBounds());
          
          // Mettre à jour les informations d'itinéraire
          if (updateRouteInfo) {
            updateRouteInfo({
              distance: (route.distance / 1000).toFixed(1) + ' km',
              duree: Math.round(route.duration / 60) + ' min'
            });
          }
        } else {
          console.error("Pas d'itinéraire trouvé:", data);
        }
      } catch (error) {
        console.error("Erreur lors de la création de l'itinéraire:", error);
      }
    };

    // Exécuter notre fonction personnalisée avec un petit délai
    const timer = setTimeout(() => {
      createCustomRoutingLayer();
    }, 300);

    // Nettoyage lors du démontage
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
  }, [map, waypoints, updateRouteInfo]);

  return null;
}

// Service pour géocoder les adresses avec Nominatim (OpenStreetMap)
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

const Lignes = () => {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Charger les données depuis l'API
  useEffect(() => {
    fetchLines();
  }, []);

  const fetchLines = async () => {
    try {
      setLoading(true);
      // Utiliser l'URL complète pour éviter les problèmes de proxy
      const response = await fetch('http://localhost:3002/api/lines');
      
      // Log pour le débogage
      console.log('Response status:', response.status);
      
      // Si la réponse n'est pas ok, il y a un problème
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`Erreur ${response.status} lors du chargement des lignes`);
      }
      
      // Récupérer le texte brut pour analyser le contenu
      const responseText = await response.text();
      
      let data;
      try {
        // Essayer de parser en JSON
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Raw response:', responseText.substring(0, 200));
        throw new Error('Le serveur a renvoyé une réponse invalide');
      }
      
      setLines(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erreur dans fetchLines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLine = (line) => {
    setSelectedLine(line);
    setShowForm(false);
  };
  
  const handleAddNewLine = () => {
    setSelectedLine(null);
    setShowForm(true);
  };

  const handleSaveLine = async (lineData) => {
    // Vérifier que le numéro est bien présent
    if (!lineData.number || lineData.number.trim() === "") {
      setError("Le numéro de ligne est obligatoire");
      return;
    }
    
    try {
      const url = lineData.id ? 
        `http://localhost:3002/api/lines/${lineData.id}` : 
        'http://localhost:3002/api/lines';
      const method = lineData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      fetchLines();
      setShowForm(false);
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors de la sauvegarde:', err);
    }
  };

  const handleDeleteLine = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3002/api/lines/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      fetchLines();
      if (selectedLine && selectedLine.id === id) {
        setSelectedLine(null);
      }
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors de la suppression:', err);
    }
  };
  
  const filteredLines = lines.filter(line => 
    line.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    line.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    if (loading) {
      return <div className="ltr-loading">Chargement des lignes...</div>;
    }
    
    if (error) {
      return (
        <div className="ltr-error">
          <p>{error}</p>
          <button 
            onClick={fetchLines} 
            className="ltr-retry-button"
          >
            Réessayer
          </button>
        </div>
      );
    }

    if (showForm) {
      return (
        <LineForm 
          line={selectedLine} 
          onCancel={() => setShowForm(false)} 
          onSave={handleSaveLine}
        />
      );
    } 
    
    if (selectedLine) {
      return (
        <LineDetail 
          line={selectedLine} 
          onEdit={() => setShowForm(true)} 
          onBack={() => setSelectedLine(null)}
          onDelete={handleDeleteLine}
        />
      );
    }
    
    return (
      <LinesListView 
        lines={filteredLines} 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectLine={handleSelectLine}
        onAddNewLine={handleAddNewLine}
        onDelete={handleDeleteLine}
      />
    );
  };
  
  return (
    <div>
      <Header />
      <div className="ltr-main-container">
        <Navbar />
        <div className="ltr-content-container">
          <h2 className="ltr-page-title">
            <span className="ltr-title-underline">Lignes de transport</span>
          </h2>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Vue liste des lignes
function LinesListView({ lines, searchTerm, setSearchTerm, onSelectLine, onAddNewLine, onDelete }) {
  // Le code reste inchangé
  return (
    <div className="ltr-list-container">
      <div className="ltr-header-actions">
        <div>
          <p className="ltr-section-subtitle">Gérez les trajets et itinéraires de transport</p>
        </div>
        <button 
          onClick={onAddNewLine}
          className="ltr-add-button"
        >
          <Plus size={18} className="ltr-button-icon" />
          Nouvelle ligne
        </button>
      </div>
      
      <div className="ltr-search-container">
        <Search size={18} className="ltr-search-icon" />
        <input
          type="text"
          placeholder="Rechercher une ligne par numéro ou nom..."
          className="ltr-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="ltr-cards-grid">
        {lines.length > 0 ? (
          lines.map(line => (
            <div 
              key={line.id} 
              className="ltr-line-card"
              onClick={() => onSelectLine(line)}
            >
              <div className="ltr-card-header">
                <div className="ltr-card-title">
                  <span className="ltr-line-number">
                    N°{line.number}
                  </span>
                  <span className="ltr-line-name">{line.name}</span>
                </div>
                <div className="ltr-card-actions">
                  <button 
                    className="ltr-edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLine(line);
                    }}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="ltr-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(line.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="ltr-card-content">
                <div className="ltr-trip-info">
                  <span>{line.depart}</span>
                  <ChevronRight size={14} className="ltr-arrow-icon" />
                  <span>{line.arrivee}</span>
                </div>
                <div className="ltr-trip-metrics">
                  <span>{line.distance}</span>
                  <span>{line.duree}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="ltr-empty-state">
            <div className="ltr-empty-message">Aucune ligne trouvée</div>
            <button 
              onClick={onAddNewLine}
              className="ltr-add-button-centered"
            >
              <Plus size={18} className="ltr-button-icon" />
              Créer une ligne
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Vue détaillée d'une ligne avec la carte
function LineDetail({ line, onEdit, onBack, onDelete }) {
  const [mapWaypoints, setMapWaypoints] = useState([]);

  // Chargement des coordonnées des arrêts au montage du composant
  useEffect(() => {
    const loadStopCoordinates = async () => {
      // Déterminer les arrêts à utiliser
      let stopsToUse = [];
      
      if (line.stops && line.stops.length >= 2) {
        stopsToUse = line.stops;
      } else {
        stopsToUse = [
          { name: line.depart },
          { name: line.arrivee }
        ];
      }

      // Géocoder chaque arrêt pour obtenir les coordonnées
      const waypointsPromises = stopsToUse.map(stop => 
        geocodeAddress(stop.name)
      );

      try {
        const results = await Promise.all(waypointsPromises);
        const validWaypoints = results.filter(wp => wp !== null);
        setMapWaypoints(validWaypoints);
      } catch (error) {
        console.error("Erreur lors du chargement des coordonnées:", error);
      }
    };

    loadStopCoordinates();
  }, [line]);

  return (
    <div className="ltr-detail-container">
      <div className="ltr-detail-header">
        <button onClick={onBack} className="ltr-back-button">
          <ChevronRight size={20} className="ltr-back-icon" />
        </button>
        <div className="ltr-detail-title-container">
          <div className="ltr-detail-title">
            <span className="ltr-detail-number">
              N°{line.number}
            </span>
            <h2 className="ltr-detail-name">{line.name}</h2>
          </div>
          <p className="ltr-detail-subtitle">Détails de la ligne de transport</p>
        </div>
        <div className="ltr-detail-actions">
          <button 
            onClick={onEdit}
            className="ltr-edit-detail-button"
          >
            Modifier
          </button>
          <button 
            onClick={() => onDelete(line.id)}
            className="ltr-delete-detail-button"
          >
            Supprimer
          </button>
        </div>
      </div>
      
      <div className="ltr-map-container" style={{ height: "400px", width: "100%" }}>
        {mapWaypoints.length >= 2 ? (
          <MapContainer 
            center={mapWaypoints[0]} 
            zoom={13} 
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {mapWaypoints.map((waypoint, index) => (
              <Marker 
                key={index} 
                position={[waypoint.lat, waypoint.lng]}
              >
                <Popup>
                  {index === 0 ? `Départ: ${line.stops ? line.stops[0].name : line.depart}` : 
                   index === mapWaypoints.length - 1 ? `Arrivée: ${line.stops ? line.stops[line.stops.length - 1].name : line.arrivee}` : 
                   `Arrêt: ${line.stops[index].name}`}
                </Popup>
              </Marker>
            ))}
            
            <RoutingMachine 
              waypoints={mapWaypoints} 
              updateRouteInfo={() => {}} // En lecture seule, pas besoin de mise à jour
            />
          </MapContainer>
        ) : (
          <div className="ltr-map-placeholder">
            <MapPin size={28} className="ltr-map-pin" />
            <p className="ltr-map-text">Chargement de la carte en cours...</p>
            <p className="ltr-map-subtext">Trajet pour la ligne N°{line.number}</p>
          </div>
        )}
      </div>
      
      <div className="ltr-detail-grid">
        <div className="ltr-info-card">
          <h3 className="ltr-info-title">Informations de la ligne</h3>
          <div className="ltr-info-content">
            <div className="ltr-info-row">
              <span className="ltr-info-label">Numéro de ligne:</span>
              <span className="ltr-info-value ltr-info-value-highlight">{line.number}</span>
            </div>
            <div className="ltr-info-row">
              <span className="ltr-info-label">Départ:</span>
              <span className="ltr-info-value">{line.depart}</span>
            </div>
            <div className="ltr-info-row">
              <span className="ltr-info-label">Arrivée:</span>
              <span className="ltr-info-value">{line.arrivee}</span>
            </div>
            <div className="ltr-info-row">
              <span className="ltr-info-label">Distance:</span>
              <span className="ltr-info-value">{line.distance}</span>
            </div>
            <div className="ltr-info-row">
              <span className="ltr-info-label">Durée estimée:</span>
              <span className="ltr-info-value">{line.duree}</span>
            </div>
          </div>
        </div>
        
        <div className="ltr-stops-card">
          <h3 className="ltr-stops-title">Arrêts de la ligne</h3>
          <div className="ltr-stops-content">
            {line.stops && line.stops.length > 0 ? (
              line.stops.map((stop, index) => (
                <div 
                  key={stop.id || index} 
                  className={`ltr-stop-item ${index === 0 ? 'ltr-stop-start' : index === line.stops.length - 1 ? 'ltr-stop-end' : ''}`}
                >
                  <div className={`ltr-stop-dot ${index === 0 ? 'ltr-start-dot' : index === line.stops.length - 1 ? 'ltr-end-dot' : 'ltr-middle-dot'}`}></div>
                  <span className="ltr-stop-name">
                    {stop.name} {index === 0 ? '(départ)' : index === line.stops.length - 1 ? '(arrivée)' : ''}
                  </span>
                </div>
              ))
            ) : (
              // Affichage par défaut si aucun arrêt n'est spécifié
              <>
                <div className="ltr-stop-item ltr-stop-start">
                  <div className="ltr-stop-dot ltr-start-dot"></div>
                  <span className="ltr-stop-name">{line.depart} (départ)</span>
                </div>
                <div className="ltr-stop-item ltr-stop-end">
                  <div className="ltr-stop-dot ltr-end-dot"></div>
                  <span className="ltr-stop-name">{line.arrivee} (arrivée)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant formulaire pour ajouter/modifier une ligne avec calcul d'itinéraire
function LineForm({ line, onCancel, onSave }) {
  const initialStops = line && line.stops && line.stops.length > 0
    ? line.stops
    : line 
      ? [{ name: line.depart }, { name: line.arrivee }]
      : [{ name: "" }, { name: "" }];

  const [formData, setFormData] = useState(
    line ? { ...line } : { 
      number: "", 
      name: "", 
      depart: "", 
      arrivee: "", 
      distance: "", 
      duree: "", 
      stops: []
    }
  );

  const [stops, setStops] = useState(initialStops);
  const [formErrors, setFormErrors] = useState({});
  const [mapWaypoints, setMapWaypoints] = useState([]);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  
  useEffect(() => {
    // Synchroniser le départ et l'arrivée avec le premier et dernier arrêt
    if (stops.length >= 2) {
      setFormData(prev => ({
        ...prev,
        depart: stops[0].name,
        arrivee: stops[stops.length - 1].name
      }));
    }
  }, [stops]);

  // Mettre à jour les infos de l'itinéraire calculé
  const updateRouteInfo = (routeInfo) => {
    setFormData(prev => ({
      ...prev,
      distance: routeInfo.distance,
      duree: routeInfo.duree,
      // Si le nom n'est pas défini, suggérer un nom basé sur départ-arrivée
      name: prev.name || `${prev.depart} - ${prev.arrivee}`
    }));
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Vérification en temps réel pour le numéro
    if (name === 'number') {
      if (!value || value.trim() === '') {
        setFormErrors(prev => ({ ...prev, number: 'Le numéro de ligne est obligatoire' }));
      } else {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.number;
          return newErrors;
        });
      }
    }
    
    // Mise à jour automatique des arrêts de départ et d'arrivée
    if (name === 'depart' && stops.length > 0) {
      const newStops = [...stops];
      newStops[0].name = value;
      setStops(newStops);
    } else if (name === 'arrivee' && stops.length > 0) {
      const newStops = [...stops];
      newStops[newStops.length - 1].name = value;
      setStops(newStops);
    }
  };
  
  const handleStopChange = (index, value) => {
    const newStops = [...stops];
    newStops[index].name = value;
    setStops(newStops);
    
    // Mise à jour des points de départ et d'arrivée
    if (index === 0) {
      setFormData(prev => ({ ...prev, depart: value }));
    } else if (index === newStops.length - 1) {
      setFormData(prev => ({ ...prev, arrivee: value }));
    }
  };
  
  const addStop = () => {
    // Ajouter un nouvel arrêt avant le dernier (l'arrivée)
    const newStops = [...stops];
    const newStop = { name: "" };
    
    if (newStops.length >= 2) {
      // Insérer avant le dernier arrêt (l'arrivée)
      newStops.splice(newStops.length - 1, 0, newStop);
    } else {
      // S'il y a moins de 2 arrêts, simplement ajouter à la fin
      newStops.push(newStop);
    }
    
    setStops(newStops);
  };
  
  const removeStop = (index) => {
    // Ne pas permettre de supprimer le départ ou l'arrivée
    if (index === 0 || index === stops.length - 1) {
      return;
    }
    
    const newStops = [...stops];
    newStops.splice(index, 1);
    setStops(newStops);
  };
  
  const moveStop = (index, direction) => {
    // Ne pas déplacer le premier ou le dernier arrêt
    if ((index === 0 && direction === -1) || (index === stops.length - 1 && direction === 1)) {
      return;
    }
    
    // Ne pas déplacer un arrêt intermédiaire en première ou dernière position
    if ((index === 1 && direction === -1) || (index === stops.length - 2 && direction === 1)) {
      return;
    }
    
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[index + direction];
    newStops[index + direction] = temp;
    setStops(newStops);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Vérification finale avant envoi
    if (!formData.number || formData.number.trim() === '') {
      setFormErrors(prev => ({ ...prev, number: 'Le numéro de ligne est obligatoire' }));
      return;
    }
    
    // Préparer les arrêts pour l'envoi
    const finalStops = stops.filter(stop => stop.name.trim() !== '');
    
    // Vérifier qu'il y a au moins un départ et une arrivée
    if (finalStops.length < 2) {
      setFormErrors(prev => ({ ...prev, stops: 'Au moins un départ et une arrivée sont requis' }));
      return;
    }
    
    // Mise à jour des données du formulaire avec les arrêts finaux
    const finalFormData = {
      ...formData,
      stops: finalStops
    };
    
    onSave(finalFormData);
  };
  
  // Fonction pour optimiser l'itinéraire en utilisant OpenStreetMap et Leaflet Routing Machine
  const handleOptimizeRoute = async () => {
    if (!formData.depart || !formData.arrivee) {
      setFormErrors({
        ...formErrors,
        route: "Les points de départ et d'arrivée sont requis pour optimiser l'itinéraire"
      });
      return;
    }
    
    try {
      setGeocodingInProgress(true);
      
      // Géocoder tous les arrêts pour obtenir leurs coordonnées
      const stopsToGeocode = [...stops].filter(stop => stop.name.trim() !== '');
      
      const waypointsPromises = stopsToGeocode.map(stop => 
        geocodeAddress(stop.name)
      );
      
      const results = await Promise.all(waypointsPromises);
      const validWaypoints = results.filter(wp => wp !== null);
      
      // S'assurer qu'on a au moins un départ et une arrivée
      if (validWaypoints.length < 2) {
        setFormErrors({
          ...formErrors,
          route: "Impossible de trouver les coordonnées pour certains arrêts. Vérifiez les adresses."
        });
        return;
      }
      
      // Mettre à jour les waypoints de la carte
      setMapWaypoints(validWaypoints);
      
      // Nettoyer les erreurs liées à l'itinéraire
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.route;
        return newErrors;
      });
    } catch (error) {
      console.error("Erreur lors de l'optimisation de l'itinéraire:", error);
      setFormErrors({
        ...formErrors,
        route: "Erreur lors de la recherche d'itinéraire: " + error.message
      });
    } finally {
      setGeocodingInProgress(false);
    }
  };
  
  return (
    <div className="ltr-form-container">
      <div className="ltr-form-header">
        <button onClick={onCancel} className="ltr-back-button">
          <ChevronRight size={20} className="ltr-back-icon" />
        </button>
        <div>
          <h2 className="ltr-form-title">
            {line ? "Modifier la ligne" : "Ajouter une nouvelle ligne"}
          </h2>
          <p className="ltr-form-subtitle">
            {line ? "Modifier les détails et l'itinéraire" : "Définir les détails et l'itinéraire"}
          </p>
        </div>
      </div>
      
      <div className="ltr-form-card">
        <form onSubmit={handleSubmit}>
          <div className="ltr-form-content">
            <div className="ltr-form-group">
              <label className="ltr-form-label">
                Numéro de ligne <span className="ltr-required">*</span>
              </label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                className={`ltr-form-input ${formErrors.number ? 'ltr-input-error' : ''}`}
                placeholder="ex: L1"
                required
              />
              {formErrors.number && (
                <span className="ltr-error-message">{formErrors.number}</span>
              )}
            </div>
            
            <div className="ltr-form-group">
              <label className="ltr-form-label">Nom de la ligne</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="ltr-form-input"
                placeholder="ex: Siège - Usine Nord"
              />
            </div>
            
            <div className="ltr-route-section">
              <h3 className="ltr-route-title">Définir l'itinéraire</h3>
              
              <div className="ltr-form-group">
                <label className="ltr-form-label">Point de départ</label>
                <input
                  type="text"
                  name="depart"
                  value={formData.depart}
                  onChange={handleChange}
                  className="ltr-form-input"
                  placeholder="ex: Siège social, Paris"
                  required
                />
              </div>
              
              <div className="ltr-form-group">
                <label className="ltr-form-label">Point d'arrivée</label>
                <input
                  type="text"
                  name="arrivee"
                  value={formData.arrivee}
                  onChange={handleChange}
                  className="ltr-form-input"
                  placeholder="ex: Usine Nord, Lyon"
                  required
                />
              </div>
              
              <button
                type="button"
                onClick={handleOptimizeRoute}
                className="ltr-optimize-button"
                disabled={geocodingInProgress}
              >
                {geocodingInProgress ? 'Calcul en cours...' : 'Optimiser l\'itinéraire'}
              </button>
              
              {formErrors.route && (
                <div className="ltr-error-message">{formErrors.route}</div>
              )}
              
              {/* Carte pour afficher l'itinéraire */}
              <div className="ltr-route-map-container" style={{ height: "300px", marginTop: "20px" }}>
                {mapWaypoints.length >= 2 ? (
                  <MapContainer 
                    center={mapWaypoints[0]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {mapWaypoints.map((waypoint, index) => (
                      <Marker 
                        key={index} 
                        position={[waypoint.lat, waypoint.lng]}
                      >
                        <Popup>
                          {index === 0 ? `Départ: ${stops[0].name}` : 
                           index === mapWaypoints.length - 1 ? `Arrivée: ${stops[stops.length - 1].name}` : 
                           `Arrêt: ${stops[index].name}`}
                        </Popup>
                      </Marker>
                    ))}
                    
                    <RoutingMachine 
                      waypoints={mapWaypoints} 
                      updateRouteInfo={updateRouteInfo}
                    />
                  </MapContainer>
                ) : (
                  <div className="ltr-map-preview">
                    <MapPin size={22} className="ltr-map-pin" />
                    <p className="ltr-map-preview-text">Aperçu de l'itinéraire avec arrêts</p>
                    <p className="ltr-map-preview-subtext">L'itinéraire sera calculé après avoir défini les points de départ et d'arrivée</p>
                  </div>
                )}
              </div>
              
              {formData.distance && formData.duree && (
                <div className="ltr-optimization-result">
                  <h4 className="ltr-optimization-title">Itinéraire optimisé trouvé</h4>
                  <div className="ltr-optimization-details">
                    <div className="ltr-optimization-item">
                      <span className="ltr-optimization-label">Distance:</span>
                      <span className="ltr-optimization-value">{formData.distance}</span>
                    </div>
                    <div className="ltr-optimization-item">
                      <span className="ltr-optimization-label">Durée estimée:</span>
                      <span className="ltr-optimization-value">{formData.duree}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Section des arrêts */}
              <div className="ltr-stops-section">
                <div className="ltr-stops-header">
                  <h4 className="ltr-stops-section-title">Liste des arrêts</h4>
                  <button 
                    type="button" 
                    onClick={addStop} 
                    className="ltr-add-stop-button"
                  >
                    <Plus size={16} />
                    Ajouter un arrêt
                  </button>
                </div>
                
                {formErrors.stops && (
                  <span className="ltr-error-message">{formErrors.stops}</span>
                )}
                
                <div className="ltr-stops-list">
                  {stops.map((stop, index) => (
                    <div key={index} className="ltr-stop-form-item">
                      <div className={`ltr-stop-dot ${index === 0 ? 'ltr-start-dot' : index === stops.length - 1 ? 'ltr-end-dot' : 'ltr-middle-dot'}`}></div>
                      <input
                        type="text"
                        value={stop.name}
                        onChange={(e) => handleStopChange(index, e.target.value)}
                        className="ltr-stop-input"
                        placeholder={index === 0 ? "Point de départ" : index === stops.length - 1 ? "Point d'arrivée" : "Nom de l'arrêt"}
                        required
                      />
                      <div className="ltr-stop-actions">
                        {index !== 0 && index !== stops.length - 1 && (
                          <>
                            <button 
                              type="button" 
                              onClick={() => moveStop(index, -1)}
                              className="ltr-move-stop-button"
                              title="Déplacer vers le haut"
                            >
                              <ChevronRight size={16} className="ltr-move-up" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => moveStop(index, 1)}
                              className="ltr-move-stop-button"
                              title="Déplacer vers le bas"
                            >
                              <ChevronRight size={16} className="ltr-move-down" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeStop(index)}
                              className="ltr-remove-stop-button"
                              title="Supprimer cet arrêt"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="ltr-form-actions">
              <button
                type="button"
                onClick={onCancel}
                className="ltr-cancel-button"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="ltr-save-button"
                disabled={geocodingInProgress}
              >
                <Save size={16} className="ltr-save-icon" />
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Lignes;