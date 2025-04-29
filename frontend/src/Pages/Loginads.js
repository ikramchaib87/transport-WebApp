import React, { useState } from 'react';
import './Loginads.css';
import Logot from '../icons/logot.png';
import Imglogin from '../icons/imglogin.png';
import { useNavigate } from 'react-router-dom';

function Loginads() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accessError, setAccessError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const validateForm = () => {
    let isValid = true;
    
    // Réinitialiser les erreurs
    setUsernameError('');
    setPasswordError('');
    setError('');
    setAccessError('');
    
    // Vérifier le nom d'utilisateur
    if (!username.trim()) {
      setUsernameError('Le nom d\'utilisateur est requis');
      isValid = false;
    }
    
    // Vérifier le mot de passe
    if (!password) {
      setPasswordError('Le mot de passe est requis');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Valider le formulaire avant de soumettre
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Tentative de connexion pour:', username);
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      console.log('Réponse du serveur:', data);
      
      if (data.success) {
        console.log('Connexion réussie avec le rôle:', data.user.role);
        
        // Stocker les infos utilisateur dans le localStorage ou sessionStorage
        const storageMethod = rememberMe ? localStorage : sessionStorage;
        storageMethod.setItem('user', JSON.stringify(data.user));
        
        // Rediriger vers la page appropriée en fonction du rôle
       if (data.user.role === 'supadmin') {
          navigate('/AdminRoutes/Tableaudebord');
        }else if (data.user.role === 'admin') {
          navigate('/SousAdminRoutes/Tableaudebord');
        }
         else if (data.user.role === 'chauffeur') {
          navigate('/ChauffeurRoutes/Plandejour');
        } else {
          setAccessError('Vous n\'avez pas la permissions nécessaires pour accéder à cette section.');
      }
      } else {
        // Traiter les types d'erreurs spécifiques
        if (data.errorType === 'username') {
          setUsernameError(data.message);
        } else if (data.errorType === 'password') {
          setPasswordError(data.message);
        } else if (response.status === 403) {
          // Erreur d'accès non autorisé
          setAccessError(data.message || 'Vous n\'avez pas l\'autorisation d\'accéder au système.');
        } else {
          // Afficher l'erreur générale
          setError(data.message || 'Échec de connexion');
        }
        
        console.error('Erreur de connexion:', data.message);
      }
    } catch (err) {
      setError('Erreur de serveur. Veuillez réessayer.');
      console.error('Erreur de connexion:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      {/* Partie gauche */}
      <div className="login-left">
        <img src={Logot} alt="Sonatrach Transport" />
        <h2>Connexion</h2>
        
        {/* Afficher l'erreur globale d'authentification */}
        {error && <div className="global-error">{error}</div>}
        
        {/* Afficher l'erreur d'accès non autorisé */}
        {accessError && (
          <div className="access-error">
            <i className="fas fa-exclamation-triangle"></i>
            {accessError}
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit}>
          {usernameError && <div className="field-error">{usernameError}</div>}
          <label>Nom d'utilisateur</label>
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={usernameError ? "input-error" : ""}
            required
          />
          
          {passwordError && <div className="field-error">{passwordError}</div>}
          <label>Mot de passe</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={passwordError ? "input-error" : ""}
            required
          />
          
          <div className="remember-me">
            <input 
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember">Souvenez-vous de moi</label>
          </div>
          
          <button 
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Connecter'}
          </button>
        </form>
      </div>
      
      {/* Partie droite */}
      <div className="login-right">
        <div className="overlay">
          <img src={Imglogin} alt="Sonatrach" />
        </div>
      </div>
    </div>
  );
}

export default Loginads;