import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Loginads from './Pages/Loginads';
import AdminRouters from './Routes/AdminRoutes';
import SousAdminRouters from './Routes/SousAdminRoutes';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginEmploye from './Pages/LoginEmploye';
import EmployeRoutes from './Routes/EmployeRoutes';
import ChauffeurRoutes from './Routes/ChauffeurRoutes';
import Demande from './Pages/Employe/Demande';
import { ProtectedRoute, RoleBasedRoute, Unauthorized } from './components/ProtectedRoutes';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Routes publiques - pages de connexion */}
        <Route path="/" element={<Loginads />} />
        <Route path="/LoginEmploye" element={<LoginEmploye />} />
        
        {/* Page d'accès non autorisé */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Routes protégées - nécessitent une authentification */}
        <Route element={<ProtectedRoute />}>
          {/* Routes pour les administrateurs */}
          <Route element={<RoleBasedRoute allowedRoles={['supadmin']} />}>
            <Route path="/AdminRoutes/*" element={<AdminRouters />} />
          </Route>
          
          {/* Routes pour les sous-administrateurs */}
          <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
            <Route path="/SousAdminRoutes/*" element={<SousAdminRouters />} />
          </Route>
          
          {/* Routes pour les employés */}
          <Route element={<RoleBasedRoute allowedRoles={['employe']} />}>
            <Route path="/EmployeRoutes/*" element={<EmployeRoutes />} />
          </Route>
          
          {/* Routes pour les chauffeurs */}
          <Route element={<RoleBasedRoute allowedRoles={['chauffeur']} />}>
            <Route path="/ChauffeurRoutes/*" element={<ChauffeurRoutes />} />
          </Route>
        </Route>
      
          {/* route public pour demande */}
          <Route path="/EmployeRoutes/Demande" element={<Demande />} />

        {/* Route pour capturer toutes les autres URLs non définies */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);