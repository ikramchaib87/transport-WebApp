import React from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Reclamation.css";

const Reclamation = () => {
  // Données simulées pour les recandes
  const recandes = [
    { id: 1, nom: "bennrabet omar", date: "07/03/2025", statut: "traiter" },
    { id: 2, nom: "bennrabet omar", date: "07/03/2025", statut: "non traiter" },
    { id: 3, nom: "bennrabet omar", date: "07/03/2025", statut: "traiter" },
    { id: 4, nom: "bennrabet omar", date: "07/03/2025", statut: "traiter" },
    { id: 5, nom: "bennrabet omar", date: "07/03/2025", statut: "non traiter" },
    { id: 6, nom: "bennrabet omar", date: "07/03/2025", statut: "non traiter" },
    { id: 7, nom: "bennrabet omar", date: "07/03/2025", statut: "non traiter" }
  ];

  return (
    <div className="rec-container">
      <Header />
      <div className="rec-main-content">
        <Navbar />
        <div className="rec-content-area">
          <div className="rec-header">
            <h2 className="rec-title">Reclamation</h2>
            <div className="rec-underline"></div>
          </div>

          <div className="rec-requests-list">
            {recandes.map((recande) => (
              <div key={recande.id} className="rec-request-item">
                <div className="rec-request-info">
                  <div className="rec-request-name">{recande.nom}</div>
                  <div className="rec-request-details">
                    date : {recande.date} statut : 
                    <span className={`rec-status ${recande.statut === "traiter" ? "rec-accepted" : "rec-pending"}`}>
                      {" " + recande.statut}
                    </span>
                  </div>
                </div>
                <div className="rec-action-button">
                  <button className="rec-consult-button">consulter</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reclamation;