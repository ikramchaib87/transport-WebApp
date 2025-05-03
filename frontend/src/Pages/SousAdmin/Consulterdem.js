import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./DemaDetails.css";

const DemandeDetails = () => {
  const { id } = useParams();
  const [demande, setDemande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [message, setMessage] = useState(null);

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Fonction pour récupérer les détails d'une demande
  const fetchDemandeDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/transport/request/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDemande(data.data);
      } else {
        throw new Error(data.message || "Erreur lors de la récupération des détails de la demande");
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des détails:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour le statut d'une demande
  const updateStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const response = await fetch(`http://localhost:5000/api/transport/request/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statut: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDemande(data.data);
        setMessage({ type: 'success', text: `Statut mis à jour: ${newStatus}` });
        
        // Effacer le message après 3 secondes
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        throw new Error(data.message || "Erreur lors de la mise à jour du statut");
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Effet pour charger les détails au chargement du composant
  useEffect(() => {
    fetchDemandeDetails();
  }, [id]);

  // Gestionnaires d'événements pour les boutons
  const handleAccept = () => updateStatus("accepté");
  const handleReject = () => updateStatus("refusé");
  const handleReturn = () => {
    window.location.href = "/admin/demandes";
  };

  return (
    <div className="dem-detail-container">
      <Header />
      <div className="dem-detail-main-content">
        <Navbar />
        <div className="dem-detail-content-area">
          <div className="dem-detail-header">
            <h2 className="dem-detail-title">Détails de la Demande</h2>
            <div className="dem-detail-underline"></div>
          </div>
          
          {loading ? (
            <div className="dem-detail-loading">Chargement des détails...</div>
          ) : error ? (
            <div className="dem-detail-error">Erreur: {error}</div>
          ) : demande ? (
            <div className="dem-detail-card">
              {message && (
                <div className={`dem-detail-message ${message.type}`}>
                  {message.text}
                </div>
              )}
              
              <div className="dem-detail-section">
                <h3>Informations Personnelles</h3>
                <div className="dem-detail-fields">
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Matricule:</span>
                    <span>{demande.matricule}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Nom Complet:</span>
                    <span>{`${demande.nom} ${demande.prenom}`}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Email:</span>
                    <span>{demande.email}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Téléphone:</span>
                    <span>{demande.phone}</span>
                  </div>
                </div>
              </div>
              
              <div className="dem-detail-section">
                <h3>Informations Professionnelles</h3>
                <div className="dem-detail-fields">
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Fonction:</span>
                    <span>{demande.fonction}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Poste:</span>
                    <span>{demande.post}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Affectation:</span>
                    <span>{demande.affectation}</span>
                  </div>
                </div>
              </div>
              
              <div className="dem-detail-section">
                <h3>Informations de Transport</h3>
                <div className="dem-detail-fields">
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Adresse:</span>
                    <span>{demande.adresse}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Commune:</span>
                    <span>{demande.commune}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Wilaya:</span>
                    <span>{demande.wilaya}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Itinéraire:</span>
                    <span>{demande.itineraire}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Indemnité:</span>
                    <span>{demande.indemnity} DA</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Prime:</span>
                    <span>{demande.prime} DA</span>
                  </div>
                </div>
              </div>
              
              {demande.image_path && (
                <div className="dem-detail-section">
                  <h3>Pièce Jointe</h3>
                  <div className="dem-detail-image">
                    <img 
                      src={`http://localhost:5000${demande.image_path}`} 
                      alt="Justificatif de demande" 
                    />
                  </div>
                </div>
              )}
              
              <div className="dem-detail-section">
                <h3>Suivi de la Demande</h3>
                <div className="dem-detail-fields">
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Date de Soumission:</span>
                    <span>{formatDate(demande.date_soumission)}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Date de Décision:</span>
                    <span>{formatDate(demande.date_decision)}</span>
                  </div>
                  <div className="dem-detail-field">
                    <span className="dem-detail-label">Statut Actuel:</span>
                    <span className={`dem-detail-status ${
                      demande.statut === "accepté" 
                        ? "accepted" 
                        : demande.statut === "refusé" 
                          ? "rejected" 
                          : "pending"
                    }`}>
                      {demande.statut || "En attent"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="dem-detail-actions">
                <button 
                  className="dem-detail-button return"
                  onClick={handleReturn}
                >
                  Retour à la liste
                </button>
                
                {(demande.statut === "En attent" || !demande.statut) && (
                  <>
                    <button 
                      className="dem-detail-button accept"
                      onClick={handleAccept}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? "Traitement..." : "Accepter"}
                    </button>
                    <button 
                      className="dem-detail-button reject"
                      onClick={handleReject}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? "Traitement..." : "Refuser"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="dem-detail-not-found">Demande non trouvée</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandeDetails;