import React, { useEffect, useState } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Profil.css";
import avatar from "../../icons/personne.png";
import axios from "axios";

const ProfilEmploye = () => {
  const [employeeData, setEmployeeData] = useState(null);
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

    const fetchEmployeeData = async () => {
     try {
    const response = await axios.get('http://localhost:5000/api/employe-data', {
      params: { 
        username: user.username,
        uidNumber: user.uidNumber // Ajout du uidNumber
      }
    });

        if (!response.data) {
          throw new Error("Aucune donnée reçue du serveur");
        }

        setEmployeeData(response.data);
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

    fetchEmployeeData();
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
      window.location.href = '/LoginEmploye';
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Même en cas d'erreur, on déconnecte l'utilisateur localement
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = '/LoginEmploye';
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
        <div className="employe">
          <Navbar />
          <div className="employe-container">
            <h2 className="employe-title">Profil Employé</h2>
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
        <div className="employe">
          <Navbar />
          <div className="employe-container">
            <h2 className="employe-title">Profil Employé</h2>
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
      <div className="employe">
        <Navbar />
        <div className="employe-container">
          <h2 className="employe-title">Profil Employé</h2>
          
          {/* Infos personnelles de l'employé */}
          <div className="employe-section">
            {employeeData?.photo_url ? (
           <img 
            src={`http://localhost:5000${employeeData?.photo_url}`}
            onError={(e) => {
            e.target.src = avatar;
            e.target.onerror = null;
            }}
            alt="Photo de profil"
            className="employe-avatar"
            />
            ) : (
             <img src={avatar} alt="Avatar par défaut" className="employe-avatar" />
             )}
              {/* ... reste du code */}

            <div className="employe-info">
              <p><strong>Nom:</strong> {employeeData?.nom || "-"}</p>
              <p><strong>Prénom:</strong> {employeeData?.prenom || "-"}</p>
              <p><strong>Matricule:</strong> {employeeData?.ldap_id || "-"}</p>
              <p><strong>Numéro de téléphone:</strong> {employeeData?.telephone || "-"}</p>
              <p><strong>Email:</strong> {employeeData?.email || "-"}</p>
            </div>
          </div>
          
          {/* Infos professionnelles */}            
          <div className="employe-section">
            <h3>Informations professionnelles</h3>
            <table className="employe-table">
              <tbody>
                <tr>
                  <th>Fonction</th>
                  <td>{employeeData?.fonction || "-"}</td>
                </tr>
                <tr>
                  <th>Poste</th>
                  <td>{employeeData?.post || "-"}</td>
                </tr>
                <tr>
                  <th>Affectation</th>
                  <td>{employeeData?.affectation || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Infos de localisation */}
          <div className="employe-section">
            <h3>Localisation</h3>
            <table className="employe-table">
              <tbody>
                <tr>
                  <th>Adresse</th>
                  <td>{employeeData?.adresse || "-"}</td>
                </tr>
                <tr>
                  <th>Commune</th>
                  <td>{employeeData?.commune || "-"}</td>
                </tr>
                <tr>
                  <th>Wilaya</th>
                  <td>{employeeData?.wilaya || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Infos de transport */}
          <div className="employe-section">
            <h3>Informations de transport</h3>
            <table className="employe-table">
              <tbody>
                <tr>
                  <th>Ligne assignée</th>
                  <td>
                    {employeeData?.line_number && employeeData?.line_name 
                      ? `${employeeData.line_number} - ${employeeData.line_name}`
                      : "Aucune ligne assignée"}
                  </td>
                </tr>
                <tr>
                  <th>Statut</th>
                  <td>
                    <span className={`status-badge ${employeeData?.transport_status === "Actif" ? "active" : ""}`}>
                      {employeeData?.transport_status || "Non défini"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Actions */}
          <div>
            <div className="employe-actions">
              <a href="/reclamation" className="employe-link">Déposer une réclamation</a>
              <a href="/historique-reclamations" className="employe-link">Voir l'historique des réclamations</a>
              <a href="/demande-transport" className="employe-link">Demande de transport</a>
            </div>
          </div>
          
          {/* Déconnexion */}
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={handleLogoutClick} 
                className="employe-logout"
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

export default ProfilEmploye;