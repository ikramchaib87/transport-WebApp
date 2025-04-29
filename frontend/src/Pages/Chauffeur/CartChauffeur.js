import React from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./CartChauffeur.css";
import Logot from "../../icons/logot.png";
const CartEmploye = () => {
  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container ">
          <div className="emp-carte-title">
            <h2>Ma carte </h2>
            <div className="emp-red-dot"></div>
          </div>

          <div className="emp-carte-container">
            <div className="emp-carte-transport">
              <div className="emp-carte-header">
                <div className="emp-logo-bus">
                  <img src={Logot} alt="Bus logo" />
                </div>
                <div className="emp-carte-title-header">
                  carte 
                </div>
              </div>

              <div className="emp-carte-body">
                <div className="emp-carte-info">
                  <div className="emp-info-field">
                    <label>Nom:</label>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>prénom:</label>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>Matricule:</label>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>Ligne:</label>
                    <div className="emp-field-underline"></div>
                  </div>
                </div>
                <div className="emp-carte-photo">
                  <div className="emp-photo-placeholder"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="emp-info-section">
            
            <div className="emp-info-item">
              <span className="emp-info-icon">ⓘ</span>
              <p>Vous pouvez télécharger cette carte en format JPG pour la conserver hors connexion.</p>
            </div>
          </div>

          <div className="emp-download-section">
            <button className="emp-download-button">
              Télégarger la carte en format jpg <span className="emp-download-icon">↓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartEmploye;