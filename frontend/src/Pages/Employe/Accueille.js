import React, { useState } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Accueille.css";

const Accueille = () => {
  // État pour simuler les données de stations et le statut du bus
  const [stations] = useState([
    { id: 1, nom: "Nom de station 1", heure: "07:30", active: true },
    { id: 2, nom: "Nom de station 1", heure: "07:31", active: true },
    { id: 3, nom: "Nom de station 1", heure: "07:52", active: true },
    { id: 4, nom: "Nom de station 1", heure: "07:55", active: false },
    { id: 5, nom: "Nom de station 1", heure: "07:59", active: false },
    { id: 6, nom: "Nom de station 1", heure: "08:00", active: false }
  ]);
const containerStyle = { width: "100%", height: "100%" };
const center = { lat: 36.7538, lng: 3.0422 };
  
  return (
    <div>
      <Header />
      <div className="content-container">
        <Navbar />
        <div className="main-content">
          <div className="dashboard-container">
            {/* Section gauche: liste des stations */}
            <div className="ligne-section">
              <div className="section-header">
                <i className="fas fa-map-marker-alt"></i> voici votre ligne :
              </div>
              <div className="ligne-content">
                <div className="adresses">adressse1 - adresse2</div>
                
                <div className="stations-container">
                  {stations.map((station) => (
                    <div key={station.id} className="station-item">
                      <div className="station-timeline">
                        <div className={`station-dot ${station.active ? 'active' : 'inactive'}`}></div>
                        <div className={`station-line ${station.id === stations.length ? 'hidden' : ''}`}></div>
                      </div>
                      <div className="station-info">
                        <div className="station-name">{station.nom}</div>
                        <div className="station-time">
                          <span className="date">02/03</span>
                          <span className="time">{station.heure} am</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Section droite: carte et suivi du bus */}
            <div className="bus-section">
              <div className="section-header">
                <i className="fas fa-bus"></i> suivi votre bus :
              </div>
              <div className="map-container">
                {/* Ici, vous pouvez intégrer une carte Google Maps ou OpenStreetMap */}
                <LoadScript googleMapsApiKey="AIzaSyAABTvCSNEmdawa-AUHZlKv11uWomfmBhw">
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} />
          </LoadScript>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accueille;