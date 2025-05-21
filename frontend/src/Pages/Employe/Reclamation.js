import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Reclamation.css";
import axios from "axios";

const Reclamation = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        
        if (!user) {
          window.location.href = '/LoginEmploye';
          return;
        }

        const response = await axios.get('http://localhost:5000/api/employe-data', {
          params: { 
            username: user.username,
            uidNumber: user.uidNumber
          }
        });

        setEmployeeData(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  const initialFormState = {
    dateVoyage: "",
    heurePrevue: "",
    heureReelle: "",
    categorie: "",
    description: "",
    consentement: false
  };

  const [formData, setFormData] = useState(initialFormState);

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const reclamationData = {
      ...formData,
      employeeId: employeeData?.id,
      employeeMatricule: employeeData?.ldap_id,
      employeeNom: employeeData?.nom,
      employeePrenom: employeeData?.prenom,
      employeeLigne: employeeData?.line_number ? `${employeeData.line_number} - ${employeeData.line_name}` : "",
      employeeArret: employeeData?.stop_name || "", // Nom de l'arrêt
      employeeStopPosition: employeeData?.stop_position || null // Position de l'arrêt
    };

    const response = await axios.post('http://localhost:5000/api/reclamations', reclamationData);
      if (response.status === 201) {
        setSubmitSuccess(true);
        setFormData(initialFormState);
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la réclamation:", error);
      setSubmitError(error.response?.data?.message || "Erreur lors de l'envoi de la réclamation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };
  
  const handleReset = () => {
    setFormData(initialFormState);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="empr">
          <Navbar />
          <div className="reclamation-container">
            <div className="loading">Chargement en cours...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="empr">
        <Navbar />
        <div className="reclamation-container">
          <h2 className="reclamation-title">Réclamation de service de transport</h2>
          
          {submitSuccess && (
            <div className="reclamation-alert success">
              Votre réclamation a été envoyée avec succès !
            </div>
          )}
          
          {submitError && (
            <div className="reclamation-alert error">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="reclamation-form">
            {/* Section Informations employé */}
            <div className="reclamation-section">
              <h3 className="reclamation-section-title">Mes informations</h3>
              
              <div className="form-group-row">
                <div className="form-group">
                  <label>Nom</label>
                  <div className="reclamation-input readonly">{employeeData?.nom || "-"}</div>
                </div>
                <div className="form-group">
                  <label>Prénom</label>
                  <div className="reclamation-input readonly">{employeeData?.prenom || "-"}</div>
                </div>
              </div>
              
              <div className="form-group-row">
                <div className="form-group">
                  <label>Matricule</label>
                  <div className="reclamation-input readonly">{employeeData?.ldap_id || "-"}</div>
                </div>
                <div className="form-group">
                  <label>Ligne assignée</label>
                  <div className="reclamation-input readonly">
                    {employeeData?.line_number && employeeData?.line_name 
                      ? `${employeeData.line_number} - ${employeeData.line_name}`
                      : "Non assignée"}
                      
                       {employeeData?.stop_name 
                       ?  ` ( Arrêt : ${employeeData.stop_name} )`
                       : "Non spécifié"}
                  </div>
                </div>
              </div>  
            </div>
  


            {/* Détails du voyage */}
            <div className="reclamation-section">
              <h3 className="reclamation-section-title">Détails du voyage</h3>
              
              <div className="form-group-row">
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
                  <option value="comportement">Comportement du chauffeur</option>
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
                <input 
                  type="checkbox" 
                  id="consentement" 
                  name="consentement" 
                  checked={formData.consentement}
                  onChange={handleChange}
                  required 
                />
                <label htmlFor="consentement">J'accepte le traitement de mes données personnelles*</label>
              </div>
            </div>

            <div className="reclamation-buttons">
              <button 
                type="button" 
                className="reclamation-button-secondary"
                onClick={handleReset}
                disabled={submitting}
              >
                Réinitialiser
              </button>
              <button 
                type="submit" 
                className="reclamation-button"
                disabled={submitting}
              >
                {submitting ? "Envoi en cours..." : "Envoyer la réclamation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Reclamation;