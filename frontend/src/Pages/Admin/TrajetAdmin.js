import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileExport, faEdit, faTrash, faSearch, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
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
  const [editingReturnId, setEditingReturnId] = useState(null);
  const [formData, setFormData] = useState({
    ligne: "",
    depart: "",
    arrivee: "",
    jours: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"],
    heureDepart: "07:00",
    heureArrivee: "08:00",
    duree: "0 min",
    chauffeur: "",
    vehicule: "",
    statut: "Actif",
    arretsIntermediaires: [],
    dateDebut: "",
    dateFin: "",
    activeDates: [],
    telephone: "",
    places: "",
    sens: 'aller',
    createReturn: true
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

 const fetchTrajet = async (trajetId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/trajets/${trajetId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Créez une copie du texte de la réponse pour le débogage
    const responseClone = response.clone();
    const responseText = await responseClone.text();

    if (!response.ok) {
      // Essayez d'abord de parser le JSON
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || errorData.message || `Erreur HTTP ${response.status}`);
      } catch (e) {
        // Si ce n'est pas du JSON, utilisez le texte brut
        throw new Error(responseText || `Erreur HTTP ${response.status}`);
      }
    }

    // Parsez la réponse originale
    const data = await response.json();
    
    if (!data.success || !data.trajet) {
      throw new Error('Format de réponse inattendu de l\'API');
    }

    // Conversion des champs si nécessaire
    const trajet = data.trajet;
    if (trajet.arrets && typeof trajet.arrets === 'string') {
      trajet.arrets = JSON.parse(trajet.arrets);
    }
    if (trajet.active_dates && typeof trajet.active_dates === 'string') {
      trajet.active_dates = JSON.parse(trajet.active_dates);
    }

    return trajet;
  } catch (error) {
    console.error("Erreur fetchTrajet:", error);
    throw new Error(`Impossible de charger le trajet: ${error.message}`);
  }
};
const calculateStopTimes = (departTime, stops) => {
  if (!stops || stops.length < 2) return [];
  
  const [departHours, departMinutes] = departTime.split(':').map(Number);
  let totalMinutes = departHours * 60 + departMinutes;
  
  const stopTimes = [];
  
  // Ne pas inclure le dernier arrêt (point d'arrivée final)
  for (let i = 1; i < stops.length - 1; i++) {
    const stop = stops[i];
    const durationMinutes = parseInt(stop.duree) || 0;
    
    // Ajouter la durée depuis le départ
    totalMinutes = departHours * 60 + departMinutes + durationMinutes;
    
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    
    stopTimes.push({
      nom: stop.name,
      heure: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    });
  }
  
  return stopTimes;
};

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
      if (response.ok) {
        const data = await response.json();
        if (data?.success && data.affectation) {
          const aff = data.affectation;
          chauffeur = `${aff.nom || ''} ${aff.prenom || ''}`.trim();
          vehicule = `${aff.marqueBus || ''} ${aff.modele || ''}`.trim();
          telephone = aff.telephone || '';
          places = aff.places_disponibles || '';
        }
      }
    } catch (error) {
      console.error("Erreur affectations:", error);
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

    const heureArrivee = calculateArrivalTime(
      formData.heureDepart || "08:00", 
      ligneSelectionnee.duree || "0:00"
    );

    const arretsAvecHeures = ligneSelectionnee.stops 
      ? calculateStopTimes(formData.heureDepart || "08:00", ligneSelectionnee.stops)
      : [];

    setFormData(prev => ({
      ...prev,
      ligne: `N°${ligneSelectionnee.number}`,
      depart: ligneSelectionnee.depart,
      arrivee: ligneSelectionnee.arrivee,
      heureArrivee,
      duree: ligneSelectionnee.duree || "0 min",
      chauffeur,
      vehicule,
      telephone,
      places,
      arretsIntermediaires: arretsAvecHeures.filter(arret => 
        arret.nom !== ligneSelectionnee.depart && 
        arret.nom !== ligneSelectionnee.arrivee
      )
    }));
  };

  const calculateArrivalTime = (departTime, duration) => {
    if (!departTime || !duration) return "";
    
    try {
      let totalDurationMinutes = 0;
      
      if (duration.includes(':') || duration.includes('h')) {
        const normalizedDuration = duration.replace('h', ':');
        const [hours, minutes] = normalizedDuration.split(':').map(Number);
        totalDurationMinutes = (hours || 0) * 60 + (minutes || 0);
      } else if (duration.includes('min')) {
        totalDurationMinutes = parseInt(duration) || 0;
      } else {
        totalDurationMinutes = parseInt(duration) || 0;
      }
  
      const [departHours, departMinutes] = departTime.split(':').map(Number);
      let totalMinutes = departHours * 60 + departMinutes + totalDurationMinutes;
      totalMinutes = totalMinutes % (24 * 60);
      
      const arriveeHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const arriveeMinutes = (totalMinutes % 60).toString().padStart(2, '0');
      
      return `${arriveeHours}:${arriveeMinutes}`;
    } catch (error) {
      console.error("Erreur dans le calcul de l'heure d'arrivée:", error);
      return "";
    }
  };

  const handleHeureDepartChange = (e) => {
  const newHeureDepart = e.target.value;
  
  if (!selectedLigne?.duree || !selectedLigne?.stops) {
    setFormData(prev => ({
      ...prev,
      heureDepart: newHeureDepart,
      heureArrivee: "",
      arretsIntermediaires: []
    }));
    return;
  }
  
  // Calculer l'heure d'arrivée finale
  const heureArrivee = calculateArrivalTime(newHeureDepart, selectedLigne.duree);
  
  // Calculer les heures des arrêts intermédiaires
  const arretsAvecHeures = calculateStopTimes(newHeureDepart, selectedLigne.stops);

  setFormData(prev => ({
    ...prev,
    heureDepart: newHeureDepart,
    heureArrivee,
    arretsIntermediaires: arretsAvecHeures
  }));
};

 const handleSaveTrajet = async () => {
  try {
    // 1. Validation des données
    if (!selectedLigne) {
      throw new Error('Veuillez sélectionner une ligne');
    }

    // Validation du format des heures
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.heureDepart) || !timeRegex.test(formData.heureArrivee)) {
      throw new Error('Format de temps invalide. Utilisez HH:MM (ex: 08:00)');
    }

    // 2. Préparation des données du trajet principal
    const trajetData = {
      ligne_id: selectedLigne.id,
      ligne_number: selectedLigne.number,
      depart: formData.depart,
      arrivee: formData.arrivee,
      jours: formData.jours.join(', '),
      heure_depart: formData.heureDepart,
      heure_arrivee: formData.heureArrivee,
      duree: formData.duree,
      chauffeur: formData.chauffeur,
      vehicule: formData.vehicule,
      statut: formData.statut,
      arrets: formData.arretsIntermediaires,
      date_debut: formData.dateDebut || null,
      date_fin: formData.dateFin || null,
      active_dates: formData.activeDates.map(date => date.toISOString().split('T')[0]),
      numero_chauffeur: formData.telephone || '',
      nombre_places: parseInt(formData.places) || 0,
      sens: formData.sens
    };

    // 3. Envoi du trajet principal
    const method = editingTrajetId ? 'PUT' : 'POST';
    const url = editingTrajetId 
      ? `http://localhost:5000/api/trajets/${editingTrajetId}`
      : 'http://localhost:5000/api/trajets';

    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(trajetData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
    }

    // 4. Création du retour SI nécessaire (uniquement pour nouveaux trajets aller)
