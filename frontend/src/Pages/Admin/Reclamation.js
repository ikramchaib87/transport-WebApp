import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import './Reclamation.css';

const AdminReclamations = () => {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReclamations();
  }, []);

  const fetchReclamations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reclamations');
      setReclamations(response.data);
    } catch (error) {
      alert('Erreur lors du chargement des réclamations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (reclamation) => {
    setSelectedReclamation(reclamation);
    setStatus(reclamation.status);
    setCommentaire(reclamation.commentaire_gestionnaire || '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await axios.put(
        `http://localhost:5000/api/reclamations/${selectedReclamation.id}/traiter`,
        {
          status,
          commentaire
        }
      );

      alert('Réclamation mise à jour avec succès');
      setShowModal(false);
      fetchReclamations();
    } catch (error) {
      alert('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Nouvelle': return 'nouvelle';
      case 'En cours': return 'en-cours';
      case 'Résolue': return 'resolue';
      case 'Rejetée': return 'rejetee';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };
  return (
    <div className="reclamation-admin-container">
      <Header />
      <div className="reclamation-main-content">
        <Navbar />
        <div className="reclamation-content-area">
          <h3 id="reclamation-section-title">Gestion des réclamations</h3>
          
          {loading ? (
            <div className="reclamation-loading">Chargement en cours...</div>
          ) : (
            <div className="reclamation-grid">
              {reclamations.map(reclamation => (
                <div key={reclamation.id} className="reclamation-card">
                  <div className="reclamation-header">
                    <span className="reclamation-id">#{reclamation.id}</span>
                    <span 
                      className={`reclamation-status ${getStatusClass(reclamation.status)}`}
                    >
                      {reclamation.status}
                    </span>
                  </div>
                  
                  <div className="reclamation-body">
                    <div className="reclamation-info">
                      <p><strong>Employé:</strong> {reclamation.employee_nom} {reclamation.employee_prenom}</p>
                      <p><strong>Matricule:</strong> {reclamation.employee_matricule}</p>
                      <p><strong>Date:</strong> {formatDate(reclamation.date_soumission)}</p>
                      <p><strong>Catégorie:</strong> {reclamation.categorie}</p>
                    </div>
                    
                    <button 
                      className="reclamation-details-btn"
                      onClick={() => handleShowDetails(reclamation)}
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showModal && selectedReclamation && (
            <div className="reclamation-modal-overlay">
              <div className="reclamation-modal-content">
                <div className="reclamation-modal-header">
                  <h3>Détails de la réclamation #{selectedReclamation.id}</h3>
                  <button 
                    className="reclamation-modal-close"
                    onClick={() => setShowModal(false)}
                  >
                    &times;
                  </button>
                </div>
                
                <div className="reclamation-modal-body">
                  <div className="reclamation-modal-section">
                    <h4>Informations employé</h4>
                    <div className="reclamation-info">
                      <p><strong>Nom complet:</strong> {selectedReclamation.employee_nom} {selectedReclamation.employee_prenom}</p>
                      <p><strong>Matricule:</strong> {selectedReclamation.employee_matricule}</p>
                      <p><strong>Ligne:</strong> {selectedReclamation.employee_ligne || 'Non spécifiée'}</p>
                    </div>
                  </div>
                  
                  <div className="reclamation-modal-section">
                    <h4>Détails du voyage</h4>
                    <div className="reclamation-info">
                      <p><strong>Date du voyage:</strong> {formatDate(selectedReclamation.date_voyage)}</p>
                      <p><strong>Heure réelle:</strong> {selectedReclamation.heure_reelle}</p>
                    </div>
                  </div>
                  
                  <div className="reclamation-modal-section">
                    <h4>Réclamation</h4>
                    <div className="reclamation-info">
                      <p><strong>Catégorie:</strong> {selectedReclamation.categorie}</p>
                      <p><strong>Description:</strong></p>
                      <div className="reclamation-description-box">
                        {selectedReclamation.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="reclamation-modal-section">
                    <h4>Traitement</h4>
                    <div className="reclamation-form-group">
                      <label>Statut:</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="reclamation-form-select"
                      >
                        <option value="Nouvelle">Nouvelle</option>
                        <option value="En cours">En cours</option>
                        <option value="Résolue">Résolue</option>
                        <option value="Rejetée">Rejetée</option>
                      </select>
                    </div>
                    
                    <div className="reclamation-form-group">
                      <label>Réponse à l'employé:</label>
                      <textarea
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        className="reclamation-form-textarea"
                        rows="4"
                        placeholder="Saisissez votre réponse ici..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="reclamation-modal-actions">
                  <button 
                    className="reclamation-cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Fermer
                  </button>
                  <button 
                  className="reclamation-submit-btn"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                   >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer la réponse'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReclamations;