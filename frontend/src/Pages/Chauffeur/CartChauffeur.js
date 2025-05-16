import React, { useEffect, useState, useRef } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./CartChauffeur.css";
import Logot from "../../icons/logot.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import html2canvas from 'html2canvas';

const CartChauffeur = () => {
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedLine, setAssignedLine] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  // Récupérer l'utilisateur depuis le localStorage
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));

  // Modifier simplement le useEffect pour utiliser les nouvelles routes
useEffect(() => {
  const fetchDriverData = async () => {
    try {
      // Récupérer toutes les données en une seule requête
      const driverResponse = await axios.get('http://localhost:5000/api/chauffeur-data', {
        params: { 
          username: user.username,
          isExternal: user.isExternal
        }
      });
      
      setDriverData(driverResponse.data);
      
      // Si ligne non incluse dans la réponse principale, la récupérer séparément
      if (!driverResponse.data.line_name) {
        const lineResponse = await axios.get('http://localhost:5000/api/affectations-chauffeur', {
          params: { 
            bus_id: driverResponse.data?.id,
            isExternal: user.isExternal,
            username: user.username
          }
        });
        setAssignedLine(lineResponse.data);
      } else {
        setAssignedLine({
          line_id: driverResponse.data.line_id,
          line_name: driverResponse.data.line_name
        });
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError(err.response?.data?.error || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  fetchDriverData();
}, [user, navigate]);

  // Fonction pour télécharger la carte en format JPG
  const downloadCardAsJpg = async () => {
    if (!cardRef.current) return;
    
    try {
      setDownloading(true);
      
      // Force l'image à se charger avant de prendre la capture
      if (driverData?.photo_chauffeur_url) {
        const imgElements = cardRef.current.querySelectorAll('img');
        await Promise.all(Array.from(imgElements).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));
      }
      
      const scale = 2; // Pour une meilleure qualité d'image
      const canvas = await html2canvas(cardRef.current, {
        scale: scale,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = `carte_chauffeur_${driverData?.chauffeur_matricule || 'transport'}.jpg`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error("Erreur lors du téléchargement:", err);
      alert("Une erreur est survenue lors du téléchargement de la carte.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Ma carte de transport</h2>
            <div className="emp-red-dot"></div>
          </div>

          {loading ? (
            <div className="loading-container">Chargement en cours...</div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="retry-button">
                Réessayer
              </button>
            </div>
          ) : (
            <>
              <div className="emp-carte-container">
                <div className="emp-carte-transport" ref={cardRef}>
                  <div className="emp-carte-header">
                    <div className="emp-logo-bus">
                      <img src={Logot} alt="Bus logo" />
                    </div>
                    <div className="emp-carte-title-header">
                      {driverData?.company_name || "Transport en commun"}
                    </div>
                  </div>

                  <div className="emp-carte-body">
                    <div className="emp-carte-info">
                      <div className="emp-info-field">
                        <label>Nom:</label>
                        <div className="emp-field-value">{driverData?.chauffeur_nom || "-"}</div>
                      </div>
                      <div className="emp-info-field">
                        <label>Prénom:</label>
                        <div className="emp-field-value">{driverData?.chauffeur_prenom || "-"}</div>
                      </div>
                      <div className="emp-info-field">
                        <label>Matricule:</label>
                        <div className="emp-field-value">{driverData?.chauffeur_matricule || "-"}</div>
                      </div>
                      <div className="emp-info-field">
                        <label>Bus:</label>
                        <div className="emp-field-value">
                          {driverData?.marque && driverData?.modele && driverData?.matricule 
                            ? `${driverData.marque} ${driverData.modele} (${driverData.matricule})` 
                            : "-"}
                        </div>
                      </div>
                      <div className="emp-info-field">
                        <label>Ligne assignée:</label>
                        <div className="emp-field-value">
                          {assignedLine?.line_name || "Aucune ligne assignée"}
                        </div>
                      </div>
                    </div>
                    <div className="emp-carte-photo">
                      {driverData?.photo_chauffeur_url ? (
                        <img 
                          src={`http://localhost:5000${driverData.photo_chauffeur_url}`}
                          alt=""
                          className="emp-driver-photo"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            document.querySelector('.emp-photo-placeholder').style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="emp-photo-placeholder" style={{
                        display: driverData?.photo_chauffeur_url ? 'none' : 'flex'
                      }}>
                        Photo non disponible
                      </div>
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
                <button 
                  className="emp-download-button" 
                  onClick={downloadCardAsJpg}
                  disabled={downloading}
                >
                  {downloading ? 'Préparation...' : 'Télécharger la carte en format jpg'} 
                  <span className="emp-download-icon">↓</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartChauffeur;
//for bouchra 