if (!editingTrajetId && formData.createReturn && formData.sens === 'aller') {
  const trajetPrincipal = await response.json();
  
  // Création des arrêts inversés pour le retour avec les mêmes heures de base
  const createReturnStops = (originalStops, departTime, arriveTime) => {
    if (!originalStops || originalStops.length === 0) {
      return [];
    }
    
    // Creer une copie des arrêts originaux et les inverser
    const reversedStops = [...originalStops].reverse();
    
    // Garder les mêmes heures mais en ordre inverse
    // Vous pourrez modifier ces heures plus tard dans l'interface
    return reversedStops.map(stop => ({
      nom: stop.nom,
      heure: stop.heure // On garde les heures pour que vous puissiez les modifier manuellement
    }));
  };
  
  const arretsRetour = createReturnStops(
    formData.arretsIntermediaires, 
    formData.heureDepart, 
    formData.heureArrivee
  );
  
  // Préparation des données du trajet retour (avec arrêts inversés)
  const trajetRetourData = {
    ...trajetData,
    depart: formData.arrivee, // Inversion départ/arrivée
    arrivee: formData.depart,
    heure_depart: formData.heureDepart, // Gardez les heures originales
    heure_arrivee: formData.heureArrivee,
    arrets: arretsRetour, // Arrêts inversés avec heures à modifier
    sens: 'retour'
  };

  // Envoi du trajet retour
  const retourResponse = await fetch('http://localhost:5000/api/trajets', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(trajetRetourData)
  });

  if (!retourResponse.ok) {
    throw new Error('Erreur lors de la création du trajet retour');
  }

  const trajetRetour = await retourResponse.json();

  alert(`Trajet aller (ID: ${trajetPrincipal.trajet.id}) et retour (ID: ${trajetRetour.trajet.id}) créés avec succès ! Vous pouvez maintenant modifier les heures du trajet retour.`);
} else {
  // Message pour les autres cas
  const result = await response.json();
  alert(editingTrajetId 
    ? "Trajet mis à jour avec succès !" 
    : `Trajet créé avec succès ! (ID: ${result.trajet.id})`);
}

    // 5. Mise à jour de la liste des trajets
    const trajetsResponse = await fetch('http://localhost:5000/api/trajets');
    const trajetsData = await trajetsResponse.json();
    setTrajetsReguliers(trajetsData);

    // 6. Réinitialisation du formulaire
    handleCancelForm();

  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    alert(`Erreur: ${error.message}`);
  }
};

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

      setTrajetsReguliers(trajetsReguliers.filter(trajet => trajet.id !== trajetId));
      alert("Trajet supprimé avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

 const handleEditTrajet = async (trajet) => {
  try {
    setLoading(true);
    
    // 1. Récupération du trajet avec gestion améliorée des erreurs
    let trajetData;
    try {
      trajetData = await fetchTrajet(trajet.id);
    } catch (error) {
      console.error("Erreur lors de la récupération du trajet:", error);
      throw new Error(`Échec du chargement du trajet: ${error.message}`);
    }
    
    // 2. Trouver la ligne associée
    const ligne = lignes.find(l => l.id === trajetData.ligne_id);
    if (!ligne) {
      throw new Error('Ligne associée non trouvée');
    }

    // 3. Conversion des données
    const safeParse = (data) => {
      if (!data) return data;
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        return data;
      }
    };

    // Fonction pour formater la date au format YYYY-MM-DD
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    // 4. Mise à jour du state
    setFormData({
      ligne: `N°${trajetData.ligne_number}`,
      depart: trajetData.depart,
      arrivee: trajetData.arrivee,
      jours: typeof trajetData.jours === 'string' 
        ? trajetData.jours.split(',').map(j => j.trim())
        : trajetData.jours || [],
      heureDepart: trajetData.heure_depart,
      heureArrivee: trajetData.heure_arrivee,
      duree: trajetData.duree || "0 min",
      chauffeur: trajetData.chauffeur || "",
      vehicule: trajetData.vehicule || "",
      statut: trajetData.statut || "Actif",
      arretsIntermediaires: safeParse(trajetData.arrets) || [],
      dateDebut: formatDateForInput(trajetData.date_debut),
      dateFin: formatDateForInput(trajetData.date_fin),
      activeDates: trajetData.active_dates 
        ? safeParse(trajetData.active_dates).map(date => new Date(date)) 
        : [],
      telephone: trajetData.numero_chauffeur || '',
      places: trajetData.nombre_places || '',
      sens: trajetData.sens || 'aller',
      createReturn: false // Désactivé en mode édition
    });

    setEditingTrajetId(trajet.id);
    setSelectedLigne(ligne);
    setShowAddRegularForm(true);

  } catch (error) {
    console.error("Erreur dans handleEditTrajet:", error);
    alert(`Erreur lors de l'édition: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleCancelForm = () => {
    setEditingTrajetId(null);
    setEditingReturnId(null);
    setShowAddRegularForm(false);
    setShowAddPonctualForm(false);
    setSelectedLigne(null);
    setFormData({
      ligne: "",
      depart: "",
      arrivee: "",
      jours: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"],
      heureDepart: "08:00",
      heureArrivee: "08:30",
      duree: "0 min",
      chauffeur: "",
      vehicule: "",
      statut: "Actif",
      arretsIntermediaires: [],
      dateDebut: "",
      dateFin: "",
      activeDates: [],
      telephone: "",
      places: "",
      sens: 'aller',
      createReturn: true
    });
  };

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
        <button className="trjt-btn trjt-btn-orange" onClick={() => {
          setShowAddRegularForm(true);
          setShowAddPonctualForm(false);
        }}>
          <FontAwesomeIcon icon={faPlus} /> Ajouter un trajet régulier
        </button>
        <button className="trjt-btn trjt-btn-green" onClick={() => {
          setShowAddPonctualForm(true);
          setShowAddRegularForm(false);
        }}>
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
                  <td className="trjt-td">N°{trajet.ligne_number} ({trajet.sens === 'aller' ? 'Aller' : 'Retour'})</td>
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
        <span className="trjt-current">
          {editingTrajetId ? "Modifier un trajet" : "Ajouter un trajet régulier"}
        </span>
      </div>

      <div className="trjt-form-section">
        <div className="trjt-form-section-title">Informations générales</div>
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="sens">Sens du trajet</label>
            <select 
              id="sens" 
              value={formData.sens}
              onChange={(e) => {
                const newSens = e.target.value;
                setFormData({
                  ...formData,
                  sens: newSens,
                  createReturn: newSens === 'aller' && formData.createReturn
                });
              }}
              disabled={editingTrajetId}
            >
              <option value="aller">Aller</option>
              <option value="retour">Retour</option>
            </select>
          </div>
          
          {formData.sens === 'aller' && !editingTrajetId && (
  <div className="trjt-form-group trjt-checkbox-container">
    <input
      type="checkbox"
      id="createReturn"
      checked={formData.createReturn}
      onChange={(e) => setFormData({...formData, createReturn: e.target.checked})}
    />
    <label htmlFor="createReturn">Créer automatiquement le trajet retour</label>
  </div>
)}
        </div>
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
              {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((jour) => (
                <div className="trjt-checkbox-item" key={jour}>
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

        {formData.activeDates.length > 0 && (
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
          onClick={handleSaveTrajet}
          disabled={!selectedLigne || !formData.chauffeur || !formData.vehicule}
        >
          <FontAwesomeIcon icon={faSave} /> 
          {editingTrajetId ? "Mettre à jour" : "Enregistrer"}
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