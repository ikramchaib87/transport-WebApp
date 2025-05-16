const pool = require('../config/db');
// Route pour créer un trajet
exports.posttrajets = async (req, res) => {
  const client = await pool.connect();
  
 try {
    await client.query('BEGIN');
    
    const {
      ligne_id, ligne_number, depart, arrivee, jours,
      heure_depart, heure_arrivee, duree, chauffeur,
      vehicule, statut, arrets, remarques
    } = req.body;

    // Validate time formats
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(heure_depart) || !timeRegex.test(heure_arrivee)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'Format de temps invalide. Utilisez HH:MM' 
      });
    }

    const result = await client.query(
      `INSERT INTO trajets (
        ligne_id, ligne_number, depart, arrivee, jours,
        heure_depart, heure_arrivee, duree, chauffeur,
        vehicule, statut, arrets, remarques
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        remarques || ''
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du trajet:', err);
    
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la création du trajet' 
    });
  } finally {
    client.release();
  }
};

// Route pour récupérer les trajets
exports.gettrajets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, l.name as ligne_name 
      FROM trajets t
      LEFT JOIN lines l ON t.ligne_id = l.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des trajets:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
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
      vehicule, statut, arrets, remarques
    } = req.body;

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(heure_depart) || !timeRegex.test(heure_arrivee)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'Format de temps invalide. Utilisez HH:MM' 
      });
    }

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
        remarques = $13,
        updated_at = NOW()
      WHERE id = $14
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
        remarques || '',
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
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour du trajet:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la mise à jour du trajet' 
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
      message: 'Trajet supprimé avec succès' 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du trajet:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la suppression du trajet' 
    });
  } finally {
    client.release();
  }
};