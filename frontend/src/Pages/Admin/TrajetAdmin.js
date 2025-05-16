import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faFileExport, faEdit, faTrash, faEye, faSearch, faTimes, faSave
} from '@fortawesome/free-solid-svg-icons';
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
  
  const [formData, setFormData] = useState({
    ligne: "",
    depart: "",
    arrivee: "",
    jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi" , "Samedi", "Dimanche"],
    heureDepart: "08:00",
    heureArrivee: "08:30",
    duree: "0 min",
    chauffeur: "",
    vehicule: "",
    statut: "Actif",
    arretsIntermediaires: [],
    remarques: ""
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
    
    // Trouver l'affectation pour cette ligne
    const affectation = affectations.find(a => a.line_id === ligneId);
    
    // Récupérer les détails complets du bus et du chauffeur
    let chauffeurDetails = { nom: "", telephone: "" };
    let vehiculeDetails = { marque: "", modele: "", places: "" };
    
    if (affectation) {
      try {
        // Récupérer les détails du bus
        const busResponse = await fetch(`http://localhost:5000/api/external-buses/${affectation.bus_id}`);
        const busData = await busResponse.json();
        vehiculeDetails = busData.bus || {};
        
        // Récupérer les détails du chauffeur
        if (vehiculeDetails.chauffeur_nom) {
          chauffeurDetails = {
            nom: `${vehiculeDetails.chauffeur_nom} ${vehiculeDetails.chauffeur_prenom || ''}`.trim(),
            telephone: vehiculeDetails.telephone || ''
          };
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des détails:", error);
      }
    }
    
    // Calculer l'heure d'arrivée
    let duree = ligneSelectionnee.duree || "0:00";

    const heureArrivee = calculateArrivalTime(
      formData.heureDepart || "08:00", 
      ligneSelectionnee.duree || "0:00"
    );
  
    // Mettre à jour le formulaire
    setFormData(prev => ({
      ...prev,
      ligne: `N°${ligneSelectionnee.number}`,
      depart: ligneSelectionnee.depart,
      arrivee: ligneSelectionnee.arrivee,
      duree: duree,
      heureArrivee: heureArrivee,  
      chauffeur: chauffeurDetails.nom || "",
      vehicule: vehiculeDetails.marque ? `${vehiculeDetails.marque} ${vehiculeDetails.modele || ''}`.trim() : "",
      arretsIntermediaires: ligneSelectionnee.stops ? 
        ligneSelectionnee.stops
          .filter(stop => stop.name !== ligneSelectionnee.depart && stop.name !== ligneSelectionnee.arrivee)
          .map(stop => ({
            nom: stop.name,
            heure: ""
          })) : []
    }));
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
    
    setFormData(prev => ({
      ...prev,
      heureDepart: newHeureDepart,
      heureArrivee: heureArrivee,
      duree: selectedLigne.duree
    }));
  };

  // Sauvegarder le trajet
  const handleSaveTrajet = async () => {
    try {
      if (!selectedLigne) {
        throw new Error('Veuillez sélectionner une ligne');
      }
  
      // Valider les formats de temps de manière plus flexible
      const validateTime = (time) => {
        if (!time) return false;
        // Accepte HH:MM ou H:MM
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      };
  
      if (!validateTime(formData.heureDepart) || !validateTime(formData.heureArrivee)) {
        throw new Error('Format de temps invalide. Utilisez HH:MM (ex: 08:00 ou 8:00)');
      }
  
      // Formatage des heures pour s'assurer qu'elles sont au format HH:MM
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
        remarques: formData.remarques || ''
      };
  
      // Envoyer les données à l'API
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

  const handleCancelForm = () => {
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
      remarques: ""
    });
  };

  const getStatusClassName = (statut) => {
    switch(statut.toLowerCase()) {
      case 'actif':
        return 'trjt-status active';
      case 'terminé':
        return 'trjt-status expired';
      case 'en attente':
        return 'trjt-status pending';
      default:
        return 'trjt-status';
    }
  };

  const handleAddRegularTrajet = () => {
    setShowAddRegularForm(true);
    setShowAddPonctualForm(false);
  };

  const handleAddPonctualTrajet = () => {
    setShowAddPonctualForm(true);
    setShowAddRegularForm(false);
  };

  const handleAddArret = () => {
    alert("Redirection vers la gestion des lignes pour ajouter un arrêt.");
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
                <th className="trjt-th">Statut</th>
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
                  <td className="trjt-td"><span className={getStatusClassName(trajet.statut)}>{trajet.statut}</span></td>
                  <td className="trjt-td trjt-action-cell">
                    <button className="trjt-action-btn"><FontAwesomeIcon icon={faEdit} /></button>
                    <button className="trjt-action-btn"><FontAwesomeIcon icon={faTrash} /></button>
                    <button className="trjt-action-btn"><FontAwesomeIcon icon={faEye} /></button>
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
              {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((jour, index) => (
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
                  onChange={(e) => {
                    const newArrets = [...formData.arretsIntermediaires];
                    newArrets[index].heure = e.target.value;
                    setFormData(prev => ({ ...prev, arretsIntermediaires: newArrets }));
                  }}
                />
              </div>
              <button 
                className="trjt-action-btn" 
                onClick={() => {
                  const newArrets = formData.arretsIntermediaires.filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, arretsIntermediaires: newArrets }));
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
          
          {selectedLigne && (
            <>
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
            </>
          )}
        </div>
        
        <button
          className="trjt-add-stop-btn" 
          onClick={handleAddArret}
        >
          <FontAwesomeIcon icon={faPlus} /> Ajouter un arrêt
        </button>
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
              value={vehicules.find(v => 
                `${v.chauffeur_nom} ${v.chauffeur_prenom || ''}`.trim() === formData.chauffeur
              )?.telephone || ''}
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
              value={vehicules.find(v => 
                `${v.marque} ${v.modele || ''}`.trim() === formData.vehicule
              )?.nb_places || ''}
              readOnly 
            />
          </div>
        </div>
      </div>

      <div className="trjt-form-section">
        <div className="trjt-form-section-title">Informations complémentaires</div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="statut">Statut</label>
            <select 
              id="statut" 
              value={formData.statut}
              onChange={(e) => setFormData(prev => ({ ...prev, statut: e.target.value }))}
            >
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
              <option value="En attente">En attente</option>
            </select>
          </div>
        </div>
        
        <div className="trjt-form-row">
          <div className="trjt-form-group">
            <label htmlFor="remarques">Remarques</label>
            <textarea 
              id="remarques" 
              placeholder="Remarques ou instructions spéciales"
              value={formData.remarques || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, remarques: e.target.value }))}
            ></textarea>
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
          <FontAwesomeIcon icon={faSave} /> Enregistrer
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