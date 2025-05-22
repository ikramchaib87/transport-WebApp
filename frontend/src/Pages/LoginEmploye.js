import React, { useState } from 'react';
import './LoginEmploye.css';
import logo from '../icons/logo.png';
import Imglogin from '../icons/imglogin.png';
import { useNavigate } from 'react-router-dom';

function LoginEmploye() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [accessError, setAccessError] = useState('');
    const [transportRequestError, setTransportRequestError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const validateForm = () => {
        let isValid = true;
        
        // Réinitialiser les erreurs
        setUsernameError('');
        setPasswordError('');
        setError('');
        setAccessError('');
        setTransportRequestError('');
        
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
                if (data.user.role === 'employe') {
                    navigate('/EmployeRoutes/Accueille');
                } else {
                    // Si l'utilisateur n'est pas un employé, afficher un message d'erreur
                    setAccessError('Vous n\'avez pas les permissions nécessaires pour accéder à cette section. Cette page est réservée aux employés.');
                }
            } else {
                // Traiter les types d'erreurs spécifiques
                if (data.errorType === 'username') {
                    setUsernameError(data.message);
                } else if (data.errorType === 'password') {
                    setPasswordError(data.message);
                } else if (data.errorType === 'transport_request') {
                    // Nouvelle condition pour les demandes de transport non approuvées
                    setTransportRequestError(data.message);
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

    // Fonction pour naviguer vers la page de demande sans authentification
    const handleDemandeTransport = (e) => {
        e.preventDefault();
        navigate('/EmployeRoutes/Demande');
    };

    return (
        <div className="loginEmp-container">
            {/* Partie gauche */}
            <div className="loginEmp-left">
                <img src={logo} alt="Sonatrach Transport" className="logoEmp" />
                
                
                {/* Afficher l'erreur globale d'authentification */}
                {error && <div className="global-error">{error}</div>}
                
                {/* Afficher l'erreur d'accès non autorisé */}
                {accessError && (
                    <div className="access-error">
                        <i className="fas fa-exclamation-triangle"></i>
                        {accessError}
                    </div>
                )}
                
                {/* Afficher l'erreur spécifique pour les demandes de transport */}
                {transportRequestError && (
                    <div className="access-error">
                        <i className="fas fa-exclamation-circle"></i>
                        {transportRequestError}
                        
                    </div>
                )}
                
                <form className="loginEmp-form" onSubmit={handleSubmit}>
                    <h2 className="cox">Connexion Employé</h2>
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
                    
                    <div className="rememberEmp-me">
                        <input 
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="remember">Souvenez-vous de moi</label>
                    </div>
                    
                    <div className="buttonEmp-group">
                        <button 
                            className="loginEmp-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Connexion...' : 'Connecter'}
                        </button>
                        <button 
                            className="requestEmp-button" 
                            type="button"
                            onClick={handleDemandeTransport}
                        >
                            Demande de Transport
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Partie droite */}
            <div className="loginEmp-right">
                <div className="overlayEmp">
                    <img src={Imglogin} alt="Sonatrach" />
                </div>
            </div>
        </div>
    );
}

export default LoginEmploye;