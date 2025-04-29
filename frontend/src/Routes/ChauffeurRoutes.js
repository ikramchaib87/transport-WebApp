import { Routes, Route } from "react-router-dom";
import Plandejour from "../Pages/Chauffeur/Plandejour";
import Trajet from "../Pages/Chauffeur/Trajet";
import CartChauffeur from "../Pages/Chauffeur/CartChauffeur";
import Profil from "../Pages/Chauffeur/Profil";



const EmployeRoutes= () => {
  return (
    <Routes>
      <Route path="/Plandejour" element={<Plandejour/>} />
      <Route path="/Trajet" element={<Trajet />} />
      <Route path="/CartChauffeur" element={<CartChauffeur />} />
      <Route path="/Profil" element={<Profil />} />
    </Routes>
  );
};

export default EmployeRoutes;
