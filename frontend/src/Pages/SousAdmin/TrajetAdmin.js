import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileExport, faEdit, faTrash, faSearch, faTimes, faSave} from '@fortawesome/free-solid-svg-icons';
import "./TrajetAdmin.css";

const TrajetAdmin = () => {
  const [activeTab, setActiveTab] = useState("tous");
  const [showAddRegularForm, setShowAddRegularForm] = useState(false);
  const [showAddPonctualForm, setShowAddPonctualForm] = useState(false);
  const [lignes, setLignes] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trajetsReguliers, setTrajetsReguliers] = useState([]);
  const [editingTrajetId, setEditingTrajetId] = useState(null);
  const [formData, setFormData] = useState({
    ligne: "",
    depart: "",
    arrivee: "",
    jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    heureDepart: "07:00",
    heureArrivee: "08:00",
    duree: "0 min",
    chauffeur: "",
    vehicule: "",
    statut: "Actif",
    arretsIntermediaires: [],
    remarques: "",
    dateDebut: "",
    dateFin: "",
    activeDates: []
  });

  // Charger les données initiales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Charger les lignes
        const lignesResponse = await fetch('http://localhost:5000/api/lines');
        const lignesData = await lignesResponse.json();
        setLignes(lignesData);
        
        // Charger les affectations
        const affectationsResponse = await fetch('http://localhost:5000/api/bus-line-assignments');
        const affectationsData = await affectationsResponse.json();
        setAffectations(affectationsData);
        
        // Charger les chauffeurs
        const chauffeursResponse = await fetch('http://localhost:5000/api/chauffeurs');
        const chauffeursData = await chauffeursResponse.json();
        setChauffeurs(chauffeursData.chauffeurs || []);
        
        // Charger les véhicules
        const vehiculesResponse = await fetch('http://localhost:5000/api/external-buses');
        const vehiculesData = await vehiculesResponse.json();
        setVehicules(vehiculesData);
        
        // Charger les trajets existants
        const trajetsResponse = await fetch('http://localhost:5000/api/trajets');
        const trajetsData = await trajetsResponse.json();
        setTrajetsReguliers(trajetsData);
        
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Lorsqu'une ligne est sélectionnée
  const handleLigneChange = async (ligneId) => {
    const ligneSelectionnee = lignes.find(l => l.id === ligneId);
    if (!ligneSelectionnee) return;
    
    setSelectedLigne(ligneSelectionnee);
    
    let chauffeur = "";
    let vehicule = "";
    let telephone = "";
    let places = "";

    // 1. Try to fetch from affectations API
    try {
      const response = await fetch(`http://localhost:5000/api/affectations/by-line/${ligneId}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      
      if (data?.success && data.affectation) {
        const aff = data.affectation;
        chauffeur = `${aff.nom || ''} ${aff.prenom || ''}`.trim();
        vehicule = `${aff.marqueBus || ''} ${aff.modele || ''}`.trim();
        telephone = aff.telephone || '';
        places = aff.places_disponibles || '';
      }
    } catch (error) {
      console.error("Erreur affectations:", error);
      // Continue with fallback method if API fails
    }

    // 2. If not found, use fallback method
    if (!chauffeur || !vehicule) {
      const affectation = affectations.find(a => a.line_id === ligneId);
      if (affectation) {
        try {
          const busResponse = await fetch(`http://localhost:5000/api/external-buses/${affectation.bus_id}`);
          const busData = await busResponse.json();
          
          if (busData.bus) {
            vehicule = `${busData.bus.marque || ''} ${busData.bus.modele || ''}`.trim();
            places = busData.bus.nb_places || '';
            
            if (busData.bus.chauffeur_nom) {
              chauffeur = `${busData.bus.chauffeur_nom} ${busData.bus.chauffeur_prenom || ''}`.trim();
              telephone = busData.bus.telephone || '';
            }
          }
        } catch (error) {
          console.error("Erreur véhicules externes:", error);
        }
      }
    }

    // Fonction pour calculer les heures des arrêts
    const calculateStopTimes = (departTime, stops) => {
      if (!stops || stops.length < 2) return [];
      
      // Convertir l'heure de départ en minutes depuis minuit
      const [departHours, departMinutes] = departTime.split(':').map(Number);
      let currentTimeMinutes = departHours * 60 + departMinutes;
      
      const stopTimes = [];
      
      // Pour chaque arrêt (sauf le premier qui est le départ)
      for (let i = 1; i < stops.length; i++) {
        const stop = stops[i];
        // La durée est cumulative depuis le départ dans Lignes.js
        const durationMinutes = parseInt(stop.duree) || 0;
        
        // Calculer l'heure de cet arrêt
        const stopTimeMinutes = departHours * 60 + departMinutes + durationMinutes;
        const hours = Math.floor(stopTimeMinutes / 60) % 24;
        const minutes = stopTimeMinutes % 60;
        
        stopTimes.push({
          nom: stop.name,
          heure: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        });
      }
      
      return stopTimes;
    };

    // Calculer l'heure d'arrivée finale
    const heureArrivee = calculateArrivalTime(
      formData.heureDepart || "08:00", 
      ligneSelectionnee.duree || "0:00"
    );

    // Calculer les heures des arrêts intermédiaires
    const arretsAvecHeures = ligneSelectionnee.stops 
      ? calculateStopTimes(formData.heureDepart || "08:00", ligneSelectionnee.stops)
      : [];

    // Update form with all values including telephone and places
    setFormData({
      ligne: `N°${ligneSelectionnee.number}`,
      depart: ligneSelectionnee.depart,
      arrivee: ligneSelectionnee.arrivee,
      jours: formData.jours, // Keep existing days
      heureDepart: formData.heureDepart || "08:00",
      heureArrivee,
      duree: ligneSelectionnee.duree || "0 min",
      chauffeur,
      vehicule,
      telephone,
      places,
      statut: formData.statut,
      arretsIntermediaires: arretsAvecHeures.filter(arret => 
        arret.nom !== ligneSelectionnee.depart && 
        arret.nom !== ligneSelectionnee.arrivee
      ),
      remarques: formData.remarques || ""
    });
};
  // Improved calculateArrivalTime function
  const calculateArrivalTime = (departTime, duration) => {
    if (!departTime || !duration) return "";
    
    try {
      // Convertir la durée en minutes
      let totalDurationMinutes = 0;
      
      // Format "HH:MM" ou "HHhMM"
      if (duration.includes(':') || duration.includes('h')) {
        const normalizedDuration = duration.replace('h', ':');
        const [hours, minutes] = normalizedDuration.split(':').map(Number);
        totalDurationMinutes = (hours || 0) * 60 + (minutes || 0);
      } 
      // Format "X min"
      else if (duration.includes('min')) {
        totalDurationMinutes = parseInt(duration) || 0;
      }
      // Format numérique seul (en minutes)
      else {
        totalDurationMinutes = parseInt(duration) || 0;
      }
  
      // Parser l'heure de départ
      const [departHours, departMinutes] = departTime.split(':').map(Number);
  
      // Calculer le total en minutes
      let totalMinutes = departHours * 60 + departMinutes + totalDurationMinutes;
      
      // Gérer le dépassement de minuit
      totalMinutes = totalMinutes % (24 * 60);
      
      // Convertir en format HH:MM
      const arriveeHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const arriveeMinutes = (totalMinutes % 60).toString().padStart(2, '0');
      
      return `${arriveeHours}:${arriveeMinutes}`;
    } catch (error) {
      console.error("Erreur dans le calcul de l'heure d'arrivée:", error);
      return "";
    }
  };
  // Calculer la durée lorsque l'heure de départ change
  const handleHeureDepartChange = (e) => {
    const newHeureDepart = e.target.value;
    
    if (!selectedLigne?.duree) {
      setFormData(prev => ({
        ...prev,
        heureDepart: newHeureDepart,
        heureArrivee: ""
      }));
      return;
    }
    
    // Calculer la nouvelle heure d'arrivée
    const heureArrivee = calculateArrivalTime(newHeureDepart, selectedLigne.duree);
    
    // Recalculer les heures des arrêts intermédiaires
    const calculateStopTimes = (departTime, stops) => {
      if (!stops || stops.length < 2) return [];
      
      let currentTime = new Date(`1970-01-01T${departTime}:00`);
      const stopTimes = [];
      
      for (let i = 0; i < stops.length - 1; i++) {
        const stop = stops[i];
        const durationMinutes = parseInt(stop.duree) || 0;
        
        currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
        
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        
        stopTimes.push({
          nom: stop.name,
          heure: `${hours}:${minutes}`
        });
      }
      
      return stopTimes;
    };

    const arretsAvecHeures = selectedLigne.stops 
      ? calculateStopTimes(newHeureDepart, selectedLigne.stops)
      : [];

    setFormData(prev => ({
      ...prev,
      heureDepart: newHeureDepart,
      heureArrivee: heureArrivee,
      duree: selectedLigne.duree,
      arretsIntermediaires: arretsAvecHeures
    }));
  };

  // Sauvegarder le trajet
  const handleSaveTrajet = async () => {
  try {
    if (!selectedLigne) {
      throw new Error('Veuillez sélectionner une ligne');
    }

    const validateTime = (time) => {
      if (!time) return false;
      return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    };

    if (!validateTime(formData.heureDepart) || !validateTime(formData.heureArrivee)) {
      throw new Error('Format de temps invalide. Utilisez HH:MM (ex: 08:00 ou 8:00)');
    }

    const formatTime = (time) => {
      const [hours, minutes] = time.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const nouveauTrajet = {
      ligne_id: selectedLigne.id,
      ligne_number: selectedLigne.number,
      depart: formData.depart,
      arrivee: formData.arrivee,
      jours: formData.jours.join(', '),
      heure_depart: formatTime(formData.heureDepart),
      heure_arrivee: formatTime(formData.heureArrivee),
      duree: formData.duree,
      chauffeur: formData.chauffeur,
      vehicule: formData.vehicule,
      statut: formData.statut,
      arrets: formData.arretsIntermediaires,
      remarques: formData.remarques || '',
      date_debut: formData.dateDebut,
      date_fin: formData.dateFin,
      active_dates: formData.activeDates.map(formatDateToISO)
    };

    const response = await fetch('http://localhost:5000/api/trajets', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(nouveauTrajet)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
    }

    const savedTrajet = await response.json();
    setTrajetsReguliers([...trajetsReguliers, savedTrajet]);
    handleCancelForm();
    alert("Trajet régulier ajouté avec succès !");
  } catch (error) {
    console.error("Erreur:", error);
    alert(`Erreur lors de la sauvegarde du trajet: ${error.message}`);
  }
};
    
    // Fonction pour supprimer un trajet
  const handleDeleteTrajet = async (trajetId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce trajet ?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/trajets/${trajetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Mettre à jour la liste des trajets
      setTrajetsReguliers(trajetsReguliers.filter(trajet => trajet.id !== trajetId));
      alert("Trajet supprimé avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour éditer un trajet
  const handleEditTrajet = (trajet) => {
    setEditingTrajetId(trajet.id);
    setSelectedLigne(lignes.find(l => l.id === trajet.ligne_id));
    setShowAddRegularForm(true);
    
    // Convertir les dates actives de string à Date si nécessaire
    const activeDates = trajet.active_dates 
      ? trajet.active_dates.map(dateStr => new Date(dateStr))
      : [];

    setFormData({
      ligne: `N°${trajet.ligne_number}`,
      depart: trajet.depart,
      arrivee: trajet.arrivee,
      jours: trajet.jours.split(',').map(j => j.trim()),
      heureDepart: trajet.heure_depart,
      heureArrivee: trajet.heure_arrivee,
      duree: trajet.duree,
      chauffeur: trajet.chauffeur,
      vehicule: trajet.vehicule,
      telephone: trajet.telephone || '',
      places: trajet.places || '',
      statut: trajet.statut,
      arretsIntermediaires: Array.isArray(trajet.arrets) ? trajet.arrets : [],
      remarques: trajet.remarques || "",
      dateDebut: trajet.date_debut || "",
      dateFin: trajet.date_fin || "",
      activeDates: activeDates
    });
  };

  // Fonction pour mettre à jour un trajet
  const handleUpdateTrajet = async () => {
  try {
    if (!selectedLigne) {
      throw new Error('Veuillez sélectionner une ligne');
    }

    const formatTime = (time) => {
      if (!time) return "";
      let [hours, minutes] = time.split(':').map(part => parseInt(part, 10));
      if (isNaN(hours)) hours = 0;
      if (isNaN(minutes)) minutes = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const formattedHeureDepart = formatTime(formData.heureDepart);
    const formattedHeureArrivee = formatTime(formData.heureArrivee);
    
    if (!formattedHeureDepart || !formattedHeureArrivee) {
      throw new Error('Format de temps invalide. Utilisez HH:MM (ex: 08:00 ou 8:00)');
    }

    const updatedTrajet = {
      ligne_id: selectedLigne.id,
      ligne_number: selectedLigne.number,
      depart: formData.depart,
      arrivee: formData.arrivee,
      jours: formData.jours.join(', '),
      heure_depart: formattedHeureDepart,
      heure_arrivee: formattedHeureArrivee,
      duree: formData.duree,
      chauffeur: formData.chauffeur,
      vehicule: formData.vehicule,
      statut: formData.statut,
      arrets: formData.arretsIntermediaires,
      remarques: formData.remarques || '',
      date_debut: formData.dateDebut,
      date_fin: formData.dateFin,
      active_dates: formData.activeDates.map(formatDateToISO)
    };

    const trajetId = editingTrajetId;
    if (!trajetId) {
      throw new Error('Trajet non trouvé pour la mise à jour');
    }

    const response = await fetch(`http://localhost:5000/api/trajets/${trajetId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedTrajet)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la mise à jour');
    }

    const updatedData = await response.json();
    
    setTrajetsReguliers(trajetsReguliers.map(t => 
      t.id === updatedData.id ? updatedData : t
    ));
    
    handleCancelForm();
    alert("Trajet mis à jour avec succès !");
  } catch (error) {
    console.error("Erreur:", error);
    alert(`Erreur lors de la mise à jour du trajet: ${error.message}`);
  }
};
  const handleCancelForm = () => {
  setEditingTrajetId(null);
  setShowAddRegularForm(false);
  setShowAddPonctualForm(false);
  setSelectedLigne(null);
  setFormData({
    ligne: "",
    depart: "",
    arrivee: "",
    jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    heureDepart: "08:00",
    heureArrivee: "08:30",
    duree: "0 min",
    chauffeur: "",
    vehicule: "",
    statut: "Actif",
    arretsIntermediaires: [],
    remarques: "",
    dateDebut: "",
    dateFin: "",
    activeDates: [] // Reset to empty array
  });
};

  const handleAddRegularTrajet = () => {
    setShowAddRegularForm(true);
    setShowAddPonctualForm(false);
  };

  const handleAddPonctualTrajet = () => {
    setShowAddPonctualForm(true);
    setShowAddRegularForm(false);
  };

  // Fonction pour calculer les dates actives entre deux dates pour des jours spécifiques
  const calculateDates = (startDateStr, endDateStr, daysOfWeek) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const dayNumbers = daysOfWeek.map(day => {
      const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      return days.indexOf(day);
    });

    let currentDate = new Date(startDate);
    const activeDates = [];

    while (currentDate <= endDate) {
      if (dayNumbers.includes(currentDate.getDay())) {
        activeDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return activeDates;
  };

  // Fonction pour formater les dates en ISO (YYYY-MM-DD)
  const formatDateToISO = (date) => {
    return date.toISOString().split('T')[0];
  };
  const TrajetsList = () => (
    <>
      <div className="trjt-search-bar">
        <input type="text" placeholder="Rechercher..." />
        <button type="button">
          <FontAwesomeIcon icon={faSearch} />
        </button>
      </div>

      <div className="trjt-tabs">
        <div 
          className={`trjt-tab ${activeTab === "tous" ? "active" : ""}`}
          onClick={() => setActiveTab("tous")}
        >
          Tous les trajets
        </div>
        <div 
          className={`trjt-tab ${activeTab === "reguliers" ? "active" : ""}`}
          onClick={() => setActiveTab("reguliers")}
        >
          Trajets réguliers
        </div>
        <div 
          className={`trjt-tab ${activeTab === "ponctuels" ? "active" : ""}`}
          onClick={() => setActiveTab("ponctuels")}
        >
          Trajets ponctuels
        </div>
      </div>

      <div className="trjt-filters">
        <div className="trjt-filter-item">
          <select>
            <option>Toutes les lignes</option>
            {lignes.map(ligne => (
              <option key={ligne.id}>N°{ligne.number} - {ligne.name}</option>
            ))}
          </select>
        </div>
        <div className="trjt-filter-item">
          <select>
            <option>Tous les chauffeurs</option>
            {chauffeurs.map(chauffeur => (
              <option key={chauffeur.id}>{chauffeur.nom} {chauffeur.prenom}</option>
            ))}
          </select>
        </div>
        <div className="trjt-filter-item">
          <input type="date" placeholder="Date de début" />
        </div>
        <div className="trjt-filter-item">
          <select>
            <option>Tous les statuts</option>
            <option>Actif</option>
            <option>En attente</option>
            <option>Terminé</option>
          </select>
        </div>
      </div>

      <div className="trjt-action-buttons">
        <button className="trjt-btn trjt-btn-orange" onClick={handleAddRegularTrajet}>
          <FontAwesomeIcon icon={faPlus} /> Ajouter un trajet régulier
        </button>
        <button className="trjt-btn trjt-btn-green" onClick={handleAddPonctualTrajet}>
          <FontAwesomeIcon icon={faPlus} /> Ajouter un trajet ponctuel
        </button>
        <button className="trjt-btn trjt-btn-gray">
          <FontAwesomeIcon icon={faFileExport} /> Exporter
        </button>
      </div>

      {(activeTab === "tous" || activeTab === "reguliers") && (
        <div className="trjt-section">
          <div className="trjt-section-header">
            <h2 className="trjt-section-title">Trajets Réguliers</h2>
            <span>Total: {trajetsReguliers.length}</span>
          </div>
          <table className="trjt-table">
            <thead>
              <tr className="trjt-tr">
                <th className="trjt-th">Ligne</th>
                <th className="trjt-th">Départ</th>
                <th className="trjt-th">Arrivée</th>
                <th className="trjt-th">Jours</th>
                <th className="trjt-th">Heure départ</th>
                <th className="trjt-th">Heure arrivée</th>
                <th className="trjt-th">Chauffeur</th>
                <th className="trjt-th">Véhicule</th>
                <th className="trjt-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trajetsReguliers
              .filter(trajet => trajet.ligne_id !== null)
              .map((trajet) => (
                <tr className="trjt-tr" key={trajet.id}>
                  <td className="trjt-td">N°{trajet.ligne_number}</td>
                  <td className="trjt-td">{trajet.depart}</td>
                  <td className="trjt-td">{trajet.arrivee}</td>
                  <td className="trjt-td">{trajet.jours}</td>
                  <td className="trjt-td">{trajet.heure_depart}</td>
                  <td className="trjt-td">{trajet.heure_arrivee}</td>
                  <td className="trjt-td">{trajet.chauffeur}</td>
                  <td className="trjt-td">{trajet.vehicule}</td>
                  <td className="trjt-td trjt-action-cell">
                    <button 
                      className="trjt-action-btn"
                      onClick={() => handleEditTrajet(trajet)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button 
                      className="trjt-action-btn"
                      onClick={() => handleDeleteTrajet(trajet.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const AddRegularTrajetForm = () => (
    <div className="trjt-form-container">
      <div className="trjt-breadcrumb">
        <span className="trjt-breadcrumb-link" onClick={handleCancelForm}>Trajets</span>
        <span className="trjt-separator">&gt;</span>
        <span className="trjt-current">Ajouter un trajet régulier</span>
      </div>

      <div className="trjt-form-section">
        <div className="trjt-form-section-title">Informations générales</div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="line">Ligne</label>
            <select 
              id="line" 
              onChange={(e) => handleLigneChange(parseInt(e.target.value))}
              value={selectedLigne?.id || ""}
            >
              <option value="" disabled>Sélectionner une ligne</option>
              {lignes.map(ligne => (
                <option key={ligne.id} value={ligne.id}>
                  N°{ligne.number} - {ligne.name} ({ligne.depart} → {ligne.arrivee})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="depart">Point de départ</label>
            <input 
              type="text" 
              id="depart" 
              value={formData.depart}
              readOnly
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="arrivee">Point d'arrivée</label>
            <input 
              type="text" 
              id="arrivee" 
              value={formData.arrivee}
              readOnly
            />
          </div>
        </div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label>Jours de service</label>
            <div className="trjt-checkbox-group">
              {[ "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((jour, index) => (
                <div className="trjt-checkbox-item" key={index}>
                  <input 
                    type="checkbox" 
                    id={jour.toLowerCase()} 
                    checked={formData.jours.includes(jour)}
                    onChange={(e) => {
                      const newJours = e.target.checked
                        ? [...formData.jours, jour]
                        : formData.jours.filter(j => j !== jour);
                      setFormData(prev => ({ ...prev, jours: newJours }));
                    }}
                  />
                  <label htmlFor={jour.toLowerCase()}>{jour}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="date_debut">Date de début</label>
            <input 
              type="date" 
              id="date_debut" 
              value={formData.dateDebut}
              onChange={(e) => {
                const newDateDebut = e.target.value;
                const activeDates = newDateDebut && formData.dateFin 
                  ? calculateDates(newDateDebut, formData.dateFin, formData.jours)
                  : [];
                setFormData(prev => ({ 
                  ...prev, 
                  dateDebut: newDateDebut,
                  activeDates
                }));
              }}
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="date_fin">Date de fin</label>
            <input 
              type="date" 
              id="date_fin" 
              value={formData.dateFin}
              onChange={(e) => {
                const newDateFin = e.target.value;
                const activeDates = formData.dateDebut && newDateFin 
                  ? calculateDates(formData.dateDebut, newDateFin, formData.jours)
                  : [];
                setFormData(prev => ({ 
                  ...prev, 
                  dateFin: newDateFin,
                  activeDates
                }));
              }}
            />
          </div>
        </div>

        {formData.activeDates && formData.activeDates.length > 0 && (
  <div className="trjt-form-group">
    <label>Dates de circulation:</label>
    <div className="trjt-dates-list">
      {formData.activeDates.slice(0, 10).map((date, index) => (
        <span key={index} className="trjt-date-badge">
          {date.toLocaleDateString('fr-FR')}
        </span>
      ))}
      {formData.activeDates.length > 10 && (
        <span className="trjt-date-more">
          +{formData.activeDates.length - 10} autres
        </span>
      )}
    </div>
  </div>
)}
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="heure_depart">Heure de départ</label>
            <input 
              type="time" 
              id="heure_depart" 
              value={formData.heureDepart}
              onChange={handleHeureDepartChange}
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="heure_arrivee">Heure d'arrivée (estimée)</label>
            <input 
              type="time" 
              id="heure_arrivee" 
              value={formData.heureArrivee}
              readOnly
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="duree">Durée estimée</label>
            <input 
              type="text" 
              id="duree" 
              value={formData.duree} 
              readOnly 
            />
          </div>
        </div>
      </div>

      <div className="trjt-form-section">
        <div className="trjt-form-section-title">Arrêts intermédiaires</div>
        
        <div className="trjt-stops-container">
          {/* Affichage du point de départ */}
          <div className="trjt-stop-item">
            <div className="trjt-stop-num">D</div>
            <div className="trjt-form-group" style={{ flex: 3 }}>
              <input 
                type="text" 
                value={formData.depart} 
                readOnly
              />
            </div>
            <div className="trjt-form-group">
              <input 
                type="time" 
                value={formData.heureDepart}
                readOnly
              />
            </div>
          </div>

          {/* Affichage des arrêts intermédiaires avec heures calculées */}
          {formData.arretsIntermediaires.map((arret, index) => (
            <div className="trjt-stop-item" key={index}>
              <div className="trjt-stop-num">{index + 1}</div>
              <div className="trjt-form-group" style={{ flex: 3 }}>
                <input 
                  type="text" 
                  value={arret.nom} 
                  readOnly
                />
              </div>
              <div className="trjt-form-group">
                <input 
                  type="time" 
                  value={arret.heure}
                  readOnly
                />
              </div>
            </div>
          ))}

          {/* Affichage du point d'arrivée */}
          {formData.arretsIntermediaires.length > 0 && (
            <div className="trjt-stop-item">
              <div className="trjt-stop-num">A</div>
              <div className="trjt-form-group" style={{ flex: 3 }}>
                <input 
                  type="text" 
                  value={formData.arrivee} 
                  readOnly
                />
              </div>
              <div className="trjt-form-group">
                <input 
                  type="time" 
                  value={formData.heureArrivee}
                  readOnly
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="trjt-form-section">
        <div className="trjt-form-section-title">Attribution</div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="chauffeur">Chauffeur</label>
            <input
              type="text"
              id="chauffeur"
              value={formData.chauffeur}
              readOnly
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="telephone">Téléphone</label>
            <input 
              type="text" 
              id="telephone" 
              value={formData.telephone || ''} 
              readOnly 
            />
          </div>
        </div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="vehicule">Véhicule</label>
            <input
              type="text"
              id="vehicule"
              value={formData.vehicule}
              readOnly
            />
          </div>
          <div className="trjt-form-group">
            <label htmlFor="places">Nombre de places</label>
            <input 
              type="text" 
              id="places" 
              value={formData.places || ''} 
              readOnly 
            />
          </div>
        </div>
      </div>
      <div className="trjt-action-buttons trjt-form-actions">
        <button className="trjt-btn trjt-btn-secondary" onClick={handleCancelForm}>
          <FontAwesomeIcon icon={faTimes} /> Annuler
        </button>
        <button 
          className="trjt-btn trjt-btn-primary" 
          onClick={trajetsReguliers.some(t => t.ligne_id === selectedLigne?.id && t.heure_depart === formData.heureDepart) ? handleUpdateTrajet : handleSaveTrajet}
          disabled={!selectedLigne || !formData.chauffeur || !formData.vehicule}
        >
          <FontAwesomeIcon icon={faSave} /> 
          {trajetsReguliers.some(t => t.ligne_id === selectedLigne?.id && t.heure_depart === formData.heureDepart) ? "Mettre à jour" : "Enregistrer"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="trjt-admin-container">
      <Header />
      <div className="trjt-main-content">
        <Navbar />
        <div className="trjt-content-area">
          <h1 className="trjt-page-title">Trajets</h1>
          
          {loading ? (
            <div className="trjt-loading">Chargement en cours...</div>
          ) : (
            <>
              {!showAddRegularForm && !showAddPonctualForm && <TrajetsList />}
              {showAddRegularForm && <AddRegularTrajetForm />}
              {showAddPonctualForm && <div>Formulaire trajet ponctuel</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrajetAdmin;