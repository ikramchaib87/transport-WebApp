import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import viewDetails from "../../icons/view.png";
import search from "../../icons/search.png";

const ChauffTable = () => {
    const [chauffeurs, setChauffeurs] = useState([]);
    const [filteredChauffeurs, setFilteredChauffeurs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedChauffeur, setSelectedChauffeur] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        nom: "",
        prenom: "",
        email: "",
        tel: "",
        disponibilite: "Disponible",
        photo_url: ""
    });
    const [photoErrors, setPhotoErrors] = useState({});

    // Function to fetch drivers from the API
    const fetchChauffeurs = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/chauffeurs');
            const data = await response.json();
            
            if (data.success) {
                // Use drivers returned from API directly
                setChauffeurs(data.chauffeurs);
                setFilteredChauffeurs(data.chauffeurs);
                console.log(`${data.chauffeurs.length} chauffeurs récupérés depuis LDAP`);
                
                // Debug photo URLs
                data.chauffeurs.forEach(chauffeur => {
                    if (chauffeur.photo_url) {
                        console.log(`Chauffeur ${chauffeur.matricule} has photo URL: ${chauffeur.photo_url.substring(0, 30)}...`);
                    } else {
                        console.log(`Chauffeur ${chauffeur.matricule} has NO photo URL`);
                    }
                });
            } else {
                console.error("Erreur de l'API:", data.message);
                setChauffeurs([]);
                setFilteredChauffeurs([]);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
            setChauffeurs([]);
            setFilteredChauffeurs([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial data loading
    useEffect(() => {
        fetchChauffeurs();
    }, []);

    // Search function
    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        
        if (term.trim() === '') {
            setFilteredChauffeurs(chauffeurs);
            return;
        }
        
        const filtered = chauffeurs.filter(chauffeur => 
            (chauffeur.nom && chauffeur.nom.toLowerCase().includes(term)) || 
            (chauffeur.prenom && chauffeur.prenom.toLowerCase().includes(term)) ||
            (chauffeur.matricule && chauffeur.matricule.toLowerCase().includes(term)) ||
            (chauffeur.email && chauffeur.email.toLowerCase().includes(term))
        );
        
        setFilteredChauffeurs(filtered);
    };

    // Style function for availability
    const getStatusClass = (disponibilite) => {
        if (!disponibilite) return "";
        
        const disponibiliteLower = disponibilite.toLowerCase();
        if (disponibiliteLower === 'disponible') return "status-active";
        if (disponibiliteLower === 'non disponible') return "status-inactive";
        return "";
    };

    // Function to show driver details
    const handleViewDetails = (chauffeur) => {
        console.log("Opening modal for chauffeur:", chauffeur);
        console.log("Photo URL:", chauffeur.photo_url ? chauffeur.photo_url.substring(0, 30) + "..." : "None");
        
        setSelectedChauffeur(chauffeur);
        setFormData({
            nom: chauffeur.nom || "",
            prenom: chauffeur.prenom || "",
            email: chauffeur.email || "",
            tel: chauffeur.tel || "",
            disponibilite: chauffeur.disponibilite || "Disponible",
            photo_url: chauffeur.photo_url || ""
        });
        setShowModal(true);
    };

    // Function to handle image error
    const handleImageError = (chauffeurId) => {
        console.error(`Error loading image for chauffeur ID: ${chauffeurId}`);
        setPhotoErrors(prev => ({...prev, [chauffeurId]: true}));
    };

    // Function to close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedChauffeur(null);
    };

    return (
        <div>
        <Header/> 
        <div className="ad">
            <Navbar/>
            <div className="ad-container">
                <h2 className="title"> <span className="underline">Chauffeurs</span> </h2>
                <br />
                <p className="total">nombre total : <span className="count">{chauffeurs.length}</span></p>
                
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
                            <th>Nom⬍</th>
                            <th>Prenom⬍</th>
                            <th>Matricule⬍</th>
                            <th>Numero de tel⬍</th>
                            <th>Email⬍</th>
                            <th>Disponibilité⬍</th>
                            <th>Action⬍</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            // Show empty rows during loading
                            Array(10).fill(null).map((_, index) => (
                                <tr key={index} className={index % 2 === 0 ? "gray-row" : ""}>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                </tr>
                            ))
                        ) : filteredChauffeurs.length > 0 ? (
                            // Show driver data
                            filteredChauffeurs.map((chauffeur, index) => (
                                <tr key={chauffeur.ldap_id || index} className={index % 2 === 0 ? "gray-row" : ""}>
                                    <td>{chauffeur.nom}</td>
                                    <td>{chauffeur.prenom}</td>
                                    <td>{chauffeur.matricule}</td>
                                    <td>{chauffeur.tel}</td>
                                    <td>{chauffeur.email}</td>
                                    <td className={getStatusClass(chauffeur.disponibilite)}>{chauffeur.disponibilite}</td>
                                    <td className="action-buttons">
                                        <img 
                                            src={viewDetails} 
                                            alt="Voir détails" 
                                            title="Voir les détails"
                                            onClick={() => handleViewDetails(chauffeur)}
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            // Message if no drivers found
                            <tr>
                                <td colSpan="8" style={{textAlign: "center"}}>Aucun chauffeur trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modal for displaying driver details (read-only) */}
        {showModal && selectedChauffeur && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Détails du chauffeur</h3>
                        <button className="close-button" onClick={handleCloseModal}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="chauffeur-profile">
                            <div className="profile-photo-container">
                                {selectedChauffeur.photo_url && !photoErrors[selectedChauffeur.ldap_id] ? (
                                    <img 
                                        src={selectedChauffeur.photo_url} 
                                        alt="profil" 
                                        className="profile-photo"
                                        onError={() => handleImageError(selectedChauffeur.ldap_id)}
                                    />
                                ) : (
                                    <div className="photo-placeholder">
                                        {selectedChauffeur.prenom && selectedChauffeur.nom ? (
                                            <div className="initials">
                                                {selectedChauffeur.prenom.charAt(0)}
                                                {selectedChauffeur.nom.charAt(0)}
                                            </div>
                                        ) : (
                                            <div className="no-photo">No Photo</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="chauffeur-details">
                                <div className="detail-group">
                                    <label>Matricule:</label>
                                    <div className="detail-value">{selectedChauffeur.matricule || "—"}</div>
                                </div>

                                <div className="detail-group">
                                    <label>Nom:</label>
                                    <div className="detail-value">{formData.nom || "—"}</div>
                                </div>

                                <div className="detail-group">
                                    <label>Prénom:</label>
                                    <div className="detail-value">{formData.prenom || "—"}</div>
                                </div>

                                <div className="detail-group">
                                    <label>Email:</label>
                                    <div className="detail-value">{formData.email || "—"}</div>
                                </div>

                                <div className="detail-group">
                                    <label>Téléphone:</label>
                                    <div className="detail-value">{formData.tel || "—"}</div>
                                </div>

                                <div className="detail-group">
                                    <label>Disponibilité:</label>
                                    <div className={`detail-value ${getStatusClass(formData.disponibilite)}`}>
                                        {formData.disponibilite || "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="close-button-secondary" onClick={handleCloseModal}>Fermer</button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
};

export default ChauffTable;