import { Routes, Route } from "react-router-dom";
import Tableaudebord from "../Pages/Admin/Tableaudebord";
import Employes from "../Pages/Admin/Employes";
import Bus from "../Pages/Admin/Bus";
import Chauffeurs from "../Pages/Admin/Chauffeurs";
import TransportExterne from "../Pages/Admin/TransportExterne";
import Affectation from "../Pages/Admin/Affectation";
import Administrateurs from "../Pages/Admin/Administrateurs";
import Suivi from "../Pages/Admin/Suivi";
import TrajetAdmin from "../Pages/Admin/TrajetAdmin";
import Demande from "../Pages/Admin/Demande";
import Reclamtion  from "../Pages/Admin/Reclamation";
import Lignes  from "../Pages/Admin/Lignes";
const AdminRoutes = () => {
  return (
    <Routes>
       <Route path="/Tableaudebord" element={<Tableaudebord />} />
      <Route path="/Suivi" element={<Suivi />} />
      <Route path="/Employes" element={<Employes />} />
      <Route path="/Bus" element={<Bus />} />
      <Route path="/Chauffeurs" element={<Chauffeurs />} />
      <Route path="/TransportExterne" element={<TransportExterne />} />
      <Route path="/Lignes" element={<Lignes/>} />
      <Route path="/Affectation" element={<Affectation />} />
      <Route path="/Administrateurs" element={<Administrateurs />} />
      <Route path="/TrajetAdmin" element={<TrajetAdmin />} />
      <Route path="/Demande" element={<Demande />} />
      <Route path="/Reclamation" element={<Reclamtion />} />
    </Routes>
  );
};

export default AdminRoutes;
