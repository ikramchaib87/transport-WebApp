import React, { useState, useEffect, useMemo } from "react";
import "./Demande.css";
import Logot from "../../icons/logot.png";

const TransportRequest = () => {
  // Les données initiales du formulaire
  const [formData, setFormData] = useState({
    name: "",
    prenom: "",
    email: "",
    phone: "",
    adresse: "",
    commune: "",
    wilaya: "",
    itineraire: "",
    matricule: "",
    fonction: "",
    post: "",
    affectation: "",
    indemnity: false,
    prime: false,
    image: null,
  });

  // États pour les validations et chargements
  const [validations, setValidations] = useState({
    emailVerified: false,
    matriculeVerified: false,
    hasExistingRequest: false
  });

  const [isLoading, setIsLoading] = useState({
    email: false,
    matricule: false,
    verifyCode: false,
    checkingExistingRequest: false
  });
  
  // États pour la vérification d'email
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  // Ajoutez ces états pour la validation de l'image
  const [imageError, setImageError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [availableLines, setAvailableLines] = useState([]);
  //ligne 
  const [showCustomItineraire, setShowCustomItineraire] = useState(false);
  const fetchAvailableLines = async () => {
 
    try {
      const response = await fetch('http://localhost:5000/api/lines');
      const data = await response.json();
      setAvailableLines(data);
    } catch (error) {
      console.error('Error fetching lines:', error);
    }
};


  fetchAvailableLines();
  


  // Liste des wilayas d'Algérie
  const wilayas = useMemo(() => [
     "Blida",  "Alger"
  ], []);

  // Dictionnaire des communes par wilaya - Utiliser useMemo pour éviter la recréation à chaque render
  const communesByWilaya = useMemo(() => {
    const communes = {
      "Alger": [
        "Alger Centre", "Sidi M'Hamed", "El Madania", "Belouizdad", "Bab El Oued", 
        "Bologhine", "Casbah", "Oued Koriche", "Bir Mourad Raïs", "El Biar", 
        "Bouzareah", "Birkhadem", "El Harrach", "Baraki", "Oued Smar", "Bachdjerrah", 
        "Hussein Dey", "Kouba", "Bourouba", "Dar El Beïda", "Bab Ezzouar", "Ben Aknoun", 
        "Dely Ibrahim", "El Hammamet", "Raïs Hamidou", "Djasr Kasentina", "El Mouradia", 
        "Hydra", "Mohammadia", "Bordj El Kiffan", "El Magharia", "Beni Messous", 
        "Les Eucalyptus", "Birtouta", "Tessala El Merdja", "Ouled Chebel", "Sidi Moussa", 
        "Aïn Taya", "Bordj El Bahri", "El Marsa", "Haraoua", "Rouiba", "Reghaïa", 
        "Aïn Benian", "Staoueli", "Zeralda", "Mahelma", "Rahmania", "Souidania", 
        "Cheraga", "Ouled Fayet", "El Achour", "Draria", "Douera", "Baba Hassen", 
        "Khraicia", "Saoula"
      ],
      "Blida": [
        "Blida", "Chebli", "Bouinan", "Oued El Alleug", "Ouled Yaïch", "Chréa", 
        "El Affroun", "Chiffa", "Hammam Melouane", "Benkhelil", "Soumaa", "Guerrouaou", 
        "Boufarik", "Souhane", "Mouzaïa", "Bougara", "Beni Tamou", "Bouarfa", "Beni Mered", 
        "Meftah", "Ouled Slama", "Djebabra", "Sidi Moussa"
      ],
      // Ajoutez les autres wilayas et leurs communes ici
    };

    // Ajouter des communes par défaut pour les wilayas non spécifiées
    wilayas.forEach(wilaya => {
      if (!communes[wilaya]) {
        communes[wilaya] = ["Commune principale", "Autre commune"];
      }
    });

    return communes;
  }, [wilayas]);


  const fonction = useMemo(() => [
    "Ingénieur",
    "Technicien",
    "Administrateur",
    "Cadre",
    "Agent de maîtrise",
    "Opérateur" 
  ], []);

  // État pour stocker les communes filtrées en fonction de la wilaya sélectionnée
  const [filteredCommunes, setFilteredCommunes] = useState([]);
  
  // Filtrer les communes chaque fois que la wilaya change
  useEffect(() => {
    if (formData.wilaya) {
      setFilteredCommunes(communesByWilaya[formData.wilaya] || []);
      // Réinitialiser la commune si la wilaya change
      setFormData(prev => ({ ...prev, commune: "" }));
    } else {
      setFilteredCommunes([]);
    }
  }, [formData.wilaya, communesByWilaya]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Reset verification when matricule or email changes
    if (name === 'matricule' && validations.matriculeVerified) {
      setValidations(prev => ({ 
        ...prev, 
        matriculeVerified: false,
        hasExistingRequest: false  // Réinitialiser aussi cette valeur
      }));
    } else if (name === 'email' && validations.emailVerified) {
      setValidations(prev => ({ ...prev, emailVerified: false }));
      setShowVerificationInput(false); // Hide verification input if email changes
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setImageError(null);
    setImagePreview(null);
    
    if (!file) return;
    
    // Vérifier le type de fichier
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setImageError("Format invalide. Utilisez JPEG ou PNG.");
      return;
    }
    
    // Vérifier la taille (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setImageError("L'image ne doit pas dépasser 2 MB.");
      return;
    }
    
    // Vérifier les dimensions de l'image
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src); // Libérer la mémoire
      
      if (img.width < 200 || img.height < 200) {
        setImageError("L'image doit avoir au moins 200x200 pixels.");
        return;
      }
      
      if (img.width > 1000 || img.height > 1000) {
        setImageError("L'image ne doit pas dépasser 1000x1000 pixels.");
        return;
      }
      
      // Si tout est valide, mettre à jour l'aperçu et le formData
      setImagePreview(URL.createObjectURL(file));
      setFormData({ ...formData, image: file });
    };
    
    img.onerror = () => {
      setImageError("Erreur lors du traitement de l'image.");
    };
    
    img.src = URL.createObjectURL(file);
  };

  const verifyEmail = async () => {
    if (!formData.email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Format d'email invalide.");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, email: true }));
    
    try {
      // Appel à l'API pour envoyer un code de vérification
      const response = await fetch('http://localhost:3001/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Si le code a été envoyé avec succès, montrer le formulaire de vérification
        setShowVerificationInput(true);
        alert("Un code de vérification a été envoyé à votre adresse email.");
      } else {
        alert(data.message || "Erreur d'envoi du code de vérification.");
      }
    } catch (error) {
      console.error("Erreur d'envoi du code de vérification:", error);
      alert("Erreur de connexion au serveur. Veuillez réessayer.");
    } finally {
      setIsLoading(prev => ({ ...prev, email: false }));
    }
  };
  
  const checkVerificationCode = async () => {
    if (!verificationCode) {
      alert("Veuillez entrer le code de vérification.");
      return;
    }
    
    setIsLoading(prev => ({ ...prev, verifyCode: true }));
    
    try {
      const response = await fetch('http://localhost:3001/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          code: verificationCode 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.verified) {
        setValidations(prev => ({
          ...prev,
          emailVerified: true
        }));
        setShowVerificationInput(false);
        alert("Email vérifié avec succès!");
      } else {
        alert(data.message || "Code de vérification incorrect.");
      }
    } catch (error) {
      console.error("Erreur de vérification du code:", error);
      alert("Erreur de connexion au serveur. Veuillez réessayer.");
    } finally {
      setIsLoading(prev => ({ ...prev, verifyCode: false }));
    }
  };

  
  // Modification de la fonction frontend pour séparer les vérifications
  const verifyMatricule = async () => {
    if (!formData.matricule) return;
    
    setIsLoading(prev => ({ ...prev, matricule: true }));
    
    try {
      // 1. Première étape: Vérification du matricule dans LDAP uniquement
      console.log("Envoi de la requête de vérification pour matricule:", formData.matricule);
      const response = await fetch('http://localhost:3001/api/verify-matricule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: formData.matricule })
      });
      
      console.log("Statut de la réponse:", response.status);
      
      // Vérifier si la réponse est OK
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      // Lire le texte de la réponse pour le débogage
      const responseText = await response.text();
      console.log("Réponse texte brute:", responseText);
      
      // Parser le JSON manuellement pour attraper les erreurs de syntaxe
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Erreur de parsing JSON:", parseError);
        throw new Error("Format de réponse invalide");
      }
      
      console.log("Données JSON parsées:", data);
      
      // Vérifier si la réponse est un succès
      if (!data.success) {
        alert(data.message || "Erreur de vérification du matricule.");
        return;
      }
      
      // Vérifier si le matricule existe
      if (!data.exists) {
        setValidations(prev => ({
          ...prev,
          matriculeVerified: false,
          hasExistingRequest: false
        }));
        alert("Matricule invalide ou employé non trouvé dans le système.");
        return;
      }
      
      // Si le matricule est valide, pré-remplir les champs
      if (data.data) {
        setFormData(prev => ({
          ...prev,
          name: data.data.lastName || prev.name,
          prenom: data.data.firstName || prev.prenom,
          email: data.data.email || prev.email,
        }));
      }
      
      // 2. Deuxième étape: Vérification de l'existence d'une demande antérieure
      console.log("Vérification des demandes existantes pour matricule:", formData.matricule);
      const existingResponse = await fetch('http://localhost:3001/api/check-existing-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: formData.matricule })
      });
      
      if (!existingResponse.ok) {
        throw new Error(`Erreur HTTP check-existing: ${existingResponse.status}`);
      }
      
      const existingResponseText = await existingResponse.text();
      console.log("Réponse texte check-existing:", existingResponseText);
      
      let existingData;
      try {
        existingData = JSON.parse(existingResponseText);
      } catch (parseError) {
        console.error("Erreur de parsing JSON (check-existing):", parseError);
        throw new Error("Format de réponse invalide pour check-existing");
      }
      
      console.log("Données check-existing:", existingData);
      
      if (!existingData.success) {
        alert("Erreur lors de la vérification des demandes existantes.");
        return;
      }
      
      // Mettre à jour les validations
      setValidations(prev => ({
        ...prev,
        matriculeVerified: true,
        hasExistingRequest: existingData.hasExistingRequest
      }));
      
      // Afficher le message approprié
      if (existingData.hasExistingRequest) {
        alert("Vous avez déjà une demande de transport en cours ou approuvée. Vous ne pouvez pas soumettre une nouvelle demande.");
      } else {
        alert("Matricule vérifié avec succès!");
      }
      
    } catch (error) {
      console.error("Erreur détaillée:", error);
      alert("Erreur de connexion au serveur. Veuillez réessayer.");
    } finally {
      setIsLoading(prev => ({ ...prev, matricule: false }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (isSubmitting) return;
  if (!validations.matriculeVerified) {
    alert("Veuillez vérifier votre matricule avant de soumettre le formulaire.");
    return;
  }
  if (!validations.emailVerified) {
    alert("Veuillez vérifier votre email avant de soumettre le formulaire.");
    return;
  }
  if (!formData.image) {
    alert("Veuillez télécharger une photo d'identité.");
    return;
  }

  setIsSubmitting(true);
  
  try {
    const formDataToSubmit = new FormData();
    
    // Ajouter tous les champs
    Object.keys(formData).forEach(key => {
      if (key !== 'image') {
        formDataToSubmit.append(key, formData[key]);
      }
    });
    
    // Ajouter un champ pour indiquer si c'est un itinéraire personnalisé
    formDataToSubmit.append('isCustomItinerary', showCustomItineraire.toString());
    
    if (formData.image) {
      formDataToSubmit.append('image', formData.image);
    }
    
    const response = await fetch('http://localhost:3001/api/submit-transport-request', {
      method: 'POST',
      body: formDataToSubmit,
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Demande soumise avec succès ! Référence: TR-${data.requestId}`);
      window.location.href = "../../LoginEmploye";
    } else {
      alert(data.message || "Erreur lors de la soumission de la demande.");
      setIsSubmitting(false);
    }
  } catch (error) {
    console.error("Erreur de connexion au serveur:", error);
    alert("Erreur de connexion au serveur. Veuillez réessayer.");
    setIsSubmitting(false);
  }
};

  
  return (
    <div className="demande">
      <div className="demande-header">
        <div className="demande-logo">
          <img src={Logot} alt="Sonatrach Transport" />
        </div>
        <div className="demande-title">Demande de transport</div>
      </div>
      
      <div className="demande-container">
        <div className="demande-form-box">
          <form onSubmit={handleSubmit} className="demande-form">
            <h2 className="transport-title">Fiche de Renseignement</h2>

            <div className="demande-content">
              {/* Left column - Personal info */}
              <div className="demande-left-column">
              <div className="form-group">
                    <label>Matricule *</label>
                    <div className="email-input-group">
                      <input 
                        type="text" 
                        name="matricule" 
                        placeholder="Entrez matricule" 
                        value={formData.matricule}
                        onChange={handleChange} 
                        required 
                        className={validations.matriculeVerified ? validations.hasExistingRequest ? "verified-warning" : "verified" : ""}
                      />
                      <button 
                        type="button" 
                        className={`btn-verify ${validations.matriculeVerified ? validations.hasExistingRequest ? "verified-warning" : "verified" : ""}`}
                        onClick={verifyMatricule}
                        disabled={isLoading.matricule || !formData.matricule}
                      >
                        {isLoading.matricule ? "..." : 
                         validations.matriculeVerified ? 
                          validations.hasExistingRequest ? "⚠️ Existant" : "✓ Vérifié" 
                          : "Vérifier"}
                      </button>
                    </div>
                   
                  </div>

                <div className="form-group">
                  <label>Nom *</label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Entrez votre nom" 
                    value={formData.name}
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Prénom *</label>
                  <input 
                    type="text" 
                    name="prenom" 
                    placeholder="Entrez votre prénom" 
                    value={formData.prenom}
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>E-mail *</label>
                  <div className="email-input-group">
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="Entrez votre email" 
                      value={formData.email}
                      onChange={handleChange} 
                      required 
                      className={validations.emailVerified ? "verified" : ""}
                    />
                    <button 
                      type="button" 
                      className={`btn-verify ${validations.emailVerified ? "verified" : ""}`}
                      onClick={verifyEmail}
                      disabled={isLoading.email || !formData.email || validations.emailVerified}
                    >
                      {isLoading.email ? "..." : validations.emailVerified ? "✓ Vérifié" : "Vérifier"}
                    </button>
                  </div>
                  
                  {/* Champ de vérification du code */}
                  {showVerificationInput && !validations.emailVerified && (
                    <div className="verification-code-container">
                      <div className="verification-input-group">
                        <input 
                          type="text" 
                          placeholder="Entrez le code de vérification" 
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="verification-input"
                        />
                        <button 
                          type="button" 
                          className="btn-verify-code"
                          onClick={checkVerificationCode}
                          disabled={isLoading.verifyCode || !verificationCode}
                        >
                          {isLoading.verifyCode ? "..." : "Vérifier le code"}
                        </button>
                      </div>
                      <p className="verification-help">Un code à 6 chiffres a été envoyé à votre adresse email.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column - Image upload */}
              <div className="demande-right-column">
              <div className="upload-container">
              <p className="upload-title">Insérer une photo d'identité</p>
              <div className="upload-area">
              {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block', margin: '10px' }}>
        <img 
          src={imagePreview} 
          alt="Aperçu" 
          style={{ 
            maxWidth: '150px', 
            maxHeight: '150px', 
            borderRadius: '4px', 
            border: '1px solid #ddd' 
          }} 
        />
        <button 
          type="button" 
          onClick={() => {
            setFormData({...formData, image: null});
            setImagePreview(null);
          }}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            background: '#ff4d4f',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '16px',
            lineHeight: '1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    ) : (
      <>
        <p>Déposez votre photo d'identité ici</p>
        <div className="upload-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 5v25M20 5l-7 7M20 5l7 7M3 30v5h34v-5" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
        <p className="upload-formats">Formats acceptés: JPEG, PNG (max 2MB)</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Dimensions: 200x200 px minimum, 1000x1000 px maximum
        </p>
      </>
    )}
    {imageError && (
      <p style={{ color: '#ff4d4f', marginTop: '5px', fontSize: '12px' }}>
        {imageError}
      </p>
    )}
    <input 
      type="file" 
      className="file-input"
      accept="image/png, image/jpeg" 
      onChange={handleImageUpload} 
      required 
    />
     </div>
     </div>
              </div>
            </div>

            {/* Bottom section - Phone, Address, Employment details */}
            <div className="bottom-section">
              {/* Phone and Address details */}
              <div className="address-section">
                <div className="form-group">
                  <label>Numéro de téléphone *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    placeholder="Entrez votre numéro" 
                    value={formData.phone}
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Adresse Personnelle Exacte *</label>
                  <input 
                    type="text" 
                    name="adresse" 
                    placeholder="Entrez votre adresse" 
                    value={formData.adresse}
                    onChange={handleChange} 
                    required 
                  />
                </div>

                <div className="address-row">
                  <div className="form-group">
                    <label>Wilaya *</label>
                    <select 
                      name="wilaya" 
                      value={formData.wilaya}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionnez une wilaya</option>
                      {wilayas.map((wilaya, index) => (
                        <option key={index} value={wilaya}>{wilaya}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Commune *</label>
                    <select 
                      name="commune" 
                      value={formData.commune}
                      onChange={handleChange}
                      required
                      disabled={!formData.wilaya}
                    >
                      <option value="">Sélectionnez une commune</option>
                      {filteredCommunes.map((commune, index) => (
                        <option key={index} value={commune}>{commune}</option>
                      ))}
                    </select>
                  </div>
                  
                 <div className="form-group">
  <label>L'itinéraire exact *</label>
  {!showCustomItineraire ? (
    <>
      <select
        name="itineraire"
        value={formData.itineraire}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setShowCustomItineraire(true);
            setFormData({...formData, itineraire: ""});
          } else {
            handleChange(e);
          }
        }}
        required
      >
        <option value="">Sélectionnez un itinéraire</option>
        {availableLines.map(line => (
          <option key={line.id} value={line.id}>
            Ligne {line.number} - {line.name} ({line.depart} → {line.arrivee})
          </option>
        ))}
        <option value="custom">Mon itinéraire n'est pas dans la liste</option>
      </select>
    </>
  ) : (
    <div className="custom-itineraire-container">
      <input
        type="text"
        name="itineraire"
        placeholder="Décrivez votre itinéraire personnalisé"
        value={formData.itineraire}
        onChange={handleChange}
        required
        className="custom-itineraire-input"
      />
      <button
        type="button"
        className="btn-back-to-list"
        onClick={() => {
          setShowCustomItineraire(false);
             setFormData({...formData, itineraire: ""});
                 }}
                >
                Retour à la liste
               </button>
                </div>
                   )}
               </div>
                </div>
              </div>

              {/* Employment details */}
              <div className="employment-details">
                <div className="employee-row">
                 
                  <div className="form-group">
                    <label>Fonction *</label>
                    <select 
                      name="fonction" 
                      value={formData.fonction}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionnez une Fonction </option>
                      {fonction.map((fonction, index) => (
                        <option key={index} value={fonction}>{fonction}</option>
                      ))}
                     
                    </select>
                  </div>

                  <div className="form-group">
                    <label>N° Post *</label>
                    <input 
                      type="text" 
                      name="post" 
                      placeholder="Entrez N° Post" 
                      value={formData.post}
                      onChange={handleChange} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Affectation</label>
                    <input 
                      type="text" 
                      name="affectation" 
                      placeholder="Entrez affectation" 
                      value={formData.affectation}
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      name="indemnity" 
                      checked={formData.indemnity}
                      onChange={handleChange} 
                      required 
                    />
                    <span className="checkmark"></span>
                    <span className="label-text">
                      L'intéressé(e) déclare ne pas percevoir l'indemnité forfaitaire d'amortissement (IFA)
                    </span>
                  </label>
                  
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      name="prime" 
                      checked={formData.prime}
                      onChange={handleChange} 
                       required 
                    />
                    <span className="checkmark"></span>
                    <span className="label-text">
                      L'intéressé(e) déclare ne pas percevoir la prime de transport
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="button-container">
              <button type="reset" className="btn-cancel"><a href="../../LoginEmploye">Annuler</a></button>
              <button 
              type="submit" 
              className="btn-submit" 
              disabled={!validations.matriculeVerified || !validations.emailVerified || validations.hasExistingRequest || isSubmitting}
               >
               {isSubmitting ? "Traitement en cours..." : "Soumettre"}
             </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransportRequest;