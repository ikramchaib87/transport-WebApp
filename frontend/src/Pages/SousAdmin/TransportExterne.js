import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import "./TransportExterne.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";
import AddTransExt from "./AddTransExt";
import AddCompanyModal from "./AddCompanyModal"; 
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";

// API
const API_BASE_URL = "http://localhost:5000";

const TransportExtTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState('all');
  const [busToEdit, setBusToEdit] = useState(null);
  const [showHeaders, setShowHeaders] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCompanyInput] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [buses, setBuses] = useState([]);
  
  // Added filter states
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Format la date en YYYY-MM-DD en utilisant les composants locaux
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Initial data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, busesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/companies`),
          fetch(`${API_BASE_URL}/api/external-buses`)
        ]);
        
        if (!companiesRes.ok || !busesRes.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const companiesData = await companiesRes.json();
        const busesData = await busesRes.json();
        
        setCompanies(companiesData);
        setBuses(busesData);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Erreur de chargement des données. Veuillez réessayer.');
      }
    };
    
    fetchData();
  }, []);

  // Add bus handling
  const handleAddBus = async (newBus) => {
    try {
      // Map frontend field names to backend field names
      const requestBody = {
        company_id: parseInt(newBus.companyId) || 1,
        matricule: newBus.matricule,
        marque: newBus.marque,
        modele: newBus.modele,
        type_eng: newBus.typeEng,
        couleur: newBus.couleur,
        kilometrage: parseInt(newBus.kilometrage) || 0,
        nb_places: parseInt(newBus.nbPlaces) || 0, // Added nbPlaces
        annee: parseInt(newBus.annee) || new Date().getFullYear(),
        chauffeur_nom: newBus.chauffeurNom,
        chauffeur_prenom: newBus.chauffeurPrenom,
        chauffeur_matricule: newBus.chauffeurMatricule,
        email: newBus.email,
        telephone: newBus.numero,
        username: newBus.nomutilisateur,
        password: newBus.motedepasse,
        statut: newBus.statut || 'Actif'
      };

      // Handle photo if provided
      const formData = new FormData();
      for (const key in requestBody) {
        formData.append(key, requestBody[key]);
      }
      
      if (newBus.photoChauffeur) {
        formData.append('photo_chauffeur', newBus.photoChauffeur);
      }

      // Validate required fields
      if (!requestBody.matricule || !requestBody.marque || !requestBody.modele) {
        throw new Error('Matricule, marque et modèle sont obligatoires');
      }

      const method = busToEdit ? 'PUT' : 'POST';
      const url = busToEdit 
        ? `${API_BASE_URL}/api/external-buses/${busToEdit.id}`
        : `${API_BASE_URL}/api/external-buses`;

      const response = await fetch(url, {
        method,
        body: formData, // Use FormData instead of JSON
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      const savedBus = result.bus;
            
      if (busToEdit) {
        setBuses(buses.map(bus => bus.id === busToEdit.id ? savedBus : bus));
      } else {
        setBuses([...buses, savedBus]);
      }
      
      setIsModalOpen(false);
      setBusToEdit(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  // Bus deletion handling
  const handleDeleteBus = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bus?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/external-buses/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        setBuses(buses.filter(bus => bus.id !== id));
      } catch (error) {
        console.error('Erreur:', error);
        alert(`Erreur lors de la suppression: ${error.message}`);
      }
    }
  };

  const handleEditBus = (bus) => {
    // Transform database field names to form field names
    const editableBus = {
      id: bus.id,
      companyId: bus.company_id.toString(),
      matricule: bus.matricule,
      marque: bus.marque,
      modele: bus.modele,
      typeEng: bus.type_eng,
      couleur: bus.couleur,
      kilometrage: bus.kilometrage,
      nbPlaces: bus.nb_places || "", // Added nbPlaces
      annee: bus.annee,
      chauffeurNom: bus.chauffeur_nom,
      chauffeurPrenom: bus.chauffeur_prenom,
      chauffeurMatricule: bus.chauffeur_matricule,
      email: bus.email,
      numero: bus.telephone,
      photoChauffeurUrl: bus.photo_chauffeur_url, // Added photo URL
      nomutilisateur: bus.username,
      motedepasse: bus.password,
      statut: bus.statut
    };
    setBusToEdit(editableBus);
    setIsModalOpen(true);
  };

  const toggleCompany = (companyId) => {
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(companyId);
    }
  };

  const toggleHeaders = () => {
    setShowHeaders(!showHeaders);
  };

  // Company addition handling
  const handleAddCompany = async (companyData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyData.name,
          contract_start: companyData.contract_start,
          contract_end: companyData.contract_end
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'ajout');
      }

      setCompanies([...companies, result.company]);
      setIsAddCompanyModalOpen(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur lors de l'ajout de l'entreprise: ${error.message}`);
    }
  };

  // Company deletion handling
  const handleDeleteCompany = async (companyId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise et tous ses bus?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de la suppression');
        }

        setCompanies(companies.filter(c => c.id !== companyId));
        setBuses(buses.filter(b => b.company_id !== companyId));
      } catch (error) {
        console.error('Erreur:', error);
        alert(`Erreur lors de la suppression: ${error.message}`);
      }
    }
  };

  // Updated filter logic to include all filters
  const filteredBuses = buses.filter(bus => {
    // Start with filtering by search term
    if (searchTerm && !bus.matricule.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !bus.marque.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !bus.modele.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(bus.chauffeur_nom && bus.chauffeur_nom.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !(bus.email && bus.email.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    
    // Filter by company
    if (filterCompany && bus.company_id.toString() !== filterCompany) {
      return false;
    }
    
    // Filter by status
    if (filterStatus && (bus.statut || 'Actif').toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    
    // Get company for contract date filtering
    const company = companies.find(c => c.id === bus.company_id);
    
    // Filter by start date
    if (filterStartDate && company && company.contract_start) {
      const filterDate = new Date(filterStartDate);
      const contractDate = new Date(company.contract_start);
      if (contractDate < filterDate) {
        return false;
      }
    }
    
    // Filter by end date
    if (filterEndDate && company && company.contract_end) {
      const filterDate = new Date(filterEndDate);
      const contractDate = new Date(company.contract_end);
      if (contractDate > filterDate) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div>
      <Header />
      <div className="ad">
        <Navbar />
        <div className="ad-container">
          <h2 className="title">
            <span className="underline">Transport Externe</span>
          </h2>
          
          <div className="tranext-actions">
            <div className="tranext-search-bar">
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="tranext-search-icon">
                <img src={search} alt="search" />
              </button>
              <button className="tranext-add-bus-btn" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} />
                <span>Ajouter un Transport</span>
              </button>
              <button 
                className="tranext-add-company-btn" 
                onClick={() => setIsAddCompanyModalOpen(true)}
              >
                <Plus size={16} />
                <span>Ajouter une Entreprise</span>
              </button>
              <button className="tranext-toggle-headers-btn" onClick={toggleHeaders}>
                {showHeaders ? (
                  <>
                    <X size={16} />
                    <span>Masquer les en-têtes</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Afficher les en-têtes</span>
                  </>
                )}
              </button>
            </div>
            {showAddCompanyInput && (
              <div className="tranext-add-company-container">
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nom de la nouvelle entreprise"
                  className="tranext-input"
                />
                <button 
                  type="button"
                  className="tranext-confirm-add-company-btn"
                  onClick={handleAddCompany}
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>
          
          <div className="tranext-filters-grid">
            <div className="tranext-filter-item">
              <label>Entreprise de transport</label>
              <select 
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
              >
                <option value="">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="tranext-filter-item">
              <label>Date début contrat</label>
              <div className="tranext-date-input">
                <input 
                  type="date" 
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="tranext-filter-item">
              <label>Date fin contrat</label>
              <div className="tranext-date-input">
                <input 
                  type="date" 
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="tranext-filter-item">
              <label>Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>
          
          <div className="tranext-filter-actions">
            <p className="total">
              Nombre total : <span className="count">{filteredBuses.length}</span>
            </p>
          </div>

          {showHeaders && companies.map(company => {
            const companyBuses = filteredBuses.filter(item => item.company_id === company.id);
            const isExpanded = expandedCompany === company.id;
            
            if (companyBuses.length === 0) return null;
            
            return (
              <div key={company.id} className="tranext-company-container">
                <div 
                  className="tranext-company-header"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="tranext-company-info">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <span className="tranext-company-name">{company.name}</span>
                    <span className="tranext-bus-count">{companyBuses.length} bus</span>
                  </div>
                  <div className="tranext-company-actions">
                    <div className="tranext-contract-dates">
                      <span>Contrat du {formatDate(company.contract_start)} au {formatDate(company.contract_end)}</span>
                    </div>
                    <button 
                      className="tranext-delete-company-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompany(company.id);
                      }}
                    >
                      <img src={Delete} alt="delete" />
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="tranext-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Informations Bus</th>
                          <th>Informations Chauffeur</th>
                          <th>Statue</th>
                          <th>Accès</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyBuses.map(bus => (
                          <tr key={bus.id}>
                            <td className="tranext-bus-info">
                              <div className="tranext-info-main">{bus.marque} {bus.modele}</div>
                              <div className="tranext-info-details">Matricule: {bus.matricule}</div>
                              <div className="tranext-info-details">Type: {bus.type_eng}</div>
                              <div className="tranext-info-details">Couleur: {bus.couleur}</div>
                              <div className="tranext-info-details">Kilométrage: {bus.kilometrage} km</div>
                              {/* Ajout du nombre de places */}
                              <div className="tranext-info-details">Places: {bus.nb_places || "-"}</div>
                            </td>
                            <td className="tranext-chauffeur-info">
                              {/* Ajout de la photo du chauffeur */}
                              {bus.photo_chauffeur_url && (
                                <div className="tranext-chauffeur-photo">
                                  <img 
                                    src= {`${API_BASE_URL}${bus.photo_chauffeur_url}`} 
                                    alt="Chauffeur du bus" 
                                    className="chauffeur-photo"
                                  />
                                </div>
                              )}
                              <div className="tranext-info-main">{bus.chauffeur_nom} {bus.chauffeur_prenom ? bus.chauffeur_prenom : ''}</div>
                              <div className="tranext-info-details">Matricule: {bus.chauffeur_matricule}</div>
                              <div className="tranext-info-details">Email: {bus.email}</div>
                              <div className="tranext-info-details">Tél: {bus.telephone}</div>
                            </td>
                            <td className="tranext-contrat-info">
                              <div className="tranext-status">
                                <span className={`tranext-status-badge ${bus.statut === 'Actif' ? 'tranext-active' : 'tranext-inactive'}`}>
                                  {bus.statut}
                                </span>
                              </div>
                            </td>
                            <td className="tranext-access-info">
                              <div className="tranext-info-details">
                                <span className="tranext-label">Utilisateur:</span> {bus.username}
                              </div>
                              <div className="tranext-info-details">
                                <span className="tranext-label">Mot de passe:</span> ••••••••
                              </div>
                            </td>
                            <td className="tranext-actions-cell">
                              <button onClick={() => handleEditBus(bus)} className="tranext-edit-btn">
                                <img src={edit} alt="edit" />
                              </button>
                              <button onClick={() => handleDeleteBus(bus.id)} className="tranext-delete-btn">
                                <img src={Delete} alt="delete" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {!showHeaders && (
            <div className="tranext-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Informations Bus</th>
                    <th>Informations Chauffeur</th>
                    <th>Statue</th>
                    <th>Accès</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuses.map(bus => {
                    const company = companies.find(comp => comp.id === bus.company_id);
                    return (
                      <tr key={bus.id}>
                        <td className="tranext-bus-info">
                          <div className="tranext-info-main">{bus.marque} {bus.modele}</div>
                          <div className="tranext-info-details">Matricule: {bus.matricule}</div>
                          <div className="tranext-info-details">Type: {bus.type_eng}</div>
                          <div className="tranext-info-details">Couleur: {bus.couleur}</div>
                          <div className="tranext-info-details">Kilométrage: {bus.kilometrage} km</div>
                          {/* Ajout du nombre de places */}
                          <div className="tranext-info-details">Places: {bus.nb_places || "-"}</div>
                          <div className="tranext-info-details tranext-company-tag">
                            Entreprise: {company?.name}
                          </div>
                        </td>
                        <td className="tranext-chauffeur-info">
                          {/* Ajout de la photo du chauffeur */}
                          {bus.photo_chauffeur_url && (
                            <div className="tranext-chauffeur-photo">
                              <img 
                                src= {`${API_BASE_URL}${bus.photo_chauffeur_url}`}  
                                alt="Chauffeur du bus" 
                                className="chauffeur-photo"
                              />
                            </div>
                          )}
                          <div className="tranext-info-main">{bus.chauffeur_nom} {bus.chauffeur_prenom ? bus.chauffeur_prenom : ''}</div>
                          <div className="tranext-info-details">Matricule: {bus.chauffeur_matricule}</div>
                          <div className="tranext-info-details">Email: {bus.email}</div>
                          <div className="tranext-info-details">Tél: {bus.telephone}</div>
                        </td>
                        <td className="tranext-contrat-info">
                          <div className="tranext-status">
                            <span className={`tranext-status-badge ${bus.statut === 'Actif' ? 'tranext-active' : 'tranext-inactive'}`}>
                              {bus.statut}
                            </span>
                          </div>
                        </td>
                        <td className="tranext-access-info">
                          <div className="tranext-info-details">
                            <span className="tranext-label">Utilisateur:</span> {bus.username}
                          </div>
                          <div className="tranext-info-details">
                            <span className="tranext-label">Mot de passe:</span> ••••••••
                          </div>
                        </td>
                        <td className="tranext-actions-cell">
                          <button onClick={() => handleEditBus(bus)} className="tranext-edit-btn">
                            <img src={edit} alt="edit" />
                          </button>
                          <button onClick={() => handleDeleteBus(bus.id)} className="tranext-delete-btn">
                            <img src={Delete} alt="delete" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        <AddCompanyModal
            isOpen={isAddCompanyModalOpen}
            onClose={() => setIsAddCompanyModalOpen(false)}
            onAddCompany={handleAddCompany}
          />

          <AddTransExt
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setBusToEdit(null);
            }}
            onAddBus={handleAddBus}
            busToEdit={busToEdit}
            companies={companies}
            setCompanies={setCompanies}
            apiBaseUrl={API_BASE_URL}
          />
        </div>
      </div>
    </div>
  );
};

export default TransportExtTable;