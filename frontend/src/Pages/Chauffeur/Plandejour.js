import React, { useState, useEffect } from "react";
import "./Plandejour.css";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";

const Plandejour = () => {
  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chauffeurName, setChauffeurName] = useState('');

  useEffect(() => {
    const fetchChauffeurTrajets = async () => {
      try {
        // Récupérer le nom du chauffeur depuis sessionStorage
        const userData = JSON.parse(sessionStorage.getItem('user')); // Changé ici
        if (!userData) {
          throw new Error('Aucune donnée utilisateur trouvée dans sessionStorage');
        }

        const name = userData.displayName;
        if (!name) {
          throw new Error('Nom du chauffeur non disponible dans les données utilisateur');
        }

        setChauffeurName(name);
        
        // Point de terminaison API modifié de "trajets" à "plan"
        const response = await fetch(`http://localhost:5000/api/plan?chauffeur=${encodeURIComponent(name)}`);
        if (!response.ok) {
          throw new Error(`Erreur serveur: ${response.status}`);
        }
        
        const data = await response.json();
        setTrajets(data);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        alert(`Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchChauffeurTrajets();
  }, []);

  // Fonction pour afficher les cartes de trajets
  const renderTrajetCards = (trajetsList) => {
    if (trajetsList.length === 0) {
      return <p>Aucun trajet prévu pour cette période</p>;
    }

    return (
      <div className="schedule-container">
        {trajetsList.map((trajet, index) => (
          <div className="schedule-card" key={index}>
            <div>
              <h4>{trajet.ligne_number}: {trajet.depart} → {trajet.arrivee}</h4>
              <p className="stops-count">
                {trajet.arrets ? 
                  (typeof trajet.arrets === 'string' 
                    ? JSON.parse(trajet.arrets).length 
                    : trajet.arrets.length)
                  : 0
                } arrêts
              </p>
            </div>
            
            <div className="time-container">
              <div>{formatTime(trajet.heure_depart)}</div>
              <div className="time-line"></div>
              <div>{formatTime(trajet.heure_arrivee)}</div>
            </div>
            
            <div className="details-link">
              <p>voir les details</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper pour formater l'heure
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    // Convertir "HH:MM" en format plus lisible
    const [hours, minutes] = timeStr.split(':');
    return `${hours}h${minutes}`;
  };

  // Filtrer les trajets par date
  const getFilteredTrajets = (targetDate) => {
    return trajets.filter(trajet => {
      // Vérifier les dates actives explicites
      if (trajet.active_dates) {
        const activeDates = typeof trajet.active_dates === 'string' 
          ? JSON.parse(trajet.active_dates) 
          : trajet.active_dates;
        if (activeDates.includes(targetDate)) return true;
      }
      
      // Vérifier la plage date_debut/date_fin
      if (trajet.date_debut && trajet.date_fin) {
        const start = new Date(trajet.date_debut);
        const end = new Date(trajet.date_fin);
        const current = new Date(targetDate);
        return current >= start && current <= end;
      }
      
      return false;
    });
  };

  // Dates pour aujourd'hui et demain
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const trajetsAujourdhui = getFilteredTrajets(today);
  const trajetsDemain = getFilteredTrajets(tomorrowStr);

  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Plan de jour</h2>
            <div className="emp-red-dot"></div>
          </div>
          
          {loading ? (
            <div className="loading-message">Chargement de vos trajets...</div>
          ) : (
            <>
              <div className="day-section">
                <h3>Aujourd'hui ({new Date().toLocaleDateString('fr-FR')})</h3>
                {renderTrajetCards(trajetsAujourdhui)}
              </div>
              
              <div className="day-section">
                <h3>Demain ({tomorrow.toLocaleDateString('fr-FR')})</h3>
                {renderTrajetCards(trajetsDemain)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Plandejour;