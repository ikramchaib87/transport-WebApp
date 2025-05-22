import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";
import Affecter from "./Affecter";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin} from "lucide-react";
import viewDetails from "../../icons/view.png";
const ReservationTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationToEdit, setReservationToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAffectation, setSelectedAffectation] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  //-------------------
const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
const [busToAssign, setBusToAssign] = useState(null);
const [availableLines, setAvailableLines] = useState([]);
const [selectedLine, setSelectedLine] = useState("");
const [assignmentMessage, setAssignmentMessage] = useState({ text: '', type: '' });
const fetchAvailableLines = async () => {
 
    try {
      const response = await fetch('http://localhost:5000/api/lines');
      const data = await response.json();
      setAvailableLines(data);
    } catch (error) {
      console.error('Error fetching lines:', error);
    }
};
const handleAssignToLine = (bus) => {
  setBusToAssign(bus);
  fetchAvailableLines();
  setIsAssignModalOpen(true);
};

const handleConfirmAssignment = async () => {
  try {
    // Ajouter un indicateur de chargement si nécessaire
    setAssignmentMessage({ text: 'Affectation en cours...', type: 'info' });
    
    const response = await fetch(
      `http://localhost:5000/api/affectations/${busToAssign.id}/assign-line`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_id: selectedLine })
      }
    );

    if (!response.ok) throw new Error('Échec de l\'affectation');

    const updatedAffectation = await response.json();
    
    

    
    // Mettre à jour les réservations avec toutes les informations nécessaires
    setReservations(reservations.map(aff => 
      aff.id === updatedAffectation.id ? {
        ...aff,
        line_id: updatedAffectation.line_id,
        line_number: updatedAffectation.line_number,
        line_name: updatedAffectation.line_name
      } : aff
    ));
    
    setAssignmentMessage({ 
      text: 'Affectation réussie !', 
      type: 'success' 
    });
    
    // Fermer le modal après 2 secondes
    setTimeout(() => {
      setIsAssignModalOpen(false);
      setAssignmentMessage({ text: '', type: '' });
    }, 2000);
  } catch (err) {
    console.error('Erreur d\'affectation:', err);
    setAssignmentMessage({
      text: err.message || 'Erreur lors de l\'affectation',
      type: 'error'
    });
  }
};
//-----------------------------
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/affectations");
  
      if (!response.ok) {
        throw new Error("Erreur serveur lors de la récupération des affectations");
      }
  
      const data = await response.json();
      
      if (!data.affectations || !Array.isArray(data.affectations)) {
        throw new Error("Format de données incorrect");
      }
      
      setReservations(data.affectations);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des affectations:", err);
      setError("Impossible de charger les affectations: " + (err.message || "Erreur serveur"));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchReservations();
  }, []);

  const handleAddReservation = (newReservation) => {
    try {
      if (reservationToEdit) {
        setReservations(
          reservations.map((res) => 
            res.id === reservationToEdit.id ? newReservation : res
          )
        );
        setReservationToEdit(null);
      } else {
        setReservations([newReservation, ...reservations]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de la gestion de la réservation:", err);
      alert("Erreur: " + err.message);
    }
  };

  const handleDeleteReservation = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette affectation ?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/affectations/${id}`, {
        method: "DELETE",
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Erreur lors de la suppression");
        }
      } else if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setReservations(reservations.filter((res) => res.id !== id));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReservation = (reservation) => {
    setReservationToEdit(reservation);
    setIsModalOpen(true);
  };

  const formatDate = (dateString) => {
    try {
      // Gérer les chaînes de date dans différents formats
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      console.error("Erreur de formatage de date:", error, dateString);
      return dateString; // Retourner la chaîne originale en cas d'erreur
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (reservation.matriculeBus?.toLowerCase() || "").includes(searchTermLower) ||
      (reservation.matriculeChauffeur?.toLowerCase() || "").includes(searchTermLower) ||
      (reservation.nomChauffeur?.toLowerCase() || "").includes(searchTermLower) ||
      (reservation.marqueBus?.toLowerCase() || "").includes(searchTermLower)
    );
  });
  const handleViewDetails = (affectation) => {
    setSelectedAffectation(affectation);
    setIsDetailModalOpen(true);
  };
  return (
    <div>
      <Header />
      <div className="ad">
        <Navbar />
        <div className="ad-container">
          <h2 className="title">
            <span className="underline">Affectation du transport</span>
          </h2>
          <br />
          <p className="total">
            Nombre total : <span className="count">{reservations.length}</span>
          </p>

          {error && <div className="error-message">{error}</div>}

          <div className="actions">
  <div className="search-container">
    <div className="search-group">
      <input 
        type="text" 
        placeholder="Rechercher une affectation..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button className="search-button">
        <img src={search} alt="search" />
      </button>
    </div>
    <button 
      className="primary-button"
      onClick={() => {
        console.log("Bouton Affecter cliqué"); // Pour débogage
        setReservationToEdit(null);
        setIsModalOpen(true);
      }}
    >
      Affecter un bus
    </button>
  </div>
</div>

          {loading ? (
            <div className="loading">Chargement des affectations...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Matricule Bus</th>
                  <th>Matricule Chauffeur</th>
                  <th>Places Disponibles</th>
                  <th>Date de Mise en Charge</th>
                  <th>Chauffeur</th>
                  <th>Modèle de Bus</th>
                  <th>Ligne</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan="8" >
                      Aucune affectation disponible
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((reservation, index) => (
                    <tr key={reservation.id} className={index % 2 === 0 ? "gray-row" : ""}>
                      <td>{reservation.matriculeBus}</td>
                      <td>{reservation.matriculeChauffeur}</td>
                      <td>{reservation.placesDisponibles}</td>
                      <td>{formatDate(reservation.date_prise_charge)}</td>
                      <td>{reservation.nomChauffeur || `${reservation.nom || ''} ${reservation.prenom || ''}`}</td>
                      <td>{`${reservation.marqueBus || reservation.marque || ''} ${reservation.modele || ''}`}</td>
                      <td>
                       {reservation.line_number 
                      ? `Ligne ${reservation.line_number} - ${reservation.line_name} (${reservation.depart} → ${reservation.arrivee})`
                      : 'Non affecté'}
                      </td>
                      <td>
                      <button onClick={() => handleViewDetails(reservation)}>
                      <img src={viewDetails} alt="view" />
                       </button>
                        <button onClick={() => handleEditReservation(reservation)}>
                          <img src={edit} alt="edit" />
                        </button>
                        <button onClick={() => handleDeleteReservation(reservation.id)}>
                          <img src={Delete} alt="delete" />
                        </button>
                         <button 
                          className="assign-btn" 
                            onClick={() => handleAssignToLine(reservation)}
                                   >
                           <MapPin size={16} />
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          <Affecter
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setReservationToEdit(null);
            }}
            onAddReservation={handleAddReservation}
            reservationToEdit={reservationToEdit}
          />
        </div>
      </div>
      {isDetailModalOpen && selectedAffectation && (
  <>
    <div className="reservation-overlay" onClick={() => setIsDetailModalOpen(false)}></div>
    <div className="reservation-detail-modal">
      <h2>Détails de l'affectation</h2>
      
      <div className="detail-section">
        <h3>Informations sur le bus</h3>
        <p><strong>Matricule:</strong> {selectedAffectation.matriculeBus}</p>
        <p><strong>Marque:</strong> {selectedAffectation.marqueBus}</p>
        <p><strong>Modèle:</strong> {selectedAffectation.modele}</p>
        <p><strong>Places disponibles:</strong> {selectedAffectation.placesDisponibles}</p>
      </div>

      <div className="detail-section">
        <h3>Informations sur le chauffeur</h3>
        <p><strong>Matricule:</strong> {selectedAffectation.matriculeChauffeur}</p>
        <p><strong>Nom complet:</strong> {selectedAffectation.nomChauffeur}</p>
      </div>

      <div className="detail-section">
        <h3>Dates</h3>
        <p><strong>Date de mise en charge:</strong> {formatDate(selectedAffectation.date_prise_charge)}</p>
        {selectedAffectation.raison_modification && (
          <p><strong>Raison de modification:</strong> {selectedAffectation.raison_modification}</p>
        )}
      </div>

      <button 
        className="close-detail-button" 
        onClick={() => setIsDetailModalOpen(false)}
      >
        Fermer
      </button>

    </div>
  </>
)}
{isAssignModalOpen && busToAssign && (
  <>
    <div className="bus-modal-overlay" onClick={() => setIsAssignModalOpen(false)}></div>
    <div className="bus-modal-content">
      <h3>Affecter le bus à une ligne</h3>
      <p>Bus: {busToAssign.marqueBus || busToAssign.marque} {busToAssign.modele} ({busToAssign.matriculeBus || busToAssign.matricule})</p>
      
      {assignmentMessage.text && (
        <div className={`assignment-message ${assignmentMessage.type}`}>
          {assignmentMessage.text}
        </div>
      )}
      
      <div className="form-group">
        <select 
          value={selectedLine} 
          onChange={(e) => setSelectedLine(e.target.value)} 
          className="line-select-dropdown"
        >
          <option value="">Choisir une ligne</option>
          {availableLines.map(line => (
            <option key={line.id} value={line.id}>
              Ligne {line.number} - {line.name} ({line.depart} → {line.arrivee})
            </option>
          ))}
        </select>
      </div>
      <div className="modal-actions">
        <button 
          onClick={() => {
            setIsAssignModalOpen(false);
            setAssignmentMessage({ text: '', type: '' });
          }} 
          className="cancel-btn"
        >
          Annuler
        </button>
        <button 
          onClick={handleConfirmAssignment} 
          disabled={!selectedLine} 
          className="confirm-btn"
        >
          Confirmer l'affectation
        </button>
      </div>
    </div>
  </>
)}
    </div>
  );
};
export default ReservationTable;