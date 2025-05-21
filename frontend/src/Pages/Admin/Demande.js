import React, { useState, useEffect, useCallback } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Demande.css";

const Demande = () => {
  // États pour les demandes et la pagination
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [stats, setStats] = useState({
    total: 0, 
    enAttente: 0,
    approuvees: 0,
    rejetees: 0
  });

  // État pour le modal
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState({
    loading: false,
    error: null,
    success: false
  });

  // État pour la vérification
  const [verificationStatus, setVerificationStatus] = useState({
    loading: false,
    error: null,
    verified: false,
    lineExists: false,
    placesDisponibles: false,
    vehiculeDisponible: null,
    typeTransport: null,
    remarque: ''
  });

  // Calculer les statistiques
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transport-requests');
      const data = await response.json();
      
      if (data.success) {
        const allRequests = data.data;
        
        setStats({
          total: allRequests.length,
          enAttente: allRequests.filter(req => req.statut === 'En attente').length,
          approuvees: allRequests.filter(req => req.statut === 'Approuvée').length,
          rejetees: allRequests.filter(req => req.statut === 'Rejetée').length
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  }, []);

  // Récupération des demandes
  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `http://localhost:3001/api/transport-requests?page=${currentPage}&limit=10`;
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setDemandes(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        setError("Erreur lors du chargement des demandes");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des demandes:", error);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  // Charger les demandes
  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  // Charger les statistiques
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Consulter une demande
  const handleConsulter = async (id) => {
    setVerificationStatus({
      loading: false,
      error: null,
      verified: false,
      lineExists: false,
      placesDisponibles: false,
      vehiculeDisponible: null,
      typeTransport: null,
      remarque: ''
    });
    setUpdateStatus({
      loading: false,
      error: null,
      success: false
    });

    try {
      const response = await fetch(`http://localhost:3001/api/transport-requests/${id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedDemande(data.data);
        setShowModal(true);
      } else {
        alert("Erreur lors du chargement des détails");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur de connexion au serveur");
    }
  };

  // Vérifier la ligne et les places
  const handleVerifyLine = useCallback(async (id) => {
    setVerificationStatus(prev => ({...prev, loading: true, error: null}));
    
    try {
      const response = await fetch(`http://localhost:3001/api/transport-requests/${id}/verify-line`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Erreur de vérification');

      setVerificationStatus({
        loading: false,
        error: null,
        verified: true,
        lineExists: data.lineExists,
        placesDisponibles: data.placesDisponibles,
        vehiculeDisponible: data.vehiculeDisponible,
        typeTransport: data.typeTransport,
        remarque: data.remarque
      });

      fetchDemandes();
    } catch (error) {
      setVerificationStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [fetchDemandes]);

  // Changer le statut d'une demande
 const handleStatusChange = useCallback(async (id, status) => {
  setUpdateStatus({ loading: true, error: null, success: false });
  
  try {
    const body = { statut: status };
    
    if (status === 'Approuvée' && verificationStatus.vehiculeDisponible) {
      body.vehicule_id = verificationStatus.vehiculeDisponible.id;
      body.vehicule_type = verificationStatus.typeTransport;
      body.vehicule_matricule = verificationStatus.vehiculeDisponible.matricule;
    }

    const response = await fetch(`http://localhost:3001/api/transport-requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setUpdateStatus({ loading: false, error: null, success: true });
      if (selectedDemande) {
        const updatedDemande = { 
          ...selectedDemande, 
          statut: status,
          date_decision: new Date().toISOString()
        };
        
        if (status === 'Approuvée' && verificationStatus.vehiculeDisponible) {
          updatedDemande.vehicule_id = verificationStatus.vehiculeDisponible.id;
          updatedDemande.vehicule_type = verificationStatus.typeTransport;
          updatedDemande.vehicule_matricule = verificationStatus.vehiculeDisponible.matricule;
        }
        
        setSelectedDemande(updatedDemande);
      }
      fetchDemandes();
      fetchStats();
      
      setTimeout(() => {
        setUpdateStatus({ loading: false, error: null, success: false });
      }, 3000);
    } else {
      setUpdateStatus({ loading: false, error: data.message, success: false });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    setUpdateStatus({ loading: false, error: "Erreur de connexion au serveur", success: false });
  }
}, [selectedDemande, fetchDemandes, fetchStats, verificationStatus]);
  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Fermer le modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDemande(null);
    setUpdateStatus({ loading: false, error: null, success: false });
    setVerificationStatus({
      loading: false,
      error: null,
      verified: false,
      lineExists: false,
      placesDisponibles: false,
      vehiculeDisponible: null,
      typeTransport: null,
      remarque: ''
    });
  };

  // Classe CSS pour le statut
  const getStatusBadgeClass = (statut) => {
    switch (statut) {
      case 'En attente': return 'status-badge en-attente';
      case 'Approuvée': return 'status-badge approuvée';
      case 'Rejetée': return 'status-badge rejetée';
      default: return 'status-badge';
    }
  };

  return (
    <div className="dem-container">
      <Header />
      <div className="dem-main-content">
        <Navbar />
        <div className="dem-conten-area">
          <div className="demandes-container">
            <h1 className="section-title">Gestion des demandes de transport</h1>
            
            {/* Statistiques et filtres */}
            <div className="stats-filter-container">
              <div className="stats-container">
                <div className="stat-box">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-box pending">
                  <span className="stat-value">{stats.enAttente}</span>
                  <span className="stat-label">En attente</span>
                </div>
                <div className="stat-box approved">
                  <span className="stat-value">{stats.approuvees}</span>
                  <span className="stat-label">Approuvées</span>
                </div>
                <div className="stat-box rejected">
                  <span className="stat-value">{stats.rejetees}</span>
                  <span className="stat-label">Rejetées</span>
                </div>
              </div>
              
              <div className="filter-container">
                <label htmlFor="status-filter">Filtrer par statut:</label>
                <select 
                  id="status-filter" 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Tous</option>
                  <option value="En attente">En attente</option>
                  <option value="Approuvée">Approuvée</option>
                  <option value="Rejetée">Rejetée</option>
                </select>
              </div>
            </div>
            
            {/* Tableau des demandes */}
            {loading ? (
              <div className="loading">Chargement des demandes...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : demandes.length === 0 ? (
              <div className="no-data">Aucune demande trouvée</div>
            ) : (
              <div className="demandes-table-container">
                <table className="demandes-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom et Prénom</th>
                      <th>Matricule</th>
                      <th>Itinéraire</th>
                      <th>Date de soumission</th>
                      <th>Remarque</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandes.map((demande) => (
                      <tr 
                        key={demande.id} 
                        className={demande.statut === 'En attente' ? 'pending-row' : ''}
                      >
                        <td>TR-{demande.id}</td>
                        <td>{demande.nom} {demande.prenom}</td>
                        <td>{demande.matricule}</td>
                      
                          <td>
                            <td>
                            {demande.line_number ? (
                              <>
                                Ligne {demande.line_number} - {demande.line_name} 
                                <br />({demande.line_depart} → {demande.line_arrivee})
                                {demande.stop_name && (
                                  <div className="stop-info">
                                    <small>Arrêt: {demande.stop_name} </small>
                                  </div>
                                )}
                              </>
                            ) : (
                              demande.itineraire
                            )}
                          </td>
                          </td>
                          <td>{formatDate(demande.date_soumission)}</td>
                        <td className="remarque-cell">
                          {demande.remarque || 'Aucune remarque'}
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(demande.statut)}>
                            {demande.statut}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-consult" 
                            onClick={() => handleConsulter(demande.id)}
                          >
                            Consulter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {!loading && !error && demandes.length > 0 && (
              <div className="pagination-container">
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </button>
                <span className="page-info">
                  Page {currentPage} sur {totalPages}
                </span>
                <button 
                  className="pagination-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal pour les détails de la demande */}
      {showModal && selectedDemande && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Détails de la demande TR-{selectedDemande.id}</h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                {/* Informations personnelles */}
                <div className="detail-section">
                  <h3>Informations personnelles</h3>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Nom</label>
                      <span>{selectedDemande.nom}</span>
                    </div>
                    <div className="detail-item">
                      <label>Prénom</label>
                      <span>{selectedDemande.prenom}</span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Email</label>
                      <span>{selectedDemande.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Téléphone</label>
                      <span>{selectedDemande.phone}</span>
                    </div>
                  </div>
                </div>
                
                {/* Informations professionnelles */}
                <div className="detail-section">
                  <h3>Informations professionnelles</h3>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Matricule</label>
                      <span>{selectedDemande.matricule}</span>
                    </div>
                    <div className="detail-item">
                      <label>Fonction</label>
                      <span>{selectedDemande.fonction}</span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>N° Post</label>
                      <span>{selectedDemande.post}</span>
                    </div>
                    <div className="detail-item">
                      <label>Affectation</label>
                      <span>{selectedDemande.affectation || "Non spécifié"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Informations d'adresse */}
                <div className="detail-section">
                  <h3>Adresse et itinéraire</h3>
                  <div className="detail-row">
                    <div className="detail-item full-width">
                      <label>Adresse complète</label>
                      <span>{selectedDemande.adresse}</span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Commune</label>
                      <span>{selectedDemande.commune}</span>
                    </div>
                    <div className="detail-item">
                      <label>Wilaya</label>
                      <span>{selectedDemande.wilaya}</span>
                    </div>
                  </div>
               
<div className="detail-row">
  <div className="detail-item full-width">
    <label>Itinéraire demandé</label>
    <span>
      {selectedDemande.line_number ? (
        <>
          Ligne {selectedDemande.line_number} - {selectedDemande.line_name} 
          <br />(Départ: {selectedDemande.line_depart}, Arrivée: {selectedDemande.line_arrivee})
          {selectedDemande.stop_name && (
            <>
              <br /><strong>Arrêt:</strong> {selectedDemande.stop_name}
            </>
          )}
        </>
      ) : (
        selectedDemande.itineraire
      )}
    </span>
  </div>
</div>
                </div>
                
                {/* Véhicule attribué (si approuvée) */}
                {selectedDemande.statut === 'Approuvée' && selectedDemande.vehicule_matricule && (
                  <div className="detail-section">
                    <h3>Véhicule attribué</h3>
                    <div className="detail-row">
                      <div className="detail-item">
                        <label>Type</label>
                        <span>{selectedDemande.vehicule_type === 'interne' ? 'Bus interne' : 'Bus externe'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Matricule</label>
                        <span>{selectedDemande.vehicule_matricule}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Déclarations */}
                <div className="detail-section">
                  <h3>Déclarations</h3>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Indemnité d'amortissement</label>
                      <span>{selectedDemande.indemnity ? "Non perçue" : "Perçue"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Prime de transport</label>
                      <span>{selectedDemande.prime ? "Non perçue" : "Perçue"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Remarque */}
                <div className="detail-section">
                  <h3>Remarque</h3>
                  <div className="detail-row">
                    <div className="detail-item full-width">
                      <span>{selectedDemande.remarque || "Aucune remarque"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Image justificative */}
                {selectedDemande.image_path && (
                  <div className="detail-section image-section">
                    <h3>Justificatif</h3>
                    {selectedDemande.image_path.endsWith('.pdf') ? (
                      <div className="pdf-link">
                        <a href={`http://localhost:3001${selectedDemande.image_path}`} target="_blank" rel="noopener noreferrer">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16ZM4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6ZM16 12V9C16 8.45 15.55 8 15 8H13V12H15C15.55 12 16 11.55 16 11V9C16 8.45 15.55 8 15 8M14 9H15V10H14V9ZM14 11H15V12H14V11ZM10 8H11V10H12V8H13V12H12V11H10V8Z" fill="currentColor"/>
                          </svg>
                          Voir le document PDF
                        </a>
                      </div>
                    ) : (
                      <div className="image-container">
                        <img 
                          src={`http://localhost:3001${selectedDemande.image_path}`} 
                          alt="Justificatif" 
                          className="justification-image" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer du modal avec boutons d'action */}
            <div className="modal-footer">
              {/* Messages de statut */}
              {verificationStatus.loading && (
                <div className="status-message info">Vérification en cours...</div>
              )}

              {verificationStatus.error && (
                <div className="status-message error">{verificationStatus.error}</div>
              )}

              {verificationStatus.verified && (
                <div className={`status-message ${
                  verificationStatus.lineExists && verificationStatus.placesDisponibles 
                    ? 'success' 
                    : 'warning'
                }`}>
                  {verificationStatus.lineExists
                    ? verificationStatus.placesDisponibles
                      ? `${verificationStatus.typeTransport === 'interne' ? 'Bus interne' : 'Bus externe'} 
                         ${verificationStatus.vehiculeDisponible?.matricule} disponible 
                         (${verificationStatus.vehiculeDisponible?.placesRestantes} places)`
                      : 'Aucune place disponible dans les véhicules de cette ligne'
                    : 'Ligne non validée. Demande en attente.'}
                </div>
              )}

              {updateStatus.success && (
                <div className="status-message success">
                  Statut mis à jour avec succès!
                </div>
              )}

              {/* Boutons d'action */}
              <div className="modal-actions">
                <button 
                  className="btn-verify" 
                  onClick={() => handleVerifyLine(selectedDemande.id)}
                  disabled={verificationStatus.loading || selectedDemande.statut !== 'En attente'}
                >
                  {verificationStatus.loading ? 'Vérification...' : 'Vérifier disponibilité'}
                </button>

                <button 
                  className="btn-reject" 
                  onClick={() => handleStatusChange(selectedDemande.id, 'Rejetée')}
                  disabled={selectedDemande.statut === 'Rejetée' || updateStatus.loading}
                >
                  Rejeter
                </button>
                
                <button 
                  className="btn-approve" 
                  onClick={() => handleStatusChange(selectedDemande.id, 'Approuvée')}
                  disabled={
                    selectedDemande.statut === 'Approuvée' || 
                    updateStatus.loading ||
                    (verificationStatus.verified && !verificationStatus.placesDisponibles)
                  }
                >
                  Approuver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Demande;