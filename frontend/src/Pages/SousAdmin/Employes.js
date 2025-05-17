import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import viewDetails from "../../icons/view.png";
import search from "../../icons/search.png";
const EmplyTable = () => {
    const [employes, setEmployes] = useState([]);
    const [filteredEmployes, setFilteredEmployes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedEmploye, setSelectedEmploye] = useState(null);
    
    useEffect(() => {
        const fetchEmployes = async () => {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:5000/api/employes');
                const { success, employes } = await res.json();
                
                if (success) {
                    setEmployes(employes);
                    setFilteredEmployes(employes);
                }
            } catch (error) {
                console.error("Erreur:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployes();
    }, []);

    const handleSearch = (term) => {
        setSearchTerm(term);
        if (!term) {
            setFilteredEmployes(employes);
            return;
        }
        
        const filtered = employes.filter(e =>
            [e.nom, e.prenom, e.ldap_id, e.email, e.commune, e.wilaya, e.line_name]
                .some(field => field?.toLowerCase().includes(term.toLowerCase()))
        );
        setFilteredEmployes(filtered);
    };

    return (
        <div >
            <Header/> 
            <div className="ad">
                <Navbar/>
                <div className="ad-container">
                   <h2 className="title"> <span className="underline">Employes</span> </h2>
                      <br />
                <p className="total">nombre total : <span className="count">{employes.length}</span></p>
                
                    <div className="search-bar">
                                        <input 
                                            type="text" 
                                            placeholder="Search" 
                                            value={searchTerm}
                                            onChange={handleSearch}
                                        />
                                        <button>
                                            <img src={search} alt="Rechercher" />
                                        </button>
                                    </div>


                   
                         <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Matricule</th>
                                    <th>Nom</th>
                                    <th>Prénom</th>
                                    <th>Commune/Wilaya</th>
                                    <th>Ligne</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="loading">Chargement...</td>
                                    </tr>
                                ) : filteredEmployes.length > 0 ? (
                                    filteredEmployes.map((e, i) => (
                                        <tr key={e.ldap_id} className={i % 2 ? 'even' : 'odd'}>
                                        
                                            <td>{e.ldap_id}</td>
                                            <td>{e.nom}</td>
                                            <td>{e.prenom}</td>
                                            <td>
                                                <div>{e.commune} / {e.wilaya}</div>
                                                
                                            </td>
                                            <td>
                                                {e.line_number 
                                                    ? `Ligne ${e.line_number} - ${e.line_name}`
                                                    : '-'}
                                            </td>
                                             <td className="action-buttons"> 
                                                <img 
                                                src={viewDetails} 
                                                alt="Voir détails" 
                                                title="Voir les détails"
                                                onClick={() => setSelectedEmploye(e)}
                                                />
                                                
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7">Aucun employé trouvé</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>


                    {/* Modal des détails */}
                    {selectedEmploye && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h3>Détails de l'employé</h3>
                                    <button 
                                        className="close-btn"
                                        onClick={() => setSelectedEmploye(null)}
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div className="modal-body">
                                    <div className="employe-details">
                                        <div className="photo-section">
                                            {selectedEmploye.photo_url ? (
                                                <img 
                                                    src={`http://localhost:5000${selectedEmploye.photo_url}`} 
                                                    alt={`${selectedEmploye.nom} ${selectedEmploye.prenom}`}
                                                    className="detail-photo"
                                                />
                                            ) : (
                                                <div className="photo-placeholder large">
                                                    {selectedEmploye.nom.charAt(0)}{selectedEmploye.prenom.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="info-section">
                                            <div className="info-row">
                                                <span className="label">Matricule:</span>
                                                <span>{selectedEmploye.ldap_id}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Nom:</span>
                                                <span>{selectedEmploye.nom} {selectedEmploye.prenom}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Email:</span>
                                                <span>{selectedEmploye.email}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Téléphone:</span>
                                                <span>{selectedEmploye.telephone || '-'}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Adresse:</span>
                                                <span>{selectedEmploye.adresse || '-'}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Localité:</span>
                                                <span>
                                                    {selectedEmploye.commune || '-'} / {selectedEmploye.wilaya || '-'}
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Ligne attribuée:</span>
                                                <span>
                                                    {selectedEmploye.line_number 
                                                        ? `Ligne ${selectedEmploye.line_number} - ${selectedEmploye.line_name}`
                                                        : 'Aucune ligne attribuée'}
                                                </span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Fonction:</span>
                                                <span>{selectedEmploye.fonction || '-'}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Poste:</span>
                                                <span>{selectedEmploye.post || '-'}</span>
                                            </div>
                                            <div className="info-row">
                                                <span className="label">Affectation:</span>
                                                <span>{selectedEmploye.affectation || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmplyTable;