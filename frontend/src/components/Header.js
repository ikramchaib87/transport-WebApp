import React from "react";
import "./Header.css"; 
import Logot from "../icons/logot.png";
import parametr from "../icons/parametr.png";
import personne from "../icons/personne.png";

const Header = ({ username = "Utilisateur" }) => {
    

    return (
    
        <div className="Header">
          <div className="logo">
            <img src={Logot} alt="Sonatrach Transport" />
          </div>
  
          <header className="user-info">
            <div className="welcome">
              Bienvenue,............. !
            </div>
            <div className="user">
              <span><img src={parametr} alt="paramètre" height={25} width={25} /></span>
              <span><img src={personne} alt="personne" height={25} width={25} /></span>
              <span>{username}</span>
            </div>
          </header>
        </div>

        
    );
};

export default Header;
