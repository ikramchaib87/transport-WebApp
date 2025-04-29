import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./TrajetAdmin.css";

const TrajetAdmin = () => {
  // Sample data - replace with your actual API calls
  const [reservations, setReservations] = useState([
    { 
      id: 1, 
      route: "Bir Khadem - Hidra", 
      startDate: "2025-04-06", // Date de début de semaine (Dimanche)
      endDate: "2025-04-12", // Date de fin de semaine (Samedi)
      departureTime: "", 
      returnTime: "",
      bus: "Bus 101",
      driver: "Ahmed Benali",
      busId: "MTR-2345",
      driverId: "CHF-789",
      availableSeats: 45,
      loadDate: "2025-04-06",
      returnDate: "2025-04-12",
      status: "pending", // 'scheduled' ou 'pending'
      stations: []
    },
    { 
      id: 2, 
      route: "Alger Centre - Hidra", 
      startDate: "2025-04-06", // Date de début de semaine (Dimanche)
      endDate: "2025-04-12", // Date de fin de semaine (Samedi)
      departureTime: "08:00", 
      returnTime: "16:00",
      bus: "Bus 102",
      driver: "Mohammed Khaled",
      busId: "MTR-3456",
      driverId: "CHF-456",
      availableSeats: 50,
      loadDate: "2025-04-06",
      returnDate: "2025-04-12",
      status: "scheduled",
      departureAddress: "Alger Centre",
      arrivalAddress: "Hidra",
      stations: [
        { name: "Place Audin" },
        { name: "Grande Poste" },
      ]
    },
    { 
      id: 3, 
      route: "Bab Ezzouar - Hidra", 
      startDate: "2025-04-13", // Date de début de semaine suivante (Dimanche)
      endDate: "2025-04-19", // Date de fin de semaine suivante (Samedi)
      departureTime: "07:30", 
      returnTime: "16:30",
      bus: "Bus 103",
      driver: "Karim Hadjri",
      busId: "MTR-4567",
      driverId: "CHF-123",
      availableSeats: 42,
      loadDate: "2025-04-13",
      returnDate: "2025-04-19",
      status: "scheduled",
      departureAddress: "Bab Ezzouar",
      arrivalAddress: "Hidra",
      stations: [
        { name: "USTHB" },
        { name: "Kouba" },
        { name: "Ben Aknoun" }
      ]
    }
  ]);

  // États
  const [currentWeek, setCurrentWeek] = useState(getWeekDates());
  const [selectedReservation, setSelectedReservation] = useState(null);
  
  // État pour gérer la disponibilité des transports
  const [availableTransports] = useState([
    {
      busId: "MTR-2345", 
      driverId: "CHF-789", 
      route: "Bir Khadem - Hidra", 
      availableSeats: 45, 
      loadDate: "2025-04-06",
      returnDate: "2025-04-12"
    },
    {
      busId: "MTR-3456", 
      driverId: "CHF-456", 
      route: "Alger Centre - Hidra", 
      availableSeats: 50,
      loadDate: "2025-04-06",
      returnDate: "2025-04-12"
    },
    {
      busId: "MTR-4567", 
      driverId: "CHF-123", 
      route: "Bab Ezzouar - Hidra", 
      availableSeats: 42,
      loadDate: "2025-04-13",
      returnDate: "2025-04-19"
    },
    {
      busId: "MTR-5678", 
      driverId: "CHF-234", 
      route: "Hussein Dey - Hidra", 
      availableSeats: 48,
      loadDate: "2025-04-13",
      returnDate: "2025-04-19"
    }
  ]);
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // État pour le mode d'édition
  const [stations, setStations] = useState([]); // Nouvel état pour les stations

  // Fonction pour obtenir les dates de la semaine courante
  function getWeekDates(date = new Date()) {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Dimanche comme premier jour
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push({
        date: day.toISOString().split('T')[0],
        dayName: day.toLocaleDateString('fr-FR', { weekday: 'long' }),
        formattedDate: day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      });
    }
    return week;
  }

  // S'assurer que le calendrier affiche la semaine actuelle au chargement
  useEffect(() => {
    setCurrentWeek(getWeekDates(new Date()));
  }, []);

  // Changer à la semaine précédente
  const previousWeek = () => {
    const firstDayOfCurrentWeek = new Date(currentWeek[0].date);
    const firstDayOfPreviousWeek = new Date(firstDayOfCurrentWeek);
    firstDayOfPreviousWeek.setDate(firstDayOfCurrentWeek.getDate() - 7);
    setCurrentWeek(getWeekDates(firstDayOfPreviousWeek));
  };

  // Changer à la semaine suivante
  const nextWeek = () => {
    const firstDayOfCurrentWeek = new Date(currentWeek[0].date);
    const firstDayOfNextWeek = new Date(firstDayOfCurrentWeek);
    firstDayOfNextWeek.setDate(firstDayOfCurrentWeek.getDate() + 7);
    setCurrentWeek(getWeekDates(firstDayOfNextWeek));
  };

  // Obtenir les réservations pour une date spécifique - MODIFIÉ POUR NE MONTRER QUE LES TRAJETS PLANIFIÉS
  const getReservationsForDate = (date) => {
    return reservations.filter(res => 
      res.status === 'scheduled' && // Filtrer uniquement les trajets planifiés
      new Date(res.startDate) <= new Date(date) && 
      new Date(res.endDate) >= new Date(date)
    );
  };

  // Ouvrir la modal de planification pour la semaine entière
  const openPlanningModal = () => {
    setSelectedWeekStart(currentWeek[0].date);
    setSelectedWeekEnd(currentWeek[6].date);
    setIsPlanning(true);
    setIsEditing(false);
    setStations([]);
  };

  // Sélectionner un transport pour planification
  const selectTransport = (transport) => {
    setSelectedTransport(transport);
    
    // Déterminer les adresses de départ et d'arrivée par défaut basées sur la route
    let defaultDepartureAddress = "";
    let defaultArrivalAddress = "";
    
    // Extraire les points de départ et d'arrivée de la route
    const routeParts = transport.route.split(" - ");
    if (routeParts.length === 2) {
      defaultDepartureAddress = routeParts[0];
      defaultArrivalAddress = routeParts[1];
    }
    
    // Pré-remplir les champs d'adresse (à appliquer après le rendu du DOM)
    setTimeout(() => {
      const departureAddressInput = document.getElementById('departure-address');
      const arrivalAddressInput = document.getElementById('arrival-address');
      
      if (departureAddressInput) departureAddressInput.value = defaultDepartureAddress;
      if (arrivalAddressInput) arrivalAddressInput.value = defaultArrivalAddress;
    }, 0);
  };

  // Mettre à jour les horaires d'une réservation
  const updateReservation = (departureTime, returnTime, departureAddress, arrivalAddress) => {
    if (isEditing && selectedReservation) {
      // Mise à jour d'une réservation existante
      const updatedReservations = reservations.map(res => {
        if (res.id === selectedReservation.id) {
          return {
            ...res,
            departureTime,
            returnTime,
            departureAddress,
            arrivalAddress,
            stations: stations,
            status: 'scheduled'
          };
        }
        return res;
      });
      
      setReservations(updatedReservations);
      setSelectedReservation(null);
    } else if (selectedTransport && selectedWeekStart) {
      // Créer une nouvelle réservation
      const newReservation = {
        id: reservations.length + 1,
        route: selectedTransport.route,
        startDate: selectedWeekStart,
        endDate: selectedWeekEnd,
        departureTime,
        returnTime,
        bus: `Bus ${selectedTransport.busId.substring(4)}`,
        driver: `Chauffeur ${selectedTransport.driverId.substring(4)}`,
        busId: selectedTransport.busId,
        driverId: selectedTransport.driverId,
        availableSeats: selectedTransport.availableSeats,
        loadDate: selectedTransport.loadDate,
        returnDate: selectedTransport.returnDate,
        departureAddress,
        arrivalAddress,
        stations: stations,
        status: 'scheduled'
      };
      
      setReservations([...reservations, newReservation]);
    }
    
    setIsPlanning(false);
    setSelectedWeekStart(null);
    setSelectedWeekEnd(null);
    setSelectedTransport(null);
    setIsEditing(false);
    setStations([]);
    // Ici vous feriez un appel API pour créer/mettre à jour la réservation dans votre backend
  };

  // Fonctions pour gérer les stations
  const addStation = () => {
    setStations([...stations, { name: "" }]);
  };

  const updateStation = (index, field, value) => {
    const updatedStations = [...stations];
    updatedStations[index][field] = value;
    setStations(updatedStations);
  };

  const removeStation = (index) => {
    const updatedStations = stations.filter((_, i) => i !== index);
    setStations(updatedStations);
  };

  // Nouvelle fonction pour ouvrir le formulaire d'édition
  const openEditForm = (reservation) => {
    setSelectedReservation(null); // Fermer la modal de détails
    setSelectedWeekStart(reservation.startDate);
    setSelectedWeekEnd(reservation.endDate);
    setIsPlanning(true);
    setIsEditing(true);
    setStations(reservation.stations || []);
    
    // Pré-remplir les champs avec les informations existantes
    setTimeout(() => {
      const departureTimeInput = document.getElementById('departure-time');
      const arrivalTimeInput = document.getElementById('arrival-time');
      const departureAddressInput = document.getElementById('departure-address');
      const arrivalAddressInput = document.getElementById('arrival-address');
      
      if (departureTimeInput) departureTimeInput.value = reservation.departureTime || '';
      if (arrivalTimeInput) arrivalTimeInput.value = reservation.returnTime || '';
      if (departureAddressInput) departureAddressInput.value = reservation.departureAddress || '';
      if (arrivalAddressInput) arrivalAddressInput.value = reservation.arrivalAddress || '';
    }, 0);
  };

  // Nouvelle fonction pour supprimer une réservation
  const deleteReservation = (id) => {
    // Confirmation avant suppression
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce trajet ?")) {
      // Filtrer pour enlever la réservation avec l'id spécifié
      const updatedReservations = reservations.filter(res => res.id !== id);
      setReservations(updatedReservations);
      setSelectedReservation(null); // Fermer la modal
      // Ici vous feriez un appel API pour supprimer la réservation dans votre backend
    }
  };

  // Formater la période de planification
  const formatPlanningPeriod = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Format pour afficher la période complète
    return `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  return (
    <div className="trajet-admin-C">
      <Header />
      <div className="main-C">
        <Navbar />
        <div className="trajet-C">
          <h1 className="page-title">Planification des Trajets</h1>
          
          {/* Vue Calendrier */}
          <div className="calendar-view">
            <div className="calendar-navigation">
              <button onClick={previousWeek} className="nav-btn">&lt; Semaine précédente</button>
              <h3>Semaine du {currentWeek[0].formattedDate} au {currentWeek[6].formattedDate}</h3>
              <button onClick={nextWeek} className="nav-btn">Semaine suivante &gt;</button>
              {/* Bouton de planification pour la semaine entière */}
              <button 
                className="nav-btn"
                style={{ marginLeft: '20px', backgroundColor: '#28a745' }}
                onClick={openPlanningModal}
              >
                + Planifier cette semaine
              </button>
            </div>
            
            <div className="calendar-grid">
              {/* En-têtes des jours */}
              <div className="calendar-header">
                {currentWeek.map((day) => (
                  <div key={day.date} className="day-header">
                    <div className="day-name">{day.dayName}</div>
                    <div className="day-date">{day.formattedDate}</div>
                  </div>
                ))}
              </div>
              
              {/* Contenu des jours */}
              <div className="calendar-body">
                {currentWeek.map((day) => {
                  const dayReservations = getReservationsForDate(day.date);
                  return (
                    <div key={day.date} className="day-column">
                      {dayReservations.length === 0 ? (
                        <div className="no-reservations">Aucune réservation</div>
                      ) : (
                        dayReservations.map(reservation => (
                          <div 
                            key={reservation.id} 
                            className={`calendar-reservation ${reservation.status}`}
                            onClick={() => setSelectedReservation(reservation)}
                          >
                            <div className="reservation-time">
                              {reservation.departureTime ? `${reservation.departureTime} - ${reservation.returnTime}` : "Non planifié"}
                            </div>
                            <div className="reservation-details">
                              <strong>{reservation.route}</strong>
                              <div>{reservation.bus} ({reservation.busId})</div>
                              <div>{reservation.driver} ({reservation.driverId})</div>
                              {reservation.stations && reservation.stations.length > 0 && (
                                <div className="station-count">
                                  <strong>{reservation.stations.length}</strong> stations
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Modal pour afficher les détails d'une réservation */}
          {selectedReservation && (
            <div className="modal">
              <div className="modal-C">
                <span className="close" onClick={() => setSelectedReservation(null)}>&times;</span>
                <h2>Détails du Trajet</h2>
                <div className="reservation-details">
                  <p><strong>Période:</strong> {formatPlanningPeriod(selectedReservation.startDate, selectedReservation.endDate)}</p>
                  <p><strong>Ligne:</strong> {selectedReservation.route}</p>
                  <p><strong>Matricule Bus:</strong> {selectedReservation.busId}</p>
                  <p><strong>Matricule Chauffeur:</strong> {selectedReservation.driverId}</p>
                  <p><strong>Places Disponibles:</strong> {selectedReservation.availableSeats}</p>
                  <p><strong>Date de Mise en Charge:</strong> {new Date(selectedReservation.loadDate).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Date de Retour:</strong> {new Date(selectedReservation.returnDate).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Heure de départ:</strong> {selectedReservation.departureTime || "Non planifié"}</p>
                  <p><strong>Heure de retour:</strong> {selectedReservation.returnTime || "Non planifié"}</p>
                  {selectedReservation.departureAddress && (
                    <p><strong>Adresse de départ:</strong> {selectedReservation.departureAddress}</p>
                  )}
                  {selectedReservation.arrivalAddress && (
                    <p><strong>Adresse d'arrivée:</strong> {selectedReservation.arrivalAddress}</p>
                  )}
                </div>
                
                {/* Affichage des stations */}
                {selectedReservation.stations && selectedReservation.stations.length > 0 && (
                  <div className="stations-details">
                    <h3>Stations intermédiaires ({selectedReservation.stations.length})</h3>
                    <table className="stations-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Station</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReservation.stations.map((station, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{station.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="modal-actions">
                  {/* Nouveau bouton de modification */}
                  <button 
                    className="edit-btn"
                    onClick={() => openEditForm(selectedReservation)}
                  >
                    Modifier
                  </button>
                  {/* Bouton de suppression */}
                  <button 
                    className="delete-btn"
                    onClick={() => deleteReservation(selectedReservation.id)}
                  >
                    Supprimer
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => setSelectedReservation(null)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal pour planifier un nouveau trajet ou modifier un existant */}
          {isPlanning && (
            <div className="modal">
              <div className="modal-C planning-modal">
                <span className="close" onClick={() => {
                  setIsPlanning(false);
                  setIsEditing(false);
                  setSelectedTransport(null);
                  setStations([]);
                }}>&times;</span>
                
                <h2>
                  {isEditing 
                    ? `Modifier la planification pour la semaine du ${new Date(selectedWeekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${new Date(selectedWeekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                    : `Planifier un trajet pour la semaine du ${new Date(selectedWeekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${new Date(selectedWeekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                  }
                </h2>
                
                {!isEditing && !selectedTransport ? (
                  <>
                    <h3>Sélectionnez un transport</h3>
                    <div className="transports-list">
                      <table>
                        <thead>
                          <tr>
                            <th>Matricule Bus</th>
                            <th>Matricule Chauffeur</th>
                            <th>Ligne</th>
                            <th>Places Disponibles</th>
                            <th>Date de Mise en Charge</th>
                            <th>Date de Retour</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableTransports.map((transport, index) => (
                            <tr key={index}>
                              <td>{transport.busId}</td>
                              <td>{transport.driverId}</td>
                              <td>{transport.route}</td>
                              <td>{transport.availableSeats}</td>
                              <td>{new Date(transport.loadDate).toLocaleDateString('fr-FR')}</td>
                              <td>{new Date(transport.returnDate).toLocaleDateString('fr-FR')}</td>
                              <td>
                                <button 
                                  className="select-btn"
                                  onClick={() => selectTransport(transport)}
                                >
                                  Sélectionner
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    {!isEditing && (
                      <div className="selected-transport">
                        <h3>Transport sélectionné</h3>
                        <p><strong>Matricule Bus:</strong> {selectedTransport.busId}</p>
                        <p><strong>Matricule Chauffeur:</strong> {selectedTransport.driverId}</p>
                        <p><strong>Ligne:</strong> {selectedTransport.route}</p>
                        <p><strong>Places Disponibles:</strong> {selectedTransport.availableSeats}</p>
                      </div>
                    )}
                    
                    <div className="planning-form">
                      <div className="form-group">
                        <label>Adresse de départ:</label>
                        <input 
                          type="text" 
                          id="departure-address" 
                          placeholder="Adresse de départ"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Heure de départ:</label>
                        <input type="time" id="departure-time" />
                      </div>
                      
                      <div className="form-group">
                        <label>Adresse d'arrivée:</label>
                        <input 
                          type="text" 
                          id="arrival-address" 
                          placeholder="Adresse d'arrivée"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Heure d'arrivée:</label>
                        <input type="time" id="arrival-time" />
                      </div>
                    </div>
                    
                    {/* Section modifiée pour la gestion des stations */}
                    <div className="station-management">
                      <h3>Stations intermédiaires ({stations.length})</h3>
                      
                      <div className="stations-list">
                        {stations.map((station, index) => (
                          <div key={index} className="station-item">
                            <div className="station-number">{index + 1}</div>
                            <div className="form-group">
                              <label>Nom de la station:</label>
                              <input 
                                type="text" 
                                value={station.name} 
                                onChange={(e) => updateStation(index, "name", e.target.value)}
                                placeholder="Nom de la station"
                              />
                            </div>
                            <button 
                              className="delete-station-btn" 
                              onClick={() => removeStation(index)}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        className="add-station-btn" 
                        onClick={addStation}
                      >
                        + Ajouter une station
                      </button>
                    </div>
                    
                    <div className="modal-actions">
                      <button 
                        className="save-btn"
                        onClick={() => {
                          const departureTime = document.getElementById('departure-time').value;
                          const arrivalTime = document.getElementById('arrival-time').value;
                          const departureAddress = document.getElementById('departure-address').value;
                          const arrivalAddress = document.getElementById('arrival-address').value;
                          
                          // Vérifier que les stations ont toutes les informations requises
                          const stationsValid = stations.every(station => station.name);
                          
                          if (departureTime && arrivalTime && departureAddress && arrivalAddress && stationsValid) {
                            updateReservation(departureTime, arrivalTime, departureAddress, arrivalAddress);
                          } else {
                            if (!stationsValid) {
                              alert("Veuillez remplir toutes les informations pour chaque station");
                            } else {
                              alert("Veuillez remplir tous les champs requis");
                            }
                          }
                        }}
                      >
                        {isEditing ? "Mettre à jour" : "Planifier"}
                      </button>
                      {!isEditing && (
                        <button 
                          className="back-btn"
                          onClick={() => setSelectedTransport(null)}
                        >
                          Retour
                        </button>
                      )}
                      <button 
                        className="cancel-btn"
                        onClick={() => {
                          setIsPlanning(false);
                          setSelectedTransport(null);
                          setIsEditing(false);
                          setStations([]);
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrajetAdmin;