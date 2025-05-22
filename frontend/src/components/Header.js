import React, { useState, useEffect } from "react";
import "./Header.css";
import logot from "../icons/logot.png";
import logout from "../icons/logout.png";
import personne from "../icons/personne.png";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const Header = ({ username = "Utilisateur" }) => {
    const [displayName, setDisplayName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Vérifier l'état de connexion à chaque chargement du composant
    useEffect(() => {
        checkAuthStatus();
    }, [location]);
    
    // Fonction pour vérifier si l'utilisateur est connecté
    const checkAuthStatus = () => {
        try {
            const userString = sessionStorage.getItem("user") || localStorage.getItem("user");
            
            if (!userString) {
                // Si aucune donnée utilisateur n'est trouvée, rediriger vers la page d'accueil
                console.log("Aucune session utilisateur trouvée, redirection...");
                const currentPath = location.pathname;
                
                // Vérifier si l'utilisateur est sur une page protégée
                if (currentPath.includes('/AdminRoutes') || 
                    currentPath.includes('/SousAdminRoutes') || 
                    currentPath.includes('/ChauffeurRoutes') || 
                    currentPath.includes('/EmployeRoutes')) {
                    navigateToLoginPage();
                    return;
                }
            } else {
                const userObject = JSON.parse(userString);
                if (userObject) {
                    if (userObject.displayName) {
                        setDisplayName(userObject.displayName);
                    }
                    if (userObject.role) {
                        setUserRole(userObject.role);
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
            navigateToLoginPage();
        }
    };
    
    // Fonction pour rediriger vers la page de connexion appropriée
    const navigateToLoginPage = () => {
        const currentPath = location.pathname;
        
        if (currentPath.includes('/EmployeRoutes')) {
            navigate('/LoginEmploye', { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    };
    
    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };
    
    const cancelLogout = () => {
        setShowLogoutModal(false);
    };
    
    const confirmLogout = async () => {
        try {
            setIsLoggingOut(true);
            
            // Appel au serveur pour la déconnexion
            await axios.post('http://localhost:5000/api/auth/logout');
            
            // Supprimer les données utilisateur du stockage
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            
            // Redirection basée sur le rôle de l'utilisateur avec la méthode replace
            redirectBasedOnRole();
            
        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
            
            // Même en cas d'erreur, on supprime les données et on redirige
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            
            redirectBasedOnRole();
        }
    };
    
    const redirectBasedOnRole = () => {
        // Redirection basée sur le rôle avec replace: true pour empêcher le retour arrière
        switch (userRole) {
            case 'admin':
            case 'supadmin':
            case 'chauffeur':
                // Ces rôles retournent à la page d'accueil principale
                window.location.replace('/');
                break;
            case 'employe':
                // Les employés sont redirigés vers leur page de connexion spécifique
                window.location.replace('/LoginEmploye');
                break;
            default:
                // Par défaut, redirection vers la page d'accueil
                window.location.replace('/');
                break;
        }
    };
    
    if (isLoggingOut) {
        return (
            <div className="logging-out-container">
                <div className="logging-out-message">
                    Déconnexion en cours...
                </div>
            </div>
        );
    }
    
    return (
        <div className="Header">
          <div className="logo">
            <img src={logot} alt="Sonatrach Transport" />
          </div>
  
          <header className="user-info">
            <div className="welcome">
            DIRECTION GESTION DU PATRIMOINE SIEGE<br/>
              DEPARTEMENT TRANSPORT
            </div>
            <div className="user">
              <span onClick={handleLogoutClick} style={{cursor: 'pointer'}}>
                <img src={logout} alt="logout" height={25} width={25} />
              </span>
              <span>
                <img src={personne} alt="personne" height={25} width={25} />
              </span>
              <span>{displayName || username}</span>
            </div>
          </header>

          {/* Modal de confirmation de déconnexion */}
          {showLogoutModal && (
            <div className="logout-modal-overlay">
              <div className="logout-modal-container">
                <p>Êtes-vous sûr de vouloir vous déconnecter?</p>
                <div className="logout-modal-buttons">
                  <button onClick={cancelLogout} className="logout-modal-button logout-cancel-button">
                    Annuler
                  </button>
                  <button onClick={confirmLogout} className="logout-modal-button logout-confirm-button">
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    );
};

export default Header;