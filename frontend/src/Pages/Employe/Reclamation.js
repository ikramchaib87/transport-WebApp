import React, { useState } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Reclamation.css";

const Reclamation = () => {
  const initialFormState =({
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    dateVoyage: "",
    heurePrevue: "",
    heureReelle: "",
    numeroTrajet: "",
    categorie: "",
    description: "",
  });

  const [formData, setFormData] = useState(initialFormState);
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Réclamation soumise :", formData);
    alert("Réclamation envoyée !");
    // Réinitialiser le formulaire après soumission
    setFormData({
      nom: "",
      email: "",
      telephone: "",
      adresse: "",
      dateVoyage: "",
      heurePrevue: "",
      heureReelle: "",
      numeroTrajet: "",
      depart: "",
      arrivee: "",
      categorie: "",
      description: "",
      fichiers: null
    });
  };
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "file" ? files[0] : value
    }));
  };
  
  // Fonction pour réinitialiser le formulaire
 
  const handleReset = () => {
    setFormData(initialFormState);
    // Réinitialiser également les champs de fichier
    const fileInput = document.getElementById("fichiers");
    if (fileInput) {
      fileInput.value = "";
    }
  };
  return (
    <div>
      <Header />
      <div className="empr">
        <Navbar />
        <div className="reclamation-container">
          <h2 className="reclamation-title">Réclamation de service de transport</h2>
          
          <form onSubmit={handleSubmit} className="reclamation-form">
            {/* Informations personnelles */}
            <div className="reclamation-section">
              <h3 className="reclamation-section-title">Informations personnelles</h3>
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="nom">Nom et prénom*</label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    placeholder="Votre nom complet"
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email*</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    placeholder="votre@email.com"
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="telephone">Numéro de téléphone*</label>
                  <input
                    type="tel"
                    id="telephone"
                    name="telephone"
                    value={formData.telephone}
                    placeholder="Ex: 0123456789"
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="adresse">Adresse complète*</label>
                  <input
                    type="text"
                    id="adresse"
                    name="adresse"
                    value={formData.adresse}
                    placeholder="Votre adresse"
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Détails du voyage */}
            <div className="reclamation-section">
              <h3 className="reclamation-section-title">Détails du voyage</h3>
              
                <div className="form-group">
                  <label htmlFor="dateVoyage">Date du voyage*</label>
                  <input
                    type="date"
                    id="dateVoyage"
                    name="dateVoyage"
                    value={formData.dateVoyage}
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                
                <div className="form-group">
                  <label htmlFor="numeroTrajet">Numéro de la ligne</label>
                  <input
                    type="text"
                    id="numeroTrajet"
                    name="numeroTrajet"
                    value={formData.numeroTrajet}
                    placeholder="Ex: Bus ligne 42"
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
                </div>
              </div>
              
                <div className="form-group">
                  <label htmlFor="heureReelle">Heure réelle*</label>
                  <input
                    type="time"
                    id="heureReelle"
                    name="heureReelle"
                    value={formData.heureReelle}
                    required
                    className="reclamation-input"
                    onChange={handleChange}
                  />
              </div>
            </div>

            {/* Nature de la réclamation */}
            <div className="reclamation-section">
              <h3 className="reclamation-section-title">Nature de la réclamation</h3>
              <div className="form-group">
                <label htmlFor="categorie">Catégorie*</label>
                <select
                  id="categorie"
                  name="categorie"
                  value={formData.categorie}
                  required
                  className="reclamation-select"
                  onChange={handleChange}
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="retard">Retard</option>
                  <option value="annulation">Annulation</option>
                  <option value="service">Service client</option>
                  <option value="etatVehicule">État du véhicule</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description détaillée*</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  placeholder="Décrivez votre problème en détail..."
                  required
                  className="reclamation-textarea"
                  onChange={handleChange}
                ></textarea>
              </div>
              
            </div>

            <div className="reclamation-checkbox-group">
              <div className="reclamation-checkbox">
                <input type="checkbox" id="consentement" name="consentement" required />
                <label htmlFor="consentement">J'accepte le traitement de mes données personnelles conformément à la politique de confidentialité*</label>
              </div>
            </div>

            <div className="reclamation-buttons">
            <button 
                type="button" 
                className="reclamation-button-secondary"
                onClick={handleReset}
              >
                Réinitialiser
              </button>
              <button type="submit" className="reclamation-button">
                Envoyer la réclamation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Reclamation;