import { Routes, Route } from "react-router-dom";
import Accueille from "../Pages/Employe/Accueille";
import CartEmploye from "../Pages/Employe/CartEmploye";
import Demande from "../Pages/Employe/Demande";
import Profil from "../Pages/Employe/Profil";
import Reclamation from "../Pages/Employe/Reclamation";


const EmployeRoutes= () => {
  return (
    <Routes>
      <Route path="/Demande" element={<Demande />} />
      <Route path="/Accueille" element={<Accueille />} />
      <Route path="/CartEmploye" element={<CartEmploye />} />
      <Route path="/Profil" element={<Profil />} />
      <Route path="/Reclamation" element={<Reclamation />} />
    </Routes>
  );
};

export default EmployeRoutes;
