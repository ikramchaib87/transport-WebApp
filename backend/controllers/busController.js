const pool = require('../config/db');

// 1. Récupérer tous les bus
exports.getAllBuses = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places FROM bus'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// API pour ajouter un nouveau bus
exports.createBus = async (req, res) => {
  try {
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places } = req.body;
    
    // Par défaut, le statut est "disponible" pour un nouveau bus
    const busStatut = statut || 'disponible';
    
    const result = await pool.query(
      'INSERT INTO bus (matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, busStatut, annee, nb_places]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de l\'ajout d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 3. Mettre à jour un bus
exports.updateBus = async (req, res) => {
    try {
    const { id } = req.params;
    
    // Vérifier d'abord si le bus existe et s'il est déjà affecté
    const checkBus = await pool.query('SELECT statut FROM bus WHERE id = $1', [id]);
    
    if (checkBus.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
    // Si le bus est affecté, on ne permet pas la modification
    if (checkBus.rows[0].statut === 'affecté') {
      return res.status(403).json({ 
        error: 'Modification interdite', 
        message: 'Impossible de modifier un bus avec le statut "affecté"' 
      });
    }
    
    const { matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places } = req.body;
    
    const result = await pool.query(
      'UPDATE bus SET matricule = $1, marque = $2, modele = $3, type_energie = $4, couleur = $5, kilometrage = $6, type = $7, statut = $8, annee = $9, nb_places = $10 WHERE id = $11 RETURNING *',
      [matricule, marque, modele, type_energie, couleur, kilometrage, type, statut, annee, nb_places, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 4. Supprimer un bus
exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM bus WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bus non trouvé' });
    }
    
    res.json({ message: 'Bus supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression d\'un bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 5. Rechercher des bus
exports.searchBuses = async (req, res) => {
  try {
    const { query } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM bus WHERE matricule ILIKE $1 OR marque ILIKE $1 OR modele ILIKE $1 OR couleur ILIKE $1 OR type ILIKE $1',
      [`%${query}%`]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la recherche de bus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};