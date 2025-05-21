import React, { useState, useEffect } from "react";
import "./Header.css"; 
import logot from "../icons/logot.png";
import logout from "../icons/logout.png";
import personne from "../icons/personne.png";
import axios from "axios";

const Header = ({ username = "Utilisateur" }) => {
    const [displayName, setDisplayName] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    useEffect(() => {
        try {
            const userString = sessionStorage.getItem("user") || localStorage.getItem("user");
            
            if (userString) {
                const userObject = JSON.parse(userString);
                if (userObject && userObject.displayName) {
                    setDisplayName(userObject.displayName);
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du displayName:", error);
        }
    }, []);
    
    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    const confirmLogout = async () => {
        try {
            setIsLoggingOut(true);
            await axios.post('http://localhost:5000/api/auth/logout');
            
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            
            window.location.href = '/';
        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            window.location.href = '/';
        }
    };

    if (isLoggingOut) {
        return (
            <div className="logout-screen">
                <p>Déconnexion en cours...</p>
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
            DERCTION GESTION DU PATRIMOINE SIEGE<br/>
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