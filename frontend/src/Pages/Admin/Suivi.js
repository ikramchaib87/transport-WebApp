
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import Navbar from "../../components/Navbar";
import Header from "../../components/Header";
import "./Suivi.css"; // Import du fichier CSS

const containerStyle = { width: "100%", height: "500px" };
const center = { lat: 36.7538, lng: 3.0422 };

// Liste des stations
const stations = [
  { name: "Station 1", time: "07:50 am" },
  { name: "Station 2", time: "07:51 am" },
  { name: "Station 3", time: "07:52 am" },
  { name: "Station 4", time: "07:54 am" },
  { name: "Station 5", time: "07:57 am" },
  { name: "Station 6", time: "08:00 am" },
];

// Infos bus
const busInfo = {
  id: "00 1213 115 16",
  speed: "40 Km/h",
  distance: "5.8 Km",
  duration: "9 min",
};

function MapComponent() {
  return (
    <div>
      <Header />
      <div className="ad">
        <Navbar />
        <div id="gm-container">
       
        <div className="map-section">
          <h2>Google Map</h2>
          <LoadScript googleMapsApiKey="AIzaSyAABTvCSNEmdawa-AUHZlKv11uWomfmBhw">
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12} />
          </LoadScript>
        </div>

        <div className="stations-section">
          <h2>Les stations</h2>
          <ul className="stations-list">
            {stations.map((station, index) => (
              <li key={index} className="station">
                <span>{station.name}</span>
                <span>{station.time}</span>
              </li>
            ))}
          </ul>
      
      
        </div>
      <div className="bus-inf">
        <p><strong>ID de bus:</strong> {busInfo.id}</p>
        <p><strong>Vitesse:</strong> {busInfo.speed}</p>
        <p><strong>Distance:</strong> {busInfo.distance}</p>
        <p><strong>Durée de trajet:</strong> {busInfo.duration}</p>
      </div>
    </div>
    </div>
    </div>
  );
}

export default MapComponent;
