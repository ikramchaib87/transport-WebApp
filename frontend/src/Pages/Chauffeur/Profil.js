import React, { useEffect, useState } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Profil.css";
import avatar from "../../icons/personne.png";
import axios from "axios";

const ProfilChauffeur = () => {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Retrieve user data from storage
  const user = !isLoggingOut ? 
    JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user')) : null;

  useEffect(() => {
    // If user is null or we're logging out, don't fetch data
    if (!user) {
      if (!isLoggingOut) {
        // If we're not in the process of logging out and user is null, redirect to login
        window.location.href = '/';
      }
      return;
    }

    const fetchDriverData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/chauffeur-data', {
          params: { 
            username: user.username,
            isExternal: user.isExternal
          }
        });

        if (!response.data) {
          throw new Error("Aucune donnée reçue du serveur");
        }

        setDriverData(response.data);
      } catch (err) {
        console.error("Erreur détaillée:", {
          message: err.message,
          response: err.response?.data,
          config: err.config
        });
        setError(err.response?.data?.error || err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [user, isLoggingOut]);

  // Fonction pour afficher la modal de confirmation
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // Fonction pour annuler la déconnexion
  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Fonction pour effectuer la déconnexion
  const confirmLogout = async () => {
    try {
      // Flag to prevent data fetching during logout
      setIsLoggingOut(true);
      
      // Appeler l'API de déconnexion
      await axios.post('http://localhost:5000/api/auth/logout');
      
      // Supprimer les données utilisateur du stockage local
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      
      // Rediriger vers la page de connexion
      window.location.href = '/login';
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Même en cas d'erreur, on déconnecte l'utilisateur localement
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // If no user and not in logout process, redirect to login
  if (!user && !isLoggingOut) {
    return null; // Will be redirected in useEffect
  }

  if (loading && !isLoggingOut) {
    return (
      <div>
        <Header />
        <div className="chauffeur">
          <Navbar />
          <div className="chauffeur-container">
            <h2 className="chauffeur-title">Profil Chauffeur</h2>
            <div className="loading-container">Chargement en cours...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isLoggingOut) {
    return (
      <div>
        <Header />
        <div className="chauffeur">
          <Navbar />
          <div className="chauffeur-container">
            <h2 className="chauffeur-title">Profil Chauffeur</h2>
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-button">
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show a simple loading message during logout
  if (isLoggingOut) {
    return (
      <div className="logout-screen">
        <p>Déconnexion en cours...</p>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="chauffeur">
        <Navbar />
        <div className="chauffeur-container">
          <h2 className="chauffeur-title">Profil Chauffeur</h2>
          
          {/* Infos personnelles du chauffeur */}
          <div className="chauffeur-section">
            {driverData?.photo_chauffeur_url ? (
              <img 
                src={`http://localhost:5000${driverData.photo_chauffeur_url}`} 
                alt="" 
                className="chauffeur-avatar"
              />
            ) : (
              <img src={avatar} alt="" className="chauffeur-avatar" />
            )}
            <div className="chauffeur-info">
              <p><strong>Nom:</strong> {driverData?.chauffeur_nom || "-"}</p>
              <p><strong>Prénom:</strong> {driverData?.chauffeur_prenom || "-"}</p>
              <p><strong>Matricule:</strong> {driverData?.chauffeur_matricule || "-"}</p>
              <p><strong>Numéro de téléphone:</strong> {driverData?.telephone || "-"}</p>
              <p><strong>Email:</strong> {driverData?.email || "-"}</p>
            </div>
          </div>
          
          {/* Infos de service */}            
          <div className="chauffeur-section">
            <h3>Informations de service</h3>
            <table className="chauffeur-table">
              <tbody>
                {!user.isExternal && driverData?.date_prise_charge && (
                  <tr>
                    <th>Date de mise en charge</th>
                    <td>{driverData.date_prise_charge}</td>
                  </tr>
                )}

                {user.isExternal && driverData?.contract_start && (
                  <tr>
                    <th>Date de contrat</th>
                    <td>{driverData.contract_start}</td>
                  </tr>
                )}

                <tr>
                  <th>Type</th>
                  <td>
                    <span className={`statu-badge ${user.isExternal ? "active" : ""}`}>
                      {user.isExternal ? "Externe" : "Interne"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Société</th>
                  <td>{driverData?.company_name || "-"}</td>
                </tr>
                <tr>
                  <th>Ligne assignée</th>
                  <td>
                    {driverData?.line_number && driverData?.line_name 
                      ? `${driverData.line_number} - ${driverData.line_name}`
                      : driverData?.line_name || "Aucune ligne assignée"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Infos du véhicule */}
          <div className="chauffeur-section">
            <h3>Informations du véhicule</h3>
            <table className="chauffeur-table">
              <tbody>
                <tr>
                  <th>Matricule</th>
                  <td>{driverData?.matricule || "-"}</td>
                </tr>
                <tr>
                  <th>Marque</th>
                  <td>{driverData?.marque || "-"}</td>
                </tr>
                <tr>
                  <th>Modèle</th>
                  <td>{driverData?.modele || "-"}</td>
                </tr>
                <tr>
                  <th>Type de moteur</th>
                  <td>{driverData?.type_eng || driverData?.type_energie || "-"}</td>
                </tr>
                <tr>
                  <th>Couleur</th>
                  <td>{driverData?.couleur || "-"}</td>
                </tr>
                <tr>
                  <th>Kilométrage</th>
                  <td>{driverData?.kilometrage || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Actions */}
          <div>
            <div className="chauffeur-actions">
              <a href="/signalement" className="chauffeur-link">Signaler un incident?</a>
              <a href="/rapports" className="chauffeur-link">Voir l'historique?</a>
              <a href="/maintenance" className="chauffeur-link">Demande de maintenance?</a>
            </div>
          </div>
          
          {/* Déconnexion */}
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={handleLogoutClick} 
                className="chauffeur-logout"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal-container">
            <p>Êtes-vous sûr de vouloir vous déconnecter?</p>
            <div className="logout-modal-buttons">
              <button onClick={cancelLogout} className="logout-modal-button logout-cancel-button">
                Annuler
              </button>
              <button onClick={confirmLogout} className="logout-modal-button logout-confirm-button">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilChauffeur;