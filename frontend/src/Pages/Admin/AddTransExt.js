import React, { useState, useEffect } from "react";
import "./Addbus.css";
import "./AddTrans.css";
import { X } from 'lucide-react';

// Define API base URL here to match the one in TransportExterne.js
const API_BASE_URL = "http://localhost:5000";

const AddTransExt = ({ isOpen, onClose, onAddBus, busToEdit, companies, apiBaseUrl }) => {
  const [formData, setFormData] = useState({
    companyId: "",
    matricule: "",
    marque: "",
    modele: "",
    typeEng: "",
    couleur: "",
    kilometrage: "",
    nbPlaces: "", // Ajout du champ pour le nombre de places
    annee: new Date().getFullYear().toString(),
    chauffeurNom: "",
    chauffeurPrenom: "", 
    chauffeurMatricule: "",
    email: "",
    numero: "",
    photoChauffeur: null, // Ajout du champ pour la photo du chauffeur
    photoPreview: "", // Pour prévisualiser l'image
    nomutilisateur: "",
    motedepasse: "",
    statut: "Actif",
  });

  const [formErrors, setFormErrors] = useState({});
  const [formStep, setFormStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (busToEdit) {
      // Si nous modifions un bus existant, préservons la prévisualisation de l'image
      setFormData({
        ...busToEdit,
        photoPreview: busToEdit.photoChauffeurUrl || ""
      });
    } else {
      // Reset form with default values
      setFormData({
        companyId: companies && companies.length > 0 ? companies[0].id.toString() : "",
        matricule: "",
        marque: "",
        modele: "",
        typeEng: "",
        couleur: "",
        kilometrage: "",
        nbPlaces: "", // Nombre de places
        annee: new Date().getFullYear().toString(),
        chauffeurNom: "",
        chauffeurPrenom: "", 
        chauffeurMatricule: "",
        email: "",
        numero: "",
        photoChauffeur: null, // Photo du chauffeur
        photoPreview: "", // Prévisualisation
        nomutilisateur: "",
        motedepasse: "",
        statut: "Actif"
      });
    }
    setFormStep(1);
    
    setFormErrors({});
  }, [busToEdit, companies, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (formErrors[name]) {
      setFormErrors({...formErrors, [name]: null});
    }
  };

  // Fonction pour gérer le téléchargement d'image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        photoChauffeur: file,
        photoPreview: URL.createObjectURL(file)
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (formStep === 1) {
      if (!formData.companyId) errors.companyId = "Une entreprise doit être sélectionnée";
      if (!formData.matricule) errors.matricule = "La matricule est requise";
      if (!formData.marque) errors.marque = "La marque est requise";
      if (!formData.modele) errors.modele = "Le modèle est requis";
      // Validation optionnelle pour le nombre de places
    } else if (formStep === 2) {
      if (!formData.chauffeurNom) errors.chauffeurNom = "Le nom du chauffeur est requis";
      if (!formData.chauffeurPrenom) errors.chauffeurPrenom = "Le prénom du chauffeur est requis";
      if (!formData.email) errors.email = "L'email est requis";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Format d'email invalide";
      if (!formData.numero) errors.numero = "Le numéro est requis";
    } else if (formStep === 3) {
      // Les validations pour la date ont été retirées car les champs ont été déplacés
      // Mais on peut ajouter d'autres validations pour cette étape si nécessaire
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setFormStep(formStep + 1);
    }
  };

  const handlePrevious = () => {
    setFormStep(formStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddBus(formData);
        // Reset form after successful submission
        setFormData({
          companyId: companies && companies.length > 0 ? companies[0].id.toString() : "",
          matricule: "",
          marque: "",
          modele: "",
          typeEng: "",
          couleur: "",
          kilometrage: "",
          nbPlaces: "", // Nombre de places
          annee: new Date().getFullYear().toString(),
          chauffeurNom: "",
          chauffeurPrenom: "",
          chauffeurMatricule: "",
          email: "",
          numero: "",
          photoChauffeur: null, // Photo du chauffeur
          photoPreview: "", // Prévisualisation
          nomutilisateur: "",
          motedepasse: "",
          statut: "Actif"
        });
      } catch (error) {
        console.error("Erreur lors de la soumission:", error);
        alert(`Une erreur est survenue: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const renderFormStep = () => {
    switch (formStep) {
      case 1:
        return (
          <div className="bus-form-grid">
            <div className="bus-form-group">
              <label className="bus-label">Entreprise</label>
              <div className="company-select-container">
                <select 
                  name="companyId" 
                  className={`bus-input ${formErrors.companyId ? 'error' : ''}`}
                  value={formData.companyId} 
                  onChange={handleChange}
                  disabled={companies.length === 0}
                >
                  {companies.length === 0 ? (
                    <option value="">Aucune entreprise disponible</option>
                  ) : (
                    companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))
                  )}
                </select>
                 
              </div>
              {formErrors.companyId && <span className="error-message">{formErrors.companyId}</span>}
              
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Matricule</label>
              <input 
                type="text" 
                name="matricule" 
                className={`bus-input ${formErrors.matricule ? 'error' : ''}`}
                value={formData.matricule} 
                onChange={handleChange} 
                placeholder="ex: 1546.."
                readOnly={busToEdit !== null} 
              />
              {formErrors.matricule && <span className="error-message">{formErrors.matricule}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Marque</label>
              <input 
                type="text" 
                name="marque" 
                className={`bus-input ${formErrors.marque ? 'error' : ''}`}
                value={formData.marque} 
                onChange={handleChange} 
                placeholder="ex: Toyota"
              />
              {formErrors.marque && <span className="error-message">{formErrors.marque}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Modèle</label>
              <input 
                type="text" 
                name="modele" 
                className={`bus-input ${formErrors.modele ? 'error' : ''}`}
                value={formData.modele} 
                onChange={handleChange} 
                placeholder="ex: master"
              />
              {formErrors.modele && <span className="error-message">{formErrors.modele}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Type de moteur</label>
              <input 
                type="text" 
                name="typeEng" 
                className="bus-input"
                value={formData.typeEng} 
                onChange={handleChange} 
                placeholder="ex: Diesel"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Couleur</label>
              <input 
                type="text" 
                name="couleur" 
                className="bus-input"
                value={formData.couleur} 
                onChange={handleChange} 
                placeholder="ex: Blanc"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Nombre de sièges</label>
              <input 
                type="number" 
                name="nbPlaces" 
                className="bus-input"
                value={formData.nbPlaces} 
                onChange={handleChange} 
                placeholder="ex: 50"
                min="1"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Année</label>
              <input 
                type="number" 
                name="annee" 
                className="bus-input"
                value={formData.annee} 
                onChange={handleChange} 
                placeholder={new Date().getFullYear().toString()}
                min="1900"
                max="2100"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Kilométrage</label>
              <input 
                type="number" 
                name="kilometrage" 
                className="bus-input"
                value={formData.kilometrage} 
                onChange={handleChange} 
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="bus-form-grid">
            <div className="bus-form-group">
              <label className="bus-label">Nom du chauffeur</label>
              <input 
                type="text" 
                name="chauffeurNom" 
                className={`bus-input ${formErrors.chauffeurNom ? 'error' : ''}`}
                value={formData.chauffeurNom} 
                onChange={handleChange} 
                placeholder="Nom du chauffeur"
              />
              {formErrors.chauffeurNom && <span className="error-message">{formErrors.chauffeurNom}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Prénom du chauffeur</label>
              <input 
                type="text" 
                name="chauffeurPrenom" 
                className={`bus-input ${formErrors.chauffeurPrenom ? 'error' : ''}`}
                value={formData.chauffeurPrenom} 
                onChange={handleChange} 
                placeholder="Prénom du chauffeur"
              />
              {formErrors.chauffeurPrenom && <span className="error-message">{formErrors.chauffeurPrenom}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Matricule du chauffeur</label>
              <input 
                type="text" 
                name="chauffeurMatricule" 
                className="bus-input"
                value={formData.chauffeurMatricule} 
                onChange={handleChange} 
                placeholder="Numéro d'identification"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Email</label>
              <input 
                type="email" 
                name="email" 
                className={`bus-input ${formErrors.email ? 'error' : ''}`}
                value={formData.email} 
                onChange={handleChange} 
                placeholder="mail de chauffeur"
              />
              {formErrors.email && <span className="error-message">{formErrors.email}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Numéro de téléphone</label>
              <input 
                type="text" 
                name="numero" 
                className={`bus-input ${formErrors.numero ? 'error' : ''}`}
                value={formData.numero} 
                onChange={handleChange} 
                placeholder="00000"
              />
              {formErrors.numero && <span className="error-message">{formErrors.numero}</span>}
            </div>

            <div className="bus-form-group photo-upload">
              <label className="bus-label">Photo du chauffeur</label>
              <div className="photo-input-container">
                <input 
                  type="file" 
                  id="photoChauffeur"
                  name="photoChauffeur" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="photo-input"
                />
                <label htmlFor="photoChauffeur" className="photo-upload-label">
                  Choisir une photo
                </label>
              </div>
              {formData.photoPreview && (
                <div className="photo-preview">
                  <img src={formData.photoChauffeur ? formData.photoPreview : `${API_BASE_URL}${formData.photoPreview}`}   alt="Aperçu" className="preview-image" />
                </div>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="bus-form-grid">
            <div className="bus-form-group">
              <label className="bus-label">Nom d'utilisateur</label>
              <input 
                type="text" 
                name="nomutilisateur" 
                className="bus-input"
                value={formData.nomutilisateur} 
                onChange={handleChange} 
                placeholder="Nom de connexion"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Mot de passe</label>
              <input 
                type="password" 
                name="motedepasse" 
                className="bus-input"
                value={formData.motedepasse} 
                onChange={handleChange} 
                placeholder="Mot de passe"
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Statut</label>
              <select 
                name="statut" 
                className="bus-input"
                value={formData.statut} 
                onChange={handleChange}
              >
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bus-modal-overlay">
      <div className="bus-modal-content">
        <div className="modal-header">
          <h2>{busToEdit ? "Modifier un transport" : "Ajouter un transport"}</h2>
          <button className="close-button" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <div className="form-steps">
          <div className={`step ${formStep === 1 ? 'active' : ''} ${formStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-title">Véhicule</div>
          </div>
          <div className={`step-line ${formStep > 1 ? 'completed' : ''}`}></div>
          <div className={`step ${formStep === 2 ? 'active' : ''} ${formStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-title">Chauffeur</div>
          </div>
          <div className={`step-line ${formStep > 2 ? 'completed' : ''}`}></div>
          <div className={`step ${formStep === 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-title">Détails</div>
          </div>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e);}} className="bus-form">
          {renderFormStep()}
          
          <div className="bus-form-buttons">
            {formStep > 1 && (
              <button type="button" className="bus-btn-previous" onClick={handlePrevious}>
                Précédent
              </button>
            )}
            
            {formStep < 3 ? (
              <button type="button" className="bus-btn-next" onClick={handleNext}>
                Suivant
              </button>
            ) : (
              <button 
                type="button"  
                className="bus-btn-submit"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {busToEdit ? "Modifier" : "Ajouter"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransExt;