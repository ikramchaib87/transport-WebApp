import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";
import AddBus from "./AddBus";
import "./Administrateurs.css";

const BusTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buses, setBuses] = useState([]);
  const [busToEdit, setBusToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // URL de base de l'API
  const API_URL = "http://localhost:5000/api";

  // Récupérer tous les bus au chargement du composant
  useEffect(() => {
    fetchBuses();
  }, []);

  // Fonction pour récupérer tous les bus
  const fetchBuses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/buses`);
      
      // Adapter les noms de champs pour correspondre à votre frontend
      const formattedBuses = response.data.map(bus => ({
        id: bus.id,
        matricule: bus.matricule,
        mark: bus.marque,
        model: bus.modele,
        typeEng: bus.type_energie,
        couleur: bus.couleur,
        kilometrage: bus.kilometrage,
        type: bus.type,
        statue: bus.statut,
        annee: bus.annee
      }));
      
      setBuses(formattedBuses);
      setError(null);
    } catch (err) {
      console.error("Erreur lors de la récupération des bus:", err);
      setError("Impossible de charger les bus. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour rechercher des bus
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchBuses();
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/buses/search?query=${searchQuery}`);
      
      const formattedBuses = response.data.map(bus => ({
        id: bus.id,
        matricule: bus.matricule,
        mark: bus.marque,
        model: bus.modele,
        typeEng: bus.type_energie,
        couleur: bus.couleur,
        kilometrage: bus.kilometrage,
        type: bus.type,
        statue: bus.statut,
        annee: bus.annee
      }));
      
      setBuses(formattedBuses);
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
      setError("Erreur lors de la recherche. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Ajouter ou modifier un bus
  const handleAddBus = async (newBus) => {
    try {
      // Adapter les noms de champs pour correspondre à votre backend
      const busData = {
        matricule: newBus.matricule,
        marque: newBus.mark,
        modele: newBus.model,
        type_energie: newBus.typeEng,
        couleur: newBus.couleur,
        kilometrage: parseInt(newBus.kilometrage) || 0,
        type: newBus.type,
        statut: newBus.statue || "disponible", // Utilisez le statut existant si en mode édition
        annee: parseInt(newBus.annee) || new Date().getFullYear()
      };

      if (busToEdit) {
        // Modification d'un bus existant - utilisation de l'ID au lieu du matricule
        await axios.put(`${API_URL}/buses/${busToEdit.id}`, busData);
      } else {
        // Ajout d'un nouveau bus
        await axios.post(`${API_URL}/buses`, busData);
      }
      
      // Actualiser la liste des bus
      fetchBuses();
      setBusToEdit(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout/modification du bus:", err);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  // Supprimer un bus - utilisation de l'ID au lieu du matricule
  const handleDeleteBus = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce bus ?")) {
      try {
        await axios.delete(`${API_URL}/buses/${id}`);
        fetchBuses();
      } catch (err) {
        console.error("Erreur lors de la suppression du bus:", err);
        alert("Une erreur est survenue lors de la suppression. Veuillez réessayer.");
      }
    }
  };

  // Ouvrir la modale pour modifier un bus
  const handleEditBus = (bus) => {
    setBusToEdit(bus);
    setIsModalOpen(true);
  };

  // Fonction pour vérifier si un bus est réservé et mettre à jour son statut
  const checkBusReservation = async (id) => {
    try {
      await axios.get(`${API_URL}/buses/${id}/reservations`);
      // La mise à jour du statut se fait côté serveur si nécessaire
      fetchBuses(); // Rafraîchir pour afficher les modifications
    } catch (err) {
      console.error("Erreur lors de la vérification des réservations:", err);
    }
  };

  // Vérifier les réservations pour tous les bus périodiquement
  useEffect(() => {
    const checkAllBusesReservations = async () => {
      try {
        for (const bus of buses) {
          await checkBusReservation(bus.id);
        }
      } catch (err) {
        console.error("Erreur lors de la vérification des réservations:", err);
      }
    };

    // Vérifier les réservations toutes les 5 minutes
    const intervalId = setInterval(checkAllBusesReservations, 5 * 60 * 1000);
    
    // Nettoyer l'intervalle lorsque le composant est démonté
    return () => clearInterval(intervalId);
  }, [buses]);

  return (
    <div>
      <Header />
      <div className="ad">
        <Navbar />
        <div className="ad-container">
          <h2 className="title">
            <span className="underline">Bus</span>
          </h2>
          <br />
          <p className="total">
            Nombre total : <span className="count">{buses.length}</span>
          </p>

          <div className="actions">
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>
                <img src={search} alt="search" />
              </button>
              <button className="add-bus-btn" onClick={() => setIsModalOpen(true)}>
                Ajouter un Bus
              </button>
            </div>
          </div>

          {loading ? (
            <p>Chargement...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Matricule⬍</th>
                  <th>Marque⬍</th>
                  <th>Modèle⬍</th>
                  <th>Type Eng⬍</th>
                  <th>Couleur⬍</th>
                  <th>kilometrage⬍</th>
                  <th>Type⬍</th>
                  <th>Statut⬍</th>
                  <th>Action⬍</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((bus, index) => (
                  <tr key={bus.id} className={index % 2 === 0 ? "gray-row" : ""}>
                    <td>{bus.matricule}</td>
                    <td>{bus.mark}</td>
                    <td>{bus.model}</td>
                    <td>{bus.typeEng}</td>
                    <td>{bus.couleur}</td>
                    <td>{bus.kilometrage}</td>
                    <td>{bus.type}</td>
                    <td>
                      <span className={`status-badge status-${bus.statue.replace(/\s+/g, '-')}`}>
                        {bus.statue}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleEditBus(bus)}>
                        <img src={edit} alt="edit" />
                      </button>
                      <button onClick={() => handleDeleteBus(bus.id)}>
                        <img src={Delete} alt="delete" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <AddBus
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setBusToEdit(null);
            }}
            onAddBus={handleAddBus}
            busToEdit={busToEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default BusTable;