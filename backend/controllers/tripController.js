const pool = require('../config/db');

// Route pour créer un trajet
exports.posttrajets = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      ligne_id, ligne_number, depart, arrivee, jours,
      heure_depart, heure_arrivee, duree, chauffeur,
      vehicule, statut, arrets, sens,
      date_debut, date_fin, active_dates, numero_chauffeur, nombre_places
    } = req.body;

    // Sauvegarde du trajet principal
    const result = await client.query(
      `INSERT INTO trajets (
        ligne_id, ligne_number, depart, arrivee, jours,
        heure_depart, heure_arrivee, duree, chauffeur,
        vehicule, statut, arrets, sens,
        date_debut, date_fin, active_dates, numero_chauffeur, nombre_places
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        ligne_id || null, 
        ligne_number, 
        depart, 
        arrivee, 
        jours,
        heure_depart, 
        heure_arrivee, 
        duree || '', 
        chauffeur || '',
        vehicule || '', 
        statut || 'Actif', 
        arrets ? JSON.stringify(arrets) : null,
        sens || 'aller',
        date_debut || null,
        date_fin || null,
        active_dates ? JSON.stringify(active_dates) : null,
        numero_chauffeur || '',
        nombre_places || 0
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Trajet créé avec succès',
      trajet: result.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du trajet:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la création du trajet',
      details: err.message 
    });
  } finally {
    client.release();
  }
};

// Route pour récupérer les trajets
exports.gettrajets = async (req, res) => {
  try {
    const { chauffeur } = req.query;

    if (!chauffeur) {
      return res.status(400).json({ 
        success: false, 
        error: 'Paramètre "chauffeur" manquant' 
      });
    }

    // Requête modifiée pour une meilleure correspondance
    const query = `
      SELECT t.*, l.name as ligne_name 
      FROM trajets t
      LEFT JOIN lines l ON t.ligne_id = l.id
      WHERE TRIM(t.chauffeur) ILIKE TRIM($1)
      ORDER BY t.heure_depart ASC
    `;

    const result = await pool.query(query, [`%${chauffeur}%`]);
    console.log('Résultats de la requête:', result.rows); // Debug

    res.json(result.rows);
  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur',
      details: err.message 
    });
  }
};

// Route pour mettre à jour un trajet
exports.updatetrajets = async (req, res) => {
  const client = await pool.connect();
  const trajetId = req.params.id;
  
  try {
    await client.query('BEGIN');
    
    const {
      ligne_id, ligne_number, depart, arrivee, jours,
      heure_depart, heure_arrivee, duree, chauffeur,
      vehicule, statut, arrets, sens,
      date_debut, date_fin, active_dates, numero_chauffeur, nombre_places
    } = req.body;

    // Validation des champs
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(heure_depart) || !timeRegex.test(heure_arrivee)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'Format de temps invalide. Utilisez HH:MM' 
      });
    }

    // Mise à jour du trajet
    const result = await client.query(
      `UPDATE trajets SET
        ligne_id = $1,
        ligne_number = $2,
        depart = $3,
        arrivee = $4,
        jours = $5,
        heure_depart = $6,
        heure_arrivee = $7,
        duree = $8,
        chauffeur = $9,
        vehicule = $10,
        statut = $11,
        arrets = $12,
        sens = $13,
        date_debut = $14,
        date_fin = $15,
        active_dates = $16,
        numero_chauffeur = $17,
        nombre_places = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *`,
      [
        ligne_id || null, 
        ligne_number, 
        depart, 
        arrivee, 
        jours,
        heure_depart, 
        heure_arrivee, 
        duree || '', 
        chauffeur || '',
        vehicule || '', 
        statut || 'Actif', 
        arrets ? JSON.stringify(arrets) : null,
        sens || 'aller',
        date_debut || null,
        date_fin || null,
        active_dates ? JSON.stringify(active_dates) : null,
        numero_chauffeur || '',
        nombre_places || 0,
        trajetId
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Trajet non trouvé' 
      });
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Trajet mis à jour avec succès',
      trajet: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour du trajet:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la mise à jour du trajet',
      details: err.message 
    });
  } finally {
    client.release();
  }
};

// Route pour supprimer un trajet
exports.deletetrajets = async (req, res) => {
  const client = await pool.connect();
  const trajetId = req.params.id;
  
  try {
    await client.query('BEGIN');
    
    // Option: Supprimer aussi le trajet retour associé si besoin
    // Vous pouvez ajouter cette logique si vous voulez supprimer les paires aller-retour
    
    const result = await client.query(
      'DELETE FROM trajets WHERE id = $1 RETURNING *',
      [trajetId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Trajet non trouvé' 
      });
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
    
      trajet: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du trajet:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la suppression du trajet',
      details: err.message 
    });
  } finally {
    client.release();
  }
};

// Nouvelle méthode pour récupérer un seul trajet
exports.getTrajetById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de trajet invalide',
        message: 'L\'ID doit être un nombre valide'
      });
    }

    const result = await client.query(
      `SELECT t.*, l.name as ligne_name 
       FROM trajets t
       LEFT JOIN lines l ON t.ligne_id = l.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Trajet non trouvé',
        message: `Aucun trajet trouvé avec l'ID ${id}`
      });
    }

    const trajet = result.rows[0];
    
    // Conversion des champs JSON
    try {
      if (trajet.arrets) {
        trajet.arrets = typeof trajet.arrets === 'string' 
          ? JSON.parse(trajet.arrets) 
          : trajet.arrets;
      }
      if (trajet.active_dates) {
        trajet.active_dates = typeof trajet.active_dates === 'string' 
          ? JSON.parse(trajet.active_dates) 
          : trajet.active_dates;
      }
    } catch (e) {
      console.error("Erreur de parsing des données JSON:", e);
      // On garde les valeurs originales si le parsing échoue
    }

    res.json({
      success: true,
      trajet: trajet
    });
  } catch (err) {
    console.error('Erreur getTrajetById:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la récupération du trajet',
      details: err.message 
    });
  } finally {
    client.release();
  }
};
//for bouchra 