import React, { useState, useEffect } from "react";
import "./Addbus.css";

const AddBus = ({ isOpen, onClose, onAddBus, busToEdit }) => {
  const [formData, setFormData] = useState({
    id: "",
    matricule: "",
    mark: "",
    model: "",
    typeEng: "",
    couleur: "",
    type: "",
    annee: "",
    kilometrage: "",
    nb_places:"",
    statue: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (busToEdit) {
      setFormData(busToEdit);
    } else {
      // Reset form when adding a new bus
      setFormData({
        id: "",
        matricule: "",
        mark: "",
        model: "",
        typeEng: "",
        couleur: "",
        type: "",
        annee: "",
        kilometrage: "",
        nb_places:"",
        statue: "disponible"
      });
    }
    setErrors({});
  }, [busToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.matricule.trim()) {
      newErrors.matricule = "Matricule est obligatoire";
    }
    
    if (!formData.mark.trim()) {
      newErrors.mark = "Marque est obligatoire";
    }
    
    if (!formData.model.trim()) {
      newErrors.model = "Modèle est obligatoire";
    }
    
    if (!formData.typeEng.trim()) {
      newErrors.typeEng = "Type d'énergie est obligatoire";
    }
    
    if (!formData.type.trim()) {
      newErrors.type = "Type est obligatoire";
    }
    
    if (formData.annee && (isNaN(formData.annee) || parseInt(formData.annee) < 1900 || parseInt(formData.annee) > new Date().getFullYear())) {
      newErrors.annee = "Année invalide";
    }
    
    if (formData.kilometrage && (isNaN(formData.kilometrage) || parseInt(formData.kilometrage) < 0)) {
      newErrors.kilometrage = "Kilométrage invalide";
    }
    if (formData.nb_places && (isNaN(formData.nb_places) || parseInt(formData.nb_places) < 0)) {
      newErrors.nb_places = "nb_places invalide";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert string numbers to integers
      const processedData = {
        ...formData,
        annee: formData.annee ? parseInt(formData.annee) : null,
        kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : 0
      };
      
      onAddBus(processedData);
    }
  };

  return (
    <div className="bus-modal-overlay">
      <div className="bus-modal-content">
        <h2>{busToEdit ? "Modifier un bus" : "Ajouter un bus"}</h2>
        
        <form onSubmit={handleSubmit} className="bus-form">
          <div className="bus-form-grid">
            {/* Le champ ID est caché car géré automatiquement */}
            {busToEdit && (
              <input 
                type="hidden" 
                name="id" 
                value={formData.id} 
              />
            )}
            
            <div className="bus-form-group">
              <label className="bus-label">Matricule</label>
              <input 
                type="text" 
                name="matricule" 
                className={`bus-input ${errors.matricule ? "input-error" : ""}`}
                value={formData.matricule} 
                onChange={handleChange} 
                required 
              />
              {errors.matricule && <span className="error-text">{errors.matricule}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Modèle</label>
              <input 
                type="text" 
                name="model" 
                className={`bus-input ${errors.model ? "input-error" : ""}`}
                value={formData.model} 
                onChange={handleChange} 
                required 
              />
              {errors.model && <span className="error-text">{errors.model}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Marque</label>
              <input 
                type="text" 
                name="mark" 
                className={`bus-input ${errors.mark ? "input-error" : ""}`}
                value={formData.mark} 
                onChange={handleChange} 
                required 
              />
              {errors.mark && <span className="error-text">{errors.mark}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Couleur</label>
              <input 
                type="text" 
                name="couleur" 
                className="bus-input"
                value={formData.couleur} 
                onChange={handleChange} 
              />
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Type Énergie</label>
              <input 
                type="text" 
                name="typeEng" 
                className={`bus-input ${errors.typeEng ? "input-error" : ""}`}
                value={formData.typeEng} 
                onChange={handleChange} 
                required 
              />
              {errors.typeEng && <span className="error-text">{errors.typeEng}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Type</label>
              <input 
                type="text" 
                name="type" 
                className={`bus-input ${errors.type ? "input-error" : ""}`}
                value={formData.type} 
                onChange={handleChange} 
                required 
              />
              {errors.type && <span className="error-text">{errors.type}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Année</label>
              <input 
                type="number" 
                name="annee" 
                className={`bus-input ${errors.annee ? "input-error" : ""}`}
                value={formData.annee} 
                onChange={handleChange} 
              />
              {errors.annee && <span className="error-text">{errors.annee}</span>}
            </div>

            <div className="bus-form-group">
              <label className="bus-label">Kilométrage</label>
              <input 
                type="number" 
                name="kilometrage" 
                className={`bus-input ${errors.kilometrage ? "input-error" : ""}`}
                value={formData.kilometrage} 
                onChange={handleChange}
              />
              {errors.kilometrage && <span className="error-text">{errors.kilometrage}</span>}
            </div>
            <div className="bus-form-group">
              <label className="bus-label">nb_places</label>
              <input 
                type="number" 
                name="nb_places" 
                className={`bus-input ${errors.nb_places ? "input-error" : ""}`}
                value={formData.nb_places} 
                onChange={handleChange}
              />
              {errors.nb_places&& <span className="error-text">{errors.nb_places}</span>}
            </div>
          </div>

          <div className="bus-form-buttons">
            <button type="button" className="bus-btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="bus-btn-submit">
              {busToEdit ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBus;