import React, { useState } from "react";
import { X } from "lucide-react";
import "./TransportExterne.css";
import "./Addbus.css";

const AddCompanyModal = ({ isOpen, onClose, onAddCompany }) => {
  const [companyName, setCompanyName] = useState('');
  const [contractStart, setContractStart] = useState(new Date().toISOString().split('T')[0]);
  const [contractEnd, setContractEnd] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      alert('Le nom de l\'entreprise est obligatoire');
      return;
    }

    if (!contractStart || !contractEnd) {
      alert('Les dates de début et de fin du contrat sont obligatoires');
      return;
    }

    const startDate = new Date(contractStart);
    const endDate = new Date(contractEnd);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert('Format de date invalide');
      return;
    }
    
    if (startDate > endDate) {
      alert('La date de fin doit être postérieure à la date de début');
      return;
    }

    onAddCompany({
      name: companyName,
      contract_start: contractStart,
      contract_end: contractEnd
    });
    
    // Réinitialiser le formulaire
    setCompanyName('');
    setContractStart(new Date().toISOString().split('T')[0]);
    setContractEnd(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="bus-modal-overlay">
      <div className="bus-modal-content">
        <div className="tranext-modal-header">
          <h3>Ajouter une entreprise</h3>
          <button className="tranext-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="tranext-company-form">
          <div className="tranext-form-group">
            <label htmlFor="companyName">Nom de l'entreprise*</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de l'entreprise"
              required
            />
          </div>
          
          <div className="tranext-form-row">
            <div className="tranext-form-group">
              <label htmlFor="contractStart">Date début contrat*</label>
              <div className="tranext-date-input">
                <input 
                  type="date" 
                  id="contractStart"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="tranext-form-group">
              <label htmlFor="contractEnd">Date fin contrat*</label>
              <div className="tranext-date-input">
                <input 
                  type="date" 
                  id="contractEnd"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="bus-form-buttons">
            <button type="button" onClick={onClose} className="bus-btn-cancel">
              Annuler
            </button>
            <button type="submit" className="bus-btn-submit">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;