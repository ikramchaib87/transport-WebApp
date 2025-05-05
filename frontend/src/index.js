import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Loginads from './Pages/Loginads';
import AdminRouters from './Routes/AdminRoutes';
import SousAdminRouters from './Routes/SousAdminRoutes';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginEmploye from './Pages/LoginEmploye';
import EmployeRoutes from './Routes/EmployeRoutes';
import ChauffeurRoutes from './Routes/ChauffeurRoutes';


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Loginads />} />
        <Route path="/LoginEmploye" element={<LoginEmploye />} />
        <Route path="/AdminRoutes/*" element={<AdminRouters />} />
        <Route path="/SousAdminRoutes/*" element={<SousAdminRouters />} />
        <Route path="/EmployeRoutes/*" element={<EmployeRoutes />} />
        <Route path="/ChauffeurRoutes/*" element={<ChauffeurRoutes />} />
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
