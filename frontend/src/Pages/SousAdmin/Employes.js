import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";

const EmplyTable = () => {
    const [employes, setEmployes] = useState([]);
    const [filteredEmployes, setFilteredEmployes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Fonction pour récupérer les employés depuis LDAP
    useEffect(() => {
        const fetchEmployesFromLDAP = async () => {
            try {
                setLoading(true);
                // Appel à notre API - vous devrez créer cette route dans votre backend
                const response = await fetch('http://localhost:5000/api/employes');
                const data = await response.json();
                
                if (data.success && Array.isArray(data.employes)) {
                    setEmployes(data.employes);
                    setFilteredEmployes(data.employes);
                } else {
                    console.error("Erreur de l'API:", data.message);
                    setEmployes([]);
                    setFilteredEmployes([]);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données LDAP:", error);
                setEmployes([]);
                setFilteredEmployes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployesFromLDAP();
    }, []);

    // Fonction de recherche
    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        
        if (term.trim() === '') {
            setFilteredEmployes(employes || []);
            return;
        }
        
        if (!Array.isArray(employes)) {
            setFilteredEmployes([]);
            return;
        }
        
        const filtered = employes.filter(employe => 
            (employe.nom && employe.nom.toLowerCase().includes(term)) || 
            (employe.prenom && employe.prenom.toLowerCase().includes(term)) ||
            (employe.matricule && employe.matricule.toLowerCase().includes(term)) ||
            (employe.email && employe.email.toLowerCase().includes(term))
        );
        
        setFilteredEmployes(filtered);
    };

    // Fonction pour déterminer la classe CSS en fonction du statut
    const getStatusClass = (status) => {
        if (!status) return "";
        
        switch(status.toLowerCase()) {
            case 'actif':
                return "status-active";
            case 'inactif':
            case 'désactivé':
                return "status-inactive";
            default:
                return "";
        }
    };
    
    // Ensure employes and filteredEmployes are always arrays
    const safeEmployes = Array.isArray(employes) ? employes : [];
    const safeFilteredEmployes = Array.isArray(filteredEmployes) ? filteredEmployes : [];
    
    return (
        <div>
            <Header/> 
            <div className="ad">
                <Navbar/>
                <div className="ad-container">
                    <h2 className="title"> <span className="underline">Employés</span> </h2>
                    <br />
                    <p className="total">nombre total : <span className="count">{safeEmployes.length}</span></p>
                    
                    <div className="search-bar">
                        <input 
                            type="text" 
                            placeholder="Search" 
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                        <button> 
                            <img src={search} alt="" />
                        </button>
                    </div>
                    
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Prénom</th>
                                <th>Matricule</th>
                                <th>Email</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                // Afficher des lignes vides pendant le chargement
                                Array(10).fill(null).map((_, index) => (
                                    <tr key={`loading-${index}`} className={index % 2 === 0 ? "gray-row" : ""}>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td><img src={edit} alt="" /><img src={Delete} alt="" /></td>
                                    </tr>
                                ))
                            ) : safeFilteredEmployes.length > 0 ? (
                                // Afficher les données des employés
                                safeFilteredEmployes.map((employe, index) => (
                                    <tr key={employe?.id || `employe-${index}`} className={index % 2 === 0 ? "gray-row" : ""}>
                                        <td>{employe?.nom || "—"}</td>
                                        <td>{employe?.prenom || "—"}</td>
                                        <td>{employe?.matricule || "—"}</td>
                                        <td>{employe?.email || "—"}</td>
                                        <td className={getStatusClass(employe?.statut)}>{employe?.statut || "—"}</td>
                                        <td>
                                            <img src={edit} alt="" />
                                            <img src={Delete} alt="" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Message si aucun employé trouvé
                                <tr>
                                    <td colSpan="6" style={{textAlign: "center"}}>Aucun employé trouvé</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
  
export default EmplyTable;