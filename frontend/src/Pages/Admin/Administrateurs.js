import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";

const AdminTable = () => {
    // Initialize with empty arrays to prevent undefined
    const [admin, setAdmin] = useState([]);
    const [filteredAdmin, setFilteredAdmin] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Fonction pour récupérer les admin depuis LDAP
    useEffect(() => {
        const fetchAdminFromLDAP = async () => {
            try {
                setLoading(true);
                // Appel à notre API
                const response = await fetch('http://localhost:5000/api/sousadmins');
                const data = await response.json();
                
                // Fix: Changed data.admin to data.admins to match the API response
                if (data.success && Array.isArray(data.admins)) {
                    setAdmin(data.admins);
                    setFilteredAdmin(data.admins);
                } else {
                    console.error("Erreur de l'API:", data.message);
                    setAdmin([]);
                    setFilteredAdmin([]);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données LDAP:", error);
                setAdmin([]);
                setFilteredAdmin([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminFromLDAP();
    }, []);

    // Fonction de recherche
    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        
        if (term.trim() === '') {
            setFilteredAdmin(admin || []);
            return;
        }
        
        // Add null check for admin
        if (!Array.isArray(admin)) {
            setFilteredAdmin([]);
            return;
        }
        
        const filtered = admin.filter(adminItem => 
            (adminItem.nom && adminItem.nom.toLowerCase().includes(term)) || 
            (adminItem.prenom && adminItem.prenom.toLowerCase().includes(term)) ||
            (adminItem.matricule && adminItem.matricule.toLowerCase().includes(term)) ||
            (adminItem.email && adminItem.email.toLowerCase().includes(term))
        );
        
        setFilteredAdmin(filtered);
    };

    // Fonction pour déterminer la classe CSS en fonction du statut
    const getStatusClass = (status) => {
        if (!status) return "";
        // Ajoutez ici la logique pour définir les classes CSS en fonction du statut
        // Par exemple:
        switch(status.toLowerCase()) {
            case 'actif':
                return "status-active";
            case 'inactif':
                return "status-inactive";
            default:
                return "";
        }
    };
    
    // Ensure admin and filteredAdmin are always arrays
    const safeAdmin = Array.isArray(admin) ? admin : [];
    const safeFilteredAdmin = Array.isArray(filteredAdmin) ? filteredAdmin : [];
    
    return (
        <div>
            <Header/> 
            <div className="ad">
                <Navbar/>
                <div className="ad-container">
                    <h2 className="title"> <span className="underline">administrateurs</span> </h2>
                    <br />
                    <p className="total">nombre total : <span className="count">{safeAdmin.length}</span></p>
                    
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
                                <th>Téléphone</th>
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
                                        <td>—</td>
                                        <td><img src={edit} alt="" /><img src={Delete} alt="" /></td>
                                    </tr>
                                ))
                            ) : safeFilteredAdmin.length > 0 ? (
                                // Afficher les données des admin
                                safeFilteredAdmin.map((adminItem, index) => (
                                    <tr key={adminItem?.id || `admin-${index}`} className={index % 2 === 0 ? "gray-row" : ""}>
                                        <td>{adminItem?.nom || "—"}</td>
                                        <td>{adminItem?.prenom || "—"}</td>
                                        <td>{adminItem?.matricule || "—"}</td>
                                        <td>{adminItem?.tel || "—"}</td>
                                        <td>{adminItem?.email || "—"}</td>
                                        <td className={getStatusClass(adminItem?.statut)}>{adminItem?.statut || "—"}</td>
                                        <td>
                                            <img src={edit} alt="" />
                                            <img src={Delete} alt="" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Message si aucun admin trouvé
                                <tr>
                                    <td colSpan="7" style={{textAlign: "center"}}>Aucun admin trouvé</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
  
export default AdminTable;