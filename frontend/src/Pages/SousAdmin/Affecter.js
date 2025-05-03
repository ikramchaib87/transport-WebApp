import React, { useState, useEffect } from "react";
import "./Affectation.css";

const Affecter = ({ isOpen, onClose, onAddReservation, reservationToEdit }) => {
  const [formData, setFormData] = useState({
    bus: "",
    chauffeur: "",
    date_prise_charge: "",
  });

  const [dateInputs, setDateInputs] = useState({
    jour: "",
    mois: "",
    annee: ""
  });

  const [buses, setBuses] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [busDetails, setBusDetails] = useState(null);
  const [chauffeurDetails, setChauffeurDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
          setFormData({
            bus: reservationToEdit.bus_id ? reservationToEdit.bus_id.toString() : "",
            chauffeur: reservationToEdit.chauffeur_id || "",
            date_prise_charge: reservationToEdit.date_prise_charge || ""
          });

          if (reservationToEdit.date_prise_charge) {
            let dateParts;
            try {
              if (reservationToEdit.date_prise_charge.includes('/')) {
                dateParts = reservationToEdit.date_prise_charge.split('/');
                setDateInputs({
                  jour: dateParts[0].padStart(2, '0'),
                  mois: dateParts[1].padStart(2, '0'),
                  annee: dateParts[2]
                });
              } else {
                const date = new Date(reservationToEdit.date_prise_charge);
                setDateInputs({
                  jour: date.getDate().toString().padStart(2, '0'),
                  mois: (date.getMonth() + 1).toString().padStart(2, '0'),
                  annee: date.getFullYear().toString()
                });
              }
            } catch (e) {
              console.error("Erreur de conversion de date:", e);
            }
          }
        } else {
          setFormData({
            bus: "",
            chauffeur: "",
            date_prise_charge: ""
          });
          
          const today = new Date();
          setDateInputs({
            jour: today.getDate().toString().padStart(2, '0'),
            mois: (today.getMonth() + 1).toString().padStart(2, '0'),
            annee: today.getFullYear().toString()
          });
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

  useEffect(() => {
    if (dateInputs.jour && dateInputs.mois && dateInputs.annee) {
      const dateAPI = `${dateInputs.annee}-${dateInputs.mois}-${dateInputs.jour}`;
      
      setFormData(prev => ({
        ...prev,
        date_prise_charge: dateAPI
      }));
    }
  }, [dateInputs]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateInputs(prev => ({
      ...prev,
      [name]: value.padStart(2, '0')
    }));
  };

  const handleSubmit = async () => {
    if (!formData.bus || !formData.chauffeur || !formData.date_prise_charge) {
      setError("Veuillez remplir tous les champs");
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      const affectationData = {
        bus_id: parseInt(formData.bus),
        chauffeur_id: formData.chauffeur,
        date_prise_charge: formData.date_prise_charge
      };
      
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

  const getFormattedDate = () => {
    if (dateInputs.jour && dateInputs.mois && dateInputs.annee) {
      return `${dateInputs.jour}/${dateInputs.mois}/${dateInputs.annee}`;
    }
    return "";
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
                  value={dateInputs.jour}
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
                  value={dateInputs.mois}
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
                  value={dateInputs.annee}
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