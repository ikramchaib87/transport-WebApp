import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";
import AddBus from "./AddBus";
import "./bus.css";

const BusTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buses, setBuses] = useState([]);
  const [busToEdit, setBusToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const API_URL = "http://localhost:5000/api";

  const fetchBuses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/buses`);
      
      const formattedBuses = response.data.map(bus => ({
        id: bus.id,
        matricule: bus.matricule,
        mark: bus.marque,
        model: bus.modele,
        typeEng: bus.type_energie,
        couleur: bus.couleur,
        kilometrage: bus.kilometrage,
        type: bus.type,
        nb_places: bus.nb_places,
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
  }, [API_URL]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

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
        nb_places: bus.nb_places,
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

  const handleAddBus = async (newBus) => {
    try {
      const busData = {
        matricule: newBus.matricule,
        marque: newBus.mark,
        modele: newBus.model,
        type_energie: newBus.typeEng,
        couleur: newBus.couleur,
        kilometrage: parseInt(newBus.kilometrage) || 0,
        nb_places: parseInt(newBus.nb_places) || 0,
        type: newBus.type,
        statut: newBus.statue || "disponible",
        annee: parseInt(newBus.annee) || new Date().getFullYear()
      };

      if (busToEdit) {
        await axios.put(`${API_URL}/buses/${busToEdit.id}`, busData);
      } else {
        await axios.post(`${API_URL}/buses`, busData);
      }
      
      fetchBuses();
      setBusToEdit(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout/modification du bus:", err);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };

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

  const handleEditBus = (bus) => {
    setBusToEdit(bus);
    setIsModalOpen(true);
  };

  const checkBusReservation = useCallback(async (id) => {
    try {
      await axios.get(`${API_URL}/buses/${id}/reservations`);
      fetchBuses();
    } catch (err) {
      console.error("Erreur lors de la vérification des réservations:", err);
    }
  }, [API_URL, fetchBuses]);

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

    const intervalId = setInterval(checkAllBusesReservations, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [buses, checkBusReservation]);

  return (
    <div>
      <Header />
      <div className="bus-admin">
        <Navbar />
        <div className="bus-container">
          <h2 className="bus-title">
            <span className="bus-underline">Bus</span>
          </h2>
          <br />
          <p className="bus-total">
            Nombre total : <span className="bus-count">{buses.length}</span>
          </p>

         <div className="bus-actions">
  <div className="bus-search-container">
    <div className="bus-search-bar">
      <input 
        type="text" 
        placeholder="Rechercher un bus..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch} className="bus-search-button">
        <img src={search} alt="search" />
      </button>
    </div>
    <button 
      onClick={() => {
        setIsModalOpen(true);
        setBusToEdit(null);
      }}
      className="bus-add-btn"
    >
      Ajouter un bus
    </button>
  </div>
</div>
          {loading ? (
            <p>Chargement...</p>
          ) : error ? (
            <p className="bus-error-message">{error}</p>
          ) : (
            <table className="bus-table">
              <thead>
                <tr>
                  <th>Matricule⬍</th>
                  <th>Marque⬍</th>
                  <th>Modèle⬍</th>
                  <th>Type Eng⬍</th>
                  <th>Couleur⬍</th>
                  <th>kilometrage⬍</th>
                  <th>Type⬍</th>
                  <th>nb_places⬍</th>
                  <th>Statut⬍</th>
                  <th>Action⬍</th>
                </tr>
              </thead>
              <tbody>
                {buses.map((bus, index) => (
                  <tr key={bus.id} className={index % 2 === 0 ? "bus-row-gray" : ""}>
                    <td>{bus.matricule}</td>
                    <td>{bus.mark}</td>
                    <td>{bus.model}</td>
                    <td>{bus.typeEng}</td>
                    <td>{bus.couleur}</td>
                    <td>{bus.kilometrage}</td>
                    <td>{bus.type}</td>
                    <td>{bus.nb_places}</td>
                    <td>
                      <span className={`bus-status-badge bus-status-${bus.statue.toLowerCase().replace(/\s+/g, '-')}`}>
                        {bus.statue}
                      </span>
                    </td>
                    <td>
                      <button className="bus-action-btn" onClick={() => handleEditBus(bus)}>
                        <img src={edit} alt="edit" />
                      </button>
                      <button className="bus-action-btn" onClick={() => handleDeleteBus(bus.id)}>
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