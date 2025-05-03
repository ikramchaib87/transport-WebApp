import React, { useState, useEffect } from "react";
import "./Affectation.css";
import { format, parse, isValid } from "date-fns";
import { fr } from "date-fns/locale";

const Affecter = ({ isOpen, onClose, onAddReservation, reservationToEdit }) => {
  
  const [formData, setFormData] = useState({
    bus: "",
    chauffeur: "",
    date_prise_charge: "",
    raison_modification: ""
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [buses, setBuses] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [busDetails, setBusDetails] = useState(null);
  const [chauffeurDetails, setChauffeurDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction utilitaire pour normaliser et valider les formats de date
  const normalizeDateFormat = (dateStr) => {
    if (!dateStr) return "";
    
    // Si c'est déjà au format YYYY-MM-DD, on le garde tel quel
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Si c'est au format DD/MM/YYYY, on le convertit
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Pour les autres formats, on essaie de créer une date valide
    try {
      const date = new Date(dateStr);
      if (isValid(date)) {
        return format(date, 'yyyy-MM-dd');
      }
    } catch (e) {
      console.error("Erreur de conversion de date:", e);
    }
    
    // Si rien ne fonctionne, on retourne la chaîne originale
    return dateStr;
  };

  // Générer les options pour les jours, mois et années
  const jours = Array.from({ length: 31 }, (_, i) => i + 1);
  const mois = [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" }
  ];
  const anneeActuelle = new Date().getFullYear();
  const annees = Array.from({ length: 10 }, (_, i) => anneeActuelle + i);

  const fetchData = async (url) => {
    try {
      setLoading(true);
      const response = await fetch(url);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Réponse non-JSON reçue: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur inconnue");
      }

      return data;
    } catch (err) {
      console.error(`Erreur lors de la requête à ${url}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const busesData = await fetchData("http://localhost:5000/api/buses");
        const availableBuses = Array.isArray(busesData) ? 
          busesData.filter(bus => bus.statut === "disponible" || 
            (reservationToEdit && bus.id === parseInt(reservationToEdit.bus_id))) :
          [];

        const chauffeursData = await fetchData("http://localhost:5000/api/chauffeurs");
        const availableChauffeurs = chauffeursData.chauffeurs?.filter(
          chauffeur => chauffeur.disponibilite === "Disponible" || 
            (reservationToEdit && (chauffeur.id === reservationToEdit.chauffeur_id || 
                                 chauffeur.ldap_id === reservationToEdit.chauffeur_id))
        ) || [];

        setBuses(availableBuses);
        setChauffeurs(availableChauffeurs);

        if (reservationToEdit) {
          // Pour une édition, on récupère et normalise la date
          const normalizedDate = normalizeDateFormat(reservationToEdit.date_prise_charge);
          
          setFormData({
            bus: reservationToEdit.bus_id ? reservationToEdit.bus_id.toString() : "",
            chauffeur: reservationToEdit.chauffeur_id || "",
            date_prise_charge: normalizedDate,
            raison_modification: reservationToEdit.raison_modification || ""
          });
          
          // On met à jour la date sélectionnée pour l'affichage des sélecteurs
          try {
            const parsedDate = parse(normalizedDate, 'yyyy-MM-dd', new Date());
            if (isValid(parsedDate)) {
              setSelectedDate(parsedDate);
            } else {
              setSelectedDate(new Date());
            }
          } catch (err) {
            console.error("Erreur lors du parsing de la date:", err);
            setSelectedDate(new Date());
          }
        } else {
          // Pour une nouvelle affectation, on utilise la date d'aujourd'hui
          const today = new Date();
          const formattedToday = format(today, 'yyyy-MM-dd');
          
          setFormData({
            bus: "",
            chauffeur: "",
            date_prise_charge: formattedToday,
            raison_modification: ""
          });
          
          setSelectedDate(today);
        }
      } catch (err) {
        setError(`Erreur de chargement: ${err.message}`);
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, reservationToEdit]);

  useEffect(() => {
    if (formData.bus) {
      const selected = buses.find((b) => b.id.toString() === formData.bus);
      setBusDetails(selected);
    } else {
      setBusDetails(null);
    }
  }, [formData.bus, buses]);

  useEffect(() => {
    if (formData.chauffeur) {
      const selected = chauffeurs.find((c) => c.ldap_id === formData.chauffeur);
      setChauffeurDetails(selected);
    } else {
      setChauffeurDetails(null);
    }
  }, [formData.chauffeur, chauffeurs]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    // Créer une nouvelle date basée sur la date actuellement sélectionnée
    const newDate = new Date(selectedDate);
    
    // Mettre à jour la partie appropriée de la date
    if (name === "jour") {
      newDate.setDate(parseInt(value));
    } else if (name === "mois") {
      // Les mois sont indexés à partir de 0 en JavaScript
      newDate.setMonth(parseInt(value) - 1);
    } else if (name === "annee") {
      newDate.setFullYear(parseInt(value));
    }
    
    // Vérifier que la date est valide
    if (isValid(newDate)) {
      // Mettre à jour la date sélectionnée
      setSelectedDate(newDate);
      
      // Mettre à jour le format de date pour l'API (YYYY-MM-DD)
      setFormData(prev => ({
        ...prev,
        date_prise_charge: format(newDate, 'yyyy-MM-dd')
      }));
    } else {
      console.error("Date invalide générée:", newDate);
    }
  };

  const handleSubmit = async () => {
    if (!formData.bus || !formData.chauffeur || !formData.date_prise_charge) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
  
    // Si c'est une modification et qu'on change de bus ou chauffeur, 
    // on doit fournir une raison
    if (reservationToEdit && 
        (formData.bus !== reservationToEdit.bus_id.toString() || 
         formData.chauffeur !== reservationToEdit.chauffeur_id) &&
        !formData.raison_modification) {
      setError("Veuillez indiquer la raison de la modification");
      return;
    }

    setLoading(true);
    setError(null);
  
    try {
      // S'assurer que la date est au format YYYY-MM-DD
      const dateToSend = formData.date_prise_charge;
      
      // Nous allons toujours envoyer la date au format YYYY-MM-DD
      // Mais nous vérifions qu'elle est bien valide avant
      if (!dateToSend.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Format de date invalide. Utilisez le format YYYY-MM-DD.");
      }
      
      const affectationData = {
        bus_id: parseInt(formData.bus),
        chauffeur_id: formData.chauffeur,
        date_prise_charge: dateToSend
      };
      
      // Ajouter la raison de modification si c'est une modification
      if (reservationToEdit) {
        affectationData.raison_modification = formData.raison_modification;
      }
      
      console.log("Données envoyées à l'API:", affectationData);
      
      const method = reservationToEdit ? "PUT" : "POST";
      const endpoint = reservationToEdit 
        ? `http://localhost:5000/api/affectations/${reservationToEdit.id}`
        : "http://localhost:5000/api/affectations";
        
      const response = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(affectationData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'enregistrement");
      }
  
      const result = await response.json();
      const affectation = result.affectation || result;
      
      onAddReservation(affectation);
      onClose();
    } catch (err) {
      setError(`Erreur: ${err.message}`);
      console.error("Erreur lors de l'envoi:", err);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le jour, mois et année à partir de selectedDate
  const getSelectedDay = () => selectedDate.getDate().toString().padStart(2, '0');
  const getSelectedMonth = () => (selectedDate.getMonth() + 1).toString().padStart(2, '0');
  const getSelectedYear = () => selectedDate.getFullYear().toString();

  // Formatter la date pour l'affichage
  const getFormattedDate = () => {
    return isValid(selectedDate) 
      ? format(selectedDate, 'dd/MM/yyyy', { locale: fr })
      : "";
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="reservation-overlay" onClick={onClose}></div>
      <div className="reservation-modal">
        <h2 className="reservation-title">
          {reservationToEdit ? "Modifier une affectation" : "Nouvelle affectation"}
        </h2>

        {loading && <p className="loading-message">Chargement en cours...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="reservation-form">
          <div className="form-group">
            <label htmlFor="bus">Bus:</label>
            <select
              id="bus"
              name="bus"
              value={formData.bus}
              onChange={handleChange}
              disabled={loading}
              className="form-select"
            >
              <option value="">Sélectionner un bus</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.matricule} - {bus.marque} {bus.modele} ({bus.nb_places} places)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="chauffeur">Chauffeur:</label>
            <select
              id="chauffeur"
              name="chauffeur"
              value={formData.chauffeur}
              onChange={handleChange}
              disabled={loading}
              className="form-select"
            >
              <option value="">Sélectionner un chauffeur</option>
              {chauffeurs.map((chauffeur) => (
                <option key={chauffeur.ldap_id} value={chauffeur.ldap_id}>
                  {chauffeur.nom} {chauffeur.prenom} (Matricule: {chauffeur.matricule})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date de mise en charge:</label>
            <div className="date-selector">
              <div className="date-select-group">
                <select 
                  name="jour" 
                  value={getSelectedDay()}
                  onChange={handleDateChange}
                  disabled={loading}
                  className="date-select"
                >
                  <option value="">Jour</option>
                  {jours.map(jour => (
                    <option key={jour} value={jour.toString().padStart(2, '0')}>
                      {jour}
                    </option>
                  ))}
                </select>
                
                <select 
                  name="mois" 
                  value={getSelectedMonth()}
                  onChange={handleDateChange}
                  disabled={loading}
                  className="date-select"
                >
                  <option value="">Mois</option>
                  {mois.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                
                <select 
                  name="annee" 
                  value={getSelectedYear()}
                  onChange={handleDateChange}
                  disabled={loading}
                  className="date-select"
                >
                  <option value="">Année</option>
                  {annees.map(annee => (
                    <option key={annee} value={annee.toString()}>
                      {annee}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {reservationToEdit && (
              <div className="form-group">
                <label htmlFor="raison_modification">Raison de modification:</label>
                <select
                  id="raison_modification"
                  name="raison_modification"
                  value={formData.raison_modification}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-select"
                >
                  <option value="">Sélectionner une raison</option>
                  <option value="bus_en_panne">Bus en panne</option>
                  <option value="chauffeur_absent">Chauffeur absent</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            )}
            {getFormattedDate() && (
              <span className="date-formatted">
                Date sélectionnée: {getFormattedDate()}
              </span>
            )}
          </div>
        </div>

        {(busDetails || chauffeurDetails) && (
          <div className="reservation-summary">
            <h3>Résumé de l'affectation</h3>
            {busDetails && (
              <p>
                <strong>Bus:</strong> {busDetails.marque} {busDetails.modele} (
                {busDetails.matricule})
              </p>
            )}
            {chauffeurDetails && (
              <p>
                <strong>Chauffeur:</strong> {chauffeurDetails.nom}{" "}
                {chauffeurDetails.prenom}
              </p>
            )}
            {busDetails && (
              <p>
                <strong>Places disponibles:</strong> {busDetails.nb_places}
              </p>
            )}
            {getFormattedDate() && (
              <p>
                <strong>Date de mise en charge:</strong> {getFormattedDate()}
              </p>
            )}
          </div>
        )}

        <div className="reservation-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {reservationToEdit ? "Modifier" : "Affecter"}
          </button>
        </div>
      </div>
    </>
  );
};

export default Affecter;