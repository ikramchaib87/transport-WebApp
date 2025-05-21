import { Routes, Route } from "react-router-dom";
import Tableaudebord from "../Pages/SousAdmin/Tableaudebord";
import Employes from "../Pages/SousAdmin/Employes";
import Bus from "../Pages/SousAdmin/Bus";
import Chauffeurs from "../Pages/SousAdmin/Chauffeurs";
import TransportExterne from "../Pages/SousAdmin/TransportExterne";
import Affectation from "../Pages/SousAdmin/Affectation";
import TrajetAdmin from "../Pages/SousAdmin/TrajetAdmin";
import Demande from "../Pages/SousAdmin/Demande";
import Reclamation  from "../Pages/SousAdmin/Reclamation";
import Lignes  from "../Pages/SousAdmin/Lignes";
const SousAdminRoutes= () => {
  return (
    <Routes>
      <Route path="/Tableaudebord" element={<Tableaudebord />} />
      <Route path="/Employes" element={<Employes />} />
      <Route path="/Bus" element={<Bus />} />
      <Route path="/Chauffeurs" element={<Chauffeurs />} />
      <Route path="/Lignes" element={<Lignes/>} />
      <Route path="/TransportExterne" element={<TransportExterne />} />
      <Route path="/Affectation" element={<Affectation />} />
      <Route path="/TrajetAdmin" element={<TrajetAdmin />} />
      <Route path="/Demande" element={<Demande />} />
      <Route path="/Reclamation" element={<Reclamation />} />
    </Routes>
  );
};

export default SousAdminRoutes;
