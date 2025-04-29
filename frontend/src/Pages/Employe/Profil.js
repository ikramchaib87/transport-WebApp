import React from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Profil.css";
import avatar from "../../icons/personne.png";

// Valeurs par défaut (utile pour le développement)
const defaultUser = {
  nom: "Ikram",
  prenom: "B.",
  email: "ikram@example.com",
  matricule: "EMP-2023-0458",
  Fonction: "employé",
  bus: "Ligne 12",
  arret: "Zone Industrielle Nord",
  status: "Trajet en cours",
  dernierTrajet: "05/04/2025 - 8:00"
};

const Profil = ({ user = defaultUser, onLogout }) => {
  return (
    <div>
      <Header />
      <div className="bod">
        <Navbar />
        <div className="profile-container">
          <h2 className="profile-title">Profil employé</h2>
          
          {/* Infos employé */}
          <div className="profile-section">
            <img src={avatar} alt="" className="profile-avatar" />
            <div className="profile-info">
              <p><strong>Nom & prénom:</strong> {user.nom} {user.prenom}</p>
              <p><strong>Matricule:</strong> {user.matricule}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Fonction:</strong> {user.Fonction}</p>
            </div>
          </div>
          
          {/* Infos de transport */}
          <div className="profile-section">
            <h3>Informations de transport</h3>
            <table className="profile-table">
              <tbody>
                <tr>
                  <th>Service de bus</th>
                  <td>{user.bus || "Non assigné"}</td>
                </tr>
                <tr>
                  <th>Point d'arrêt</th>
                  <td>{user.arret || "Non défini"}</td>
                </tr>
                <tr>
                  <th>Statut actuel</th>
                  <td>
                    <span className={`status-badge ${user.status === "Trajet en cours" ? "active" : ""}`}>
                      {user.status || "Aucun trajet assigné"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Réclamations */}
          <div className="profile-section">
            <h3>Gestion des réclamations</h3>
            <p>Pour toute question relative au service de transport ou pour signaler un problème, veuillez soumettre une réclamation via notre système.</p>
            <a href="/EmployeRoutes/Reclamation" className="profile-link">Accéder au système de réclamation</a>
          </div>
          
          {/* Déconnexion */}
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={onLogout || (() => alert("Déconnexion indisponible"))} 
                className="profile-logout"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profil;