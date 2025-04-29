import React from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Profil.css";
import avatar from "../../icons/personne.png";

// Valeurs par défaut pour un chauffeur avec les champs spécifiques
const defaultChauffeur = {
  nom: "Benali",
  prenom: "Mohammed",
  matricule: "CHAUF-2023-0125",
  numeroTel: "06 12 34 56 78",
  email: "m.benali@example.com",
  dateMiseEnCharge: "01/04/2025",
  dateRetour: "05/04/2025",
  type: "Externe",/*or externe*/
  dateContrat: "01/01/2023",
  // Informations du bus
  busMatricule: "12345-AB-12",
  busMarque: "Mercedes",
  busModele: "Sprinter",
  busTypeEng: "Diesel",
  busCouleur: "Blanc",
  busKilometrage: "45,230 km"
};

const ProfilChauffeur = ({ chauffeur = defaultChauffeur, onLogout }) => {
  return (
    <div>
      <Header />
      <div className="chauffeur">
        <Navbar />
        <div className="chauffeur-container">
          <h2 className="chauffeur-title">Profil Chauffeur</h2>
          
          {/* Infos personnelles du chauffeur */}
          <div className="chauffeur-section">
            <img src={avatar} alt="" className="chauffeur-avatar" />
            <div className="chauffeur-info">
              <p><strong>Nom:</strong> {chauffeur.nom}</p>
              <p><strong>Prénom:</strong> {chauffeur.prenom}</p>
              <p><strong>Matricule:</strong> {chauffeur.matricule}</p>
              <p><strong>Numéro de téléphone:</strong> {chauffeur.numeroTel}</p>
              <p><strong>Email:</strong> {chauffeur.email}</p>
            </div>
          </div>
          
          {/* Infos de service */}
            
          <div className="chauffeur-section">
            <h3>Informations de service</h3>
            <table className="chauffeur-table">
              <tbody>
                {/* Render 'Date de mise en charge' and 'Date de retour' if type is "Interne" */}
                {defaultChauffeur.type === "Interne" && (
                  <>
                    <tr>
                      <th>Date de mise en charge</th>
                      <td>{defaultChauffeur.dateMiseEnCharge}</td>
                    </tr>
                    <tr>
                      <th>Date de retour</th>
                      <td>{defaultChauffeur.dateRetour}</td>
                    </tr>
                  </>
                )}

                {/* Render 'Date de contrat' if type is "Externe" */}
                {defaultChauffeur.type === "Externe" && (
                  <tr>
                    <th>Date de contrat</th>
                    <td>{defaultChauffeur.dateContrat}</td>
                  </tr>
                )}

                {/* Render Type */}
                <tr>
                  <th>Type</th>
                  <td>
                    <span className={`statu-badge ${defaultChauffeur.type === "Externe" ? "active" : ""}`}>
                      {defaultChauffeur.type}
                    </span>
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
                  <td>{chauffeur.busMatricule}</td>
                </tr>
                <tr>
                  <th>Marque</th>
                  <td>{chauffeur.busMarque}</td>
                </tr>
                <tr>
                  <th>Modèle</th>
                  <td>{chauffeur.busModele}</td>
                </tr>
                <tr>
                  <th>Type de moteur</th>
                  <td>{chauffeur.busTypeEng}</td>
                </tr>
                <tr>
                  <th>Couleur</th>
                  <td>{chauffeur.busCouleur}</td>
                </tr>
                <tr>
                  <th>Kilométrage</th>
                  <td>{chauffeur.busKilometrage}</td>
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
                onClick={onLogout || (() => alert("Déconnexion indisponible"))} 
                className="chauffeur-logout"
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

export default ProfilChauffeur;