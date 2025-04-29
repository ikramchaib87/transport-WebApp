import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Composant pour vérifier si l'utilisateur est authentifié
export const ProtectedRoute = () => {
  // Récupérer l'utilisateur du localStorage ou sessionStorage
  const getUser = () => {
    const userFromStorage = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userFromStorage) {
      return JSON.parse(userFromStorage);
    }
    return null;
  };

  const user = getUser();
  
  // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est authentifié, afficher la page demandée
  return <Outlet />;
};

// Composant pour vérifier le rôle de l'utilisateur
export const RoleBasedRoute = ({ allowedRoles }) => {
  // Récupérer l'utilisateur du localStorage ou sessionStorage
  const getUser = () => {
    const userFromStorage = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userFromStorage) {
      return JSON.parse(userFromStorage);
    }
    return null;
  };

  const user = getUser();
  
  // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // Si l'utilisateur n'a pas le rôle requis, rediriger vers une page d'accès non autorisé
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Si l'utilisateur a le rôle requis, afficher la page demandée
  return <Outlet />;
};

// Composant pour la page d'accès non autorisé
export const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <h1>Accès non autorisé</h1>
      <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <button onClick={() => window.history.back()}>Retourner</button>
    </div>
  );
};