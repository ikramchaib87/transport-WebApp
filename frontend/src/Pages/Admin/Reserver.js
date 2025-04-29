import React, { useState } from "react";
import "./Reserver.css";

const Reserver = ({ isOpen, onClose, onReserve }) => {
  const [reservationData, setReservationData] = useState({
    bus: "",
    chauffeur: "",
    transportExterne: "",
    ligne: "",
    datePriseCharge: "",
    dateRetour: ""
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setReservationData({
      ...reservationData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    onReserve(reservationData);
    onClose();
  };

  return (
    <>
      <div className="reservation-overlay" onClick={onClose}></div>
      <div className="reservation-modal">
        <h2 className="reservation-title">Reserver un Bus</h2>
        
        <div className="reservation-section">
          <h3 className="reservation-section-title">Interne</h3>
          <select
            name="bus"
            className="reservation-select"
            value={reservationData.bus}
            onChange={handleChange}
          >
            <option value="">Bus disponible</option>
            {/* Ajouter les options dynamiques ici */}
          </select>
          <select
            name="chauffeur"
            className="reservation-select"
            value={reservationData.chauffeur}
            onChange={handleChange}
          >
            <option value="">Chauffeur Disponible</option>
            {/* Ajouter les options dynamiques ici */}
          </select>
        </div>

        <div className="reservation-section">
          <h3 className="reservation-section-title">Externe</h3>
          <select
            name="transportExterne"
            className="reservation-select"
            value={reservationData.transportExterne}
            onChange={handleChange}
          >
            <option value="">Transport Disponible</option>
            {/* Ajouter les options dynamiques ici */}
          </select>
        </div>

        <div className="reservation-input-group">
          <input
            type="text"
            name="ligne"
            className="reservation-input"
            placeholder="La ligne"
            value={reservationData.ligne}
            onChange={handleChange}
          />
          <input
            type="date"
            name="datePriseCharge"
            className="reservation-input"
            value={reservationData.datePriseCharge}
            onChange={handleChange}
          />
          <input
            type="date"
            name="dateRetour"
            className="reservation-input"
            value={reservationData.dateRetour}
            onChange={handleChange}
          />
        </div>

        <div className="reservation-buttons">
          <button className="reservation-button reservation-cancel" onClick={onClose}>Annuler</button>
          <button className="reservation-button reservation-submit" onClick={handleSubmit}>Soumettre</button>
        </div>
      </div>
    </>
  );
};

export default Reserver;
