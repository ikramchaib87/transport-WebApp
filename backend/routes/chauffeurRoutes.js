const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Route unifiée pour les données du chauffeur
router.get('/chauffeur-data', async (req, res) => {
  try {
    const { username, isExternal } = req.query;

    if (isExternal === 'true') {
      // Logique existante pour les chauffeurs externes
      const result = await pool.query(`
        SELECT 
          eb.id, 
          eb.chauffeur_nom, 
          eb.chauffeur_prenom, 
          eb.chauffeur_matricule,
          eb.photo_chauffeur_url,
          eb.marque,
          eb.modele,
          eb.matricule,
          tc.name as company_name
        FROM external_buses eb
        JOIN transport_companies tc ON eb.company_id = tc.id
        WHERE eb.username = $1 AND eb.statut = 'Actif'
      `, [username]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur externe non trouvé' });
      }

      return res.json(result.rows[0]);
    } else {
      // Nouvelle logique pour les chauffeurs internes (LDAP)
      // 1. Récupérer les infos de base du chauffeur
      const chauffeurResult = await pool.query(`
        SELECT 
          c.id,
          c.ldap_id,
          c.matricule,
          c.nom,
          c.prenom,
          c.photo_url as photo_chauffeur_url,
          c.statut
        FROM chauffeurs c
        WHERE c.ldap_id = $1 AND c.is_active = true
      `, [username]);

      if (chauffeurResult.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur interne non trouvé' });
      }

      const chauffeur = chauffeurResult.rows[0];

      // 2. Récupérer l'affectation active (bus + ligne)
      const affectationResult = await pool.query(`
        SELECT 
          a.bus_id,
          a.line_id,
          b.marque,
          b.modele,
          b.matricule as bus_matricule,
          l.name as line_name
        FROM affectations a
        LEFT JOIN bus b ON a.bus_id = b.id
        LEFT JOIN lines l ON a.line_id = l.id
        WHERE a.chauffeur_id = $1 AND a.statut = 'actif'
        ORDER BY a.date_prise_charge DESC
        LIMIT 1
      `, [username]);

      const affectation = affectationResult.rows[0] || null;

      res.json({
        id: chauffeur.id,
        chauffeur_nom: chauffeur.nom,
        chauffeur_prenom: chauffeur.prenom,
        chauffeur_matricule: chauffeur.matricule,
        photo_chauffeur_url: chauffeur.photo_chauffeur_url || '/uploads/chauffeurs/default.jpg',
        marque: affectation?.marque || null,
        modele: affectation?.modele || null,
        matricule: affectation?.bus_matricule || null,
        company_name: "Transport Interne",
        line_id: affectation?.line_id || null,
        line_name: affectation?.line_name || null
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des données du chauffeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour la ligne assignée (simplifiée car déjà incluse dans chauffeur-data)
router.get('/affectations-chauffeur', async (req, res) => {
  try {
    const { bus_id, isExternal, username } = req.query;
    
    if (isExternal === 'true') {
      // Pour les chauffeurs externes (logique existante)
      const result = await pool.query(`
        SELECT l.id as line_id, l.name as line_name
        FROM bus_line_assignments bla
        JOIN lines l ON bla.line_id = l.id
        WHERE bla.bus_id = $1 AND bla.is_active = true
      `, [bus_id]);

      return res.json(result.rows[0] || null);
    } else {
      // Pour les chauffeurs internes (récupération simplifiée)
      const result = await pool.query(`
        SELECT 
          l.id as line_id, 
          l.name as line_name
        FROM affectations a
        JOIN lines l ON a.line_id = l.id
        WHERE a.chauffeur_id = $1 AND a.statut = 'actif'
        ORDER BY a.date_prise_charge DESC
        LIMIT 1
      `, [username]);

      res.json(result.rows[0] || null);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la ligne assignée:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Nouvelle route pour les données du profil
router.get('/profil-chauffeur', async (req, res) => {
  const { username, isExternal } = req.query;

  try {
    if (isExternal === 'true') {
      // 1. CHAUFFEUR EXTERNE
      const chauffeurExterne = await pool.query(`
        SELECT 
          eb.chauffeur_nom AS nom,
          eb.chauffeur_prenom AS prenom,
          eb.chauffeur_matricule AS matricule,
          eb.photo_chauffeur_url AS photo_url,
          eb.marque AS busMarque,
          eb.modele AS busModele,
          eb.matricule AS busMatricule,
          eb.tel,
          eb.email,
          tc.contract_start AS dateContrat,
          tc.contract_end AS dateFinContrat,
          tc.name AS company_name
        FROM external_buses eb
        JOIN transport_companies tc ON eb.company_id = tc.id
        WHERE eb.username = $1 AND eb.statut = 'Actif'
      `, [username]);

      if (chauffeurExterne.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur externe non trouvé' });
      }

      res.json({
        ...chauffeurExterne.rows[0],
        type: 'Externe'
      });

    } else {
      // 2. CHAUFFEUR INTERNE
      const chauffeurInterne = await pool.query(`
        SELECT 
          c.nom,
          c.prenom,
          c.matricule,
          c.photo_url,
          c.tel,
          c.email,
          a.date_prise_charge AS dateMiseEnCharge,
          b.marque AS busMarque,
          b.modele AS busModele,
          b.matricule AS busMatricule,
          b.type_eng AS busTypeEng,
          b.couleur AS busCouleur,
          b.kilometrage AS busKilometrage
        FROM chauffeurs c
        LEFT JOIN affectations a ON c.ldap_id = a.chauffeur_id AND a.statut = 'actif'
        LEFT JOIN bus b ON a.bus_id = b.id
        WHERE c.ldap_id = $1 AND c.is_active = true
      `, [username]);

      if (chauffeurInterne.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur interne non trouvé' });
      }

      res.json({
        ...chauffeurInterne.rows[0],
        type: 'Interne',
        dateRetour: 'N/A' // À adapter si vous avez ce champ
      });
    }
  } catch (error) {
    console.error('Erreur API profil-chauffeur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;