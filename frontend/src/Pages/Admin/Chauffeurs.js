import React, { useState, useEffect } from "react";
import "./Administrateurs.css";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import Delete from "../../icons/delete.png";
import edit from "../../icons/edit.png";
import search from "../../icons/search.png";

const ChauffTable = () => {
    const [chauffeurs, setChauffeurs] = useState([]);
    const [filteredChauffeurs, setFilteredChauffeurs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // Fonction pour récupérer les chauffeurs depuis LDAP
    useEffect(() => {
        const fetchChauffeursFromLDAP = async () => {
            try {
                setLoading(true);
                // Appel à notre API
                const response = await fetch('http://localhost:5000/api/chauffeurs');
                const data = await response.json();
                
                if (data.success) {
                    setChauffeurs(data.chauffeurs);
                    setFilteredChauffeurs(data.chauffeurs);
                } else {
                    console.error("Erreur de l'API:", data.message);
                    setChauffeurs([]);
                    setFilteredChauffeurs([]);
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des données LDAP:", error);
                setChauffeurs([]);
                setFilteredChauffeurs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChauffeursFromLDAP();
    }, []);

    // Fonction de recherche
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

    // Fonction pour styliser le statut
    const getStatusClass = (statut) => {
      if (!statut) return "";
      
      const statutLower = statut.toLowerCase();
      if (statutLower === 'actif') return "status-active";
      if (statutLower === 'désactivé') return "status-inactive";
      return "";
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
                        <img src={search} alt="" />
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
                            <th>Statue⬍</th>
                            <th>Action⬍</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            // Afficher des lignes vides pendant le chargement
                            Array(10).fill(null).map((_, index) => (
                                <tr key={index} className={index % 2 === 0 ? "gray-row" : ""}>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td><img src={edit} alt="" /><img src={Delete} alt="" /></td>
                                </tr>
                            ))
                        ) : filteredChauffeurs.length > 0 ? (
                            // Afficher les données des chauffeurs
                            filteredChauffeurs.map((chauffeur, index) => (
                                <tr key={chauffeur.id || index} className={index % 2 === 0 ? "gray-row" : ""}>
                                    <td>{chauffeur.nom || "—"}</td>
                                    <td>{chauffeur.prenom || "—"}</td>
                                    <td>{chauffeur.matricule || "—"}</td>
                                    <td>{chauffeur.tel || "—"}</td>
                                    <td>{chauffeur.email || "—"}</td>
                                    <td className={getStatusClass(chauffeur.statut)}>{chauffeur.statut || "—"}</td>
                                    <td>
                                        <img src={edit} alt="" />
                                        <img src={Delete} alt="" />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            // Message si aucun chauffeur trouvé
                            <tr>
                                <td colSpan="7" style={{textAlign: "center"}}>Aucun chauffeur trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    );
};

export default ChauffTable;