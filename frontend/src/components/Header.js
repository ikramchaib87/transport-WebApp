
import React, { useState, useEffect } from "react";
import "./Header.css"; 
import logot from "../icons/logot.png";
import parametr from "../icons/parametr.png";
import personne from "../icons/personne.png";

const Header = ({ username = "Utilisateur" }) => {
    const [displayName, setDisplayName] = useState("");
    
    useEffect(() => {
        try {
            // Remplacez "user" par la clé correcte identifiée dans la console
            const userString = sessionStorage.getItem("user");
            
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
              <span><img src={parametr} alt="paramètre" height={25} width={25} /></span>
              <span><img src={personne} alt="personne" height={25} width={25} /></span>
              <span>{displayName || username}</span>
            </div>
          </header>
        </div>
    );
};

export default Header;