import React, { useEffect, useState } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./CartEmploye.css";
import Logot from "../../icons/logo.png";
import axios from "axios";
import html2canvas from 'html2canvas';
const CartEmploye = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        
        if (!user) {
          window.location.href = '/LoginEmploye';
          return;
        }

        const response = await axios.get('http://localhost:5000/api/employe-data', {
          params: { 
            username: user.username,
            uidNumber: user.uidNumber
          }
        });

        setEmployeeData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  if (loading) {
    return <div className="loading">Chargement en cours...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }
const handleDownload = async () => {
  const carteElement = document.querySelector('.emp-carte-transport');
  
  try {
    // Si l'image provient d'une URL externe, nous devons nous assurer qu'elle est chargée
    if (employeeData?.photo_url) {
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // Important pour les requêtes CORS
      img.src = `http://localhost:5000${employeeData.photo_url}`;
      
      // Attendons que l'image soit chargée
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }

    html2canvas(carteElement, {
      useCORS: true, // Active le support CORS
      logging: true, // Active les logs pour le débogage
      allowTaint: true, // Permet le rendu d'images externes
      scale: 2 // Améliore la qualité de l'image
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'carte-transport.jpg';
      link.href = canvas.toDataURL('image/jpeg', 1.0); // Qualité maximale
      link.click();
    });
  } catch (error) {
    console.error("Erreur lors du téléchargement de la carte:", error);
    alert("Une erreur est survenue lors du téléchargement de la carte.");
  }
};
  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container ">
          <div className="emp-carte-title">
            <h2>Ma carte de transport</h2>
            <div className="emp-red-dot"></div>
          </div>

          <div className="emp-carte-container">
            <div className="emp-carte-transport">
              <div className="emp-carte-header">
                <div className="emp-logo-bus">
                  <img src={Logot} alt="Bus logo" />
                </div>
                <div className="emp-carte-title-header">
                  carte de transport
                </div>
              </div>

              <div className="emp-carte-body">
                <div className="emp-carte-info">
                  <div className="emp-info-field">
                    <label>Nom:</label>
                    <span className="emp-info-value">{employeeData?.nom || "Non disponible"}</span>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>Prénom:</label>
                    <span className="emp-info-value">{employeeData?.prenom || "Non disponible"}</span>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>Matricule:</label>
                    <span className="emp-info-value">{employeeData?.ldap_id || "Non disponible"}</span>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                    <label>Ligne:</label>
                    <span className="emp-info-value">
                      {employeeData?.line_number && employeeData?.line_name 
                        ? `${employeeData.line_number} - ${employeeData.line_name}`
                        : "Non assignée"}
                    </span>
                    <div className="emp-field-underline"></div>
                  </div>
                  <div className="emp-info-field">
                  <label>Arrêt:</label>
                  <span className="emp-info-value">
                   {employeeData?.stop_name || "Non spécifié"}
                  
                   </span>
                  <div className="emp-field-underline"></div>
                 </div>
                </div>
                <div className="emp-carte-photo">
                  {employeeData?.photo_url ? (
                    <img 
                      src={`http://localhost:5000${employeeData.photo_url}`} 
                      alt="Photo employé" 
                      className="emp-photo-placeholder"
                      
                    />
                  ) : (
                  
                      <div className="emp-photo-placeholder" />
                       
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="emp-info-section">
            <div className="emp-info-item">
              <span className="emp-info-icon">ⓘ</span>
              <p>Toute modification de votre trajet ou de votre emploi sera automatiquement reflétée sur votre carte.</p>
            </div>
            <div className="emp-info-item">
              <span className="emp-info-icon">ⓘ</span>
              <p>Présentez cette carte au chauffeur en cas de contrôle.</p>
            </div>
            <div className="emp-info-item">
              <span className="emp-info-icon">ⓘ</span>
              <p>Vous pouvez télécharger cette carte en format JPG pour la conserver hors connexion.</p>
            </div>
          </div>

          <div className="emp-download-section">
            <button className="emp-download-button" onClick={handleDownload}>
             Télécharger la carte en format jpg <span className="emp-download-icon">↓</span>
           </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartEmploye;