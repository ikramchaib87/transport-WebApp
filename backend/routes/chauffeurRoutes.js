const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Middleware CORS
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Route principale pour les données chauffeur
router.get('/chauffeur-data', async (req, res) => {
  try {
    const { username, isExternal } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username manquant' });
    }

    if (isExternal === 'true') {
      // Requête pour chauffeurs externes
      const result = await pool.query(`
        SELECT 
          eb.id, 
          eb.chauffeur_nom, 
          eb.chauffeur_prenom, 
          eb.chauffeur_matricule,
          eb.photo_chauffeur_url,
          eb.telephone,
          eb.email,
          eb.marque,
          eb.modele,
          eb.matricule,
          eb.type_eng,
          eb.couleur,
          eb.kilometrage,
          tc.name as company_name,
          tc.contract_start,
          l.name as line_name,
          l.number as line_number
        FROM external_buses eb
        JOIN transport_companies tc ON eb.company_id = tc.id
        LEFT JOIN bus_line_assignments bla ON eb.id = bla.bus_id AND bla.is_active = true
        LEFT JOIN lines l ON bla.line_id = l.id
        WHERE eb.username = $1 AND eb.statut = 'Actif'
      `, [username]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur externe non trouvé' });
      }

      const data = result.rows[0];
      return res.json({
        id: data.id,
        chauffeur_nom: data.chauffeur_nom,
        chauffeur_prenom: data.chauffeur_prenom,
        chauffeur_matricule: data.chauffeur_matricule,
        photo_chauffeur_url: data.photo_chauffeur_url,
        telephone: data.telephone,
        email: data.email,
        marque: data.marque,
        modele: data.modele,
        matricule: data.matricule,
        type_eng: data.type_eng,
        couleur: data.couleur,
        kilometrage: data.kilometrage,
        company_name: data.company_name,
        contract_start: data.contract_start,
        line_name: data.line_name,
        line_number: data.line_number
      });

    } else {
      // Requête pour chauffeurs internes
      const chauffeurResult = await pool.query(`
        SELECT 
          c.id,
          c.ldap_id,
          c.matricule,
          c.nom,
          c.prenom,
          c.tel,
          c.email,
          c.photo_url as photo_chauffeur_url,
          c.statut
        FROM chauffeurs c
        WHERE c.ldap_id = $1 AND c.is_active = true
      `, [username]);

      if (chauffeurResult.rows.length === 0) {
        return res.status(404).json({ error: 'Chauffeur interne non trouvé' });
      }

      const chauffeur = chauffeurResult.rows[0];
      
      const affectationResult = await pool.query(`
        SELECT 
          a.bus_id,
          a.line_id,
          a.date_prise_charge,
          b.marque,
          b.modele,
          b.matricule as bus_matricule,
          b.type_energie,
          b.couleur,
          b.kilometrage,
          l.name as line_name,
          l.number as line_number
        FROM affectations a
        LEFT JOIN bus b ON a.bus_id = b.id
        LEFT JOIN lines l ON a.line_id = l.id
        WHERE a.chauffeur_id = $1 AND a.statut = 'actif'
        ORDER BY a.date_prise_charge DESC
        LIMIT 1
      `, [username]);

      const affectation = affectationResult.rows[0] || {};

      return res.json({
        id: chauffeur.id,
        chauffeur_nom: chauffeur.nom,
        chauffeur_prenom: chauffeur.prenom,
        chauffeur_matricule: chauffeur.matricule,
        photo_chauffeur_url: chauffeur.photo_chauffeur_url || '/uploads/chauffeurs/default.jpg',
        telephone: chauffeur.tel,
        email: chauffeur.email,
        marque: affectation.marque,
        modele: affectation.modele,
        matricule: affectation.bus_matricule,
        type_energie: affectation.type_energie,
        couleur: affectation.couleur,
        kilometrage: affectation.kilometrage,
        company_name: "Transport Interne",
        date_prise_charge: affectation.date_prise_charge,
        line_name: affectation.line_name,
        line_number: affectation.line_number
      });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des données du chauffeur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
});

// Route pour les affectations (optionnelle si tout est dans chauffeur-data)
router.get('/affectations-chauffeur', async (req, res) => {
  try {
    const { username, isExternal } = req.query;
    
    if (isExternal === 'true') {
      const result = await pool.query(`
        SELECT 
          l.id as line_id, 
          l.name as line_name,
          l.number as line_number
        FROM bus_line_assignments bla
        JOIN lines l ON bla.line_id = l.id
        JOIN external_buses eb ON bla.bus_id = eb.id
        WHERE eb.username = $1 AND bla.is_active = true
      `, [username]);

      res.json(result.rows[0] || null);
    } else {
      const result = await pool.query(`
        SELECT 
          l.id as line_id, 
          l.name as line_name,
          l.number as line_number
        FROM affectations a
        JOIN lines l ON a.line_id = l.id
        WHERE a.chauffeur_id = $1 AND a.statut = 'actif'
        ORDER BY a.date_prise_charge DESC
        LIMIT 1
      `, [username]);

      res.json(result.rows[0] || null);
    }
  } catch (error) {
    console.error('Erreur affectations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;