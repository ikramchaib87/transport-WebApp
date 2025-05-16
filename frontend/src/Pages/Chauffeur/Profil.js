import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Profil.css";
import avatar from "../../icons/personne.png";

const ProfilChauffeur = ({ onLogout }) => {
  const [chauffeur, setChauffeur] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const res = await axios.get('/api/profil-chauffeur', {
          params: { 
            username: user.username,
            isExternal: user.isExternal 
          }
        });
        setChauffeur(res.data);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfil();
  }, [user]);

  if (loading) return <div className="loading">Chargement...</div>;
  if (!chauffeur) return <div className="error">Aucune donnée trouvée</div>;

  return (
    <div>
      <Header />
      <div className="chauffeur">
        <Navbar />
        <div className="chauffeur-container">
          <h2 className="chauffeur-title">Profil Chauffeur</h2>
          
          {/* Infos personnelles */}
          <div className="chauffeur-section">
            <img 
              src={chauffeur.photo_url || avatar} 
              alt="Photo" 
              className="chauffeur-avatar" 
              onError={(e) => e.target.src = avatar} 
            />
            <div className="chauffeur-info">
              <p><strong>Nom:</strong> {chauffeur.nom}</p>
              <p><strong>Prénom:</strong> {chauffeur.prenom}</p>
              <p><strong>Matricule:</strong> {chauffeur.matricule}</p>
              <p><strong>Email:</strong> {chauffeur.email || "N/A"}</p>
              <p><strong>Téléphone:</strong> {chauffeur.tel || "N/A"}</p>
            </div>
          </div>

          {/* Infos de service */}
          <div className="chauffeur-section">
            <h3>Informations de service</h3>
            <table className="chauffeur-table">
              <tbody>
                {chauffeur.type === 'Interne' ? (
                  <>
                    <tr>
                      <th>Date de mise en charge</th>
                      <td>{chauffeur.dateMiseEnCharge || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Date de retour</th>
                      <td>{chauffeur.dateRetour || "N/A"}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <th>Début de contrat</th>
                      <td>{chauffeur.dateContrat || "N/A"}</td>
                    </tr>
                    <tr>
                      <th>Fin de contrat</th>
                      <td>{chauffeur.dateFinContrat || "N/A"}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <th>Type</th>
                  <td>
                    <span className={`statu-badge ${chauffeur.type === 'Externe' ? 'active' : ''}`}>
                      {chauffeur.type}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Infos du véhicule */}
          <div className="chauffeur-section">
            <h3>Véhicule assigné</h3>
            <table className="chauffeur-table">
              <tbody>
                <tr>
                  <th>Matricule</th>
                  <td>{chauffeur.busMatricule || "N/A"}</td>
                </tr>
                <tr>
                  <th>Marque</th>
                  <td>{chauffeur.busMarque || "N/A"}</td>
                </tr>
                <tr>
                  <th>Modèle</th>
                  <td>{chauffeur.busModele || "N/A"}</td>
                </tr>
                <tr>
                  <th>Type moteur</th>
                  <td>{chauffeur.busTypeEng || "N/A"}</td>
                </tr>
                <tr>
                  <th>Couleur</th>
                  <td>{chauffeur.busCouleur || "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="chauffeur-actions">
            <a href="/signalement" className="chauffeur-link">Signaler un incident</a>
            <a href="/rapports" className="chauffeur-link">Historique des trajets</a>
            <a href="/maintenance" className="chauffeur-link">Demande de maintenance</a>
          </div>

          {/* Déconnexion */}
          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <button onClick={onLogout} className="chauffeur-logout">
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilChauffeur;