const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Route pour les données employé
router.get('/employe-data', async (req, res) => {
  try {
    const { username, uidNumber } = req.query; // Recevoir les deux paramètres

    if (!username || !uidNumber) {
      return res.status(400).json({ 
        error: 'Paramètres username et uidNumber requis' 
      });
    }

    // Requête directe avec le uidNumber
   const result = await pool.query(`
      SELECT 
        e.id,
        e.ldap_id,
        e.nom,
        e.prenom,
        e.email,
        e.telephone,
        e.fonction,
        e.post,
        e.affectation,
        e.photo_url,
        e.adresse,
        e.commune,
        e.wilaya,
        e.statut as transport_status,
        l.name as line_name,
        l.number as line_number,
        s.name as stop_name,
        s.position as stop_position
      FROM employes e
      LEFT JOIN lines l ON e.line_id = l.id
      LEFT JOIN stops s ON e.stop_id = s.id
      WHERE e.ldap_id = $1
      AND e.statut = 'Actif'
      LIMIT 1
    `, [uidNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Employé non trouvé pour ce uidNumber' 
      });
    }
    const data = result.rows[0];
    const photoFilename = data.photo_url ? data.photo_url.split('/').pop() : null;
     // Construction du chemin de la photo
    let photoPath = '/uploads/default.jpg'; // Chemin par défaut
    if (data.photo_url) {
      // Supprimer le chemin complet si déjà présent
      const filename = data.photo_url.replace(/^.*[\\\/]/, '');
      photoPath = `/uploads/${filename}`;
    }

    res.json({
      id: data.id,
      ldap_id: data.ldap_id,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone,
      fonction: data.fonction,
      post: data.post,
      affectation: data.affectation,
       photo_url: photoFilename ? `/uploads/${photoFilename}` : '/uploads/default.jpg',
      adresse: data.adresse,
      commune: data.commune,
      wilaya: data.wilaya,
      transport_status: data.transport_status,
      line_name: data.line_name,
      line_number: data.line_number,
      stop_name: data.stop_name,
      stop_position: data.stop_position
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des données de l\'employé:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
});

module.exports = router;