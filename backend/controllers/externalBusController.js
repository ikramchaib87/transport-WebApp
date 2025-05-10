const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { SALT_ROUNDS } = require('../config/constants');

// Email validation helper
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.getAllBuses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT eb.*, tc.name as company_name 
      FROM external_buses eb
      JOIN transport_companies tc ON eb.company_id = tc.id
      ORDER BY tc.name, eb.matricule
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching external buses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getBusById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT eb.*, tc.name as company_name
      FROM external_buses eb
      JOIN transport_companies tc ON eb.company_id = tc.id
      WHERE eb.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }
    
    res.json({ success: true, bus: result.rows[0] });
  } catch (err) {
    console.error('Error fetching bus:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.createBus = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      company_id, matricule, marque, modele, type_eng, 
      couleur, kilometrage, annee, nb_places, chauffeur_nom, 
      chauffeur_prenom, chauffeur_matricule, email, telephone,
      username, password, statut
    } = req.body;

    await client.query('BEGIN');

    // Validate required fields
    if (!company_id || !matricule?.trim() || !marque?.trim() || !modele?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID, matricule, brand and model are required' 
      });
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Handle file upload
    const photo_chauffeur_url = req.file 
      ? `/uploads/drivers/${req.file.filename}` 
      : null;

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const result = await client.query(
      `INSERT INTO external_buses (
        company_id, matricule, marque, modele, type_eng, couleur, kilometrage,
        annee, nb_places, chauffeur_nom, chauffeur_prenom, chauffeur_matricule,
        email, telephone, photo_chauffeur_url, username, password, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        company_id, matricule.trim(), marque.trim(), modele.trim(), type_eng || null,
        couleur || null, kilometrage || 0, annee || new Date().getFullYear(),
        nb_places || null, chauffeur_nom || null, chauffeur_prenom || null,
        chauffeur_matricule || null, email || null, telephone || null,
        photo_chauffeur_url, username || null, hashedPassword, statut || 'Actif'
      ]
    );

    // Get company name for response
    const companyResult = await client.query(
      'SELECT name FROM transport_companies WHERE id = $1',
      [company_id]
    );

    await client.query('COMMIT');

    const newBus = result.rows[0];
    newBus.company_name = companyResult.rows[0]?.name;

    res.status(201).json({ success: true, bus: newBus });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding bus:', err);

    if (err.code === '23505' && err.constraint === 'external_buses_matricule_key') {
      return res.status(409).json({ 
        success: false, 
        error: 'Un bus avec ce matricule existe déjà.' 
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({ 
        success: false, 
        error: 'Entreprise existe pas' 
      });
    }

    res.status(500).json({ success: false, error: 'Erreur du serveur' });
  } finally {
    client.release();
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_id, matricule, marque, modele, type_eng, 
      couleur, kilometrage, annee, nb_places, chauffeur_nom, chauffeur_prenom,
      chauffeur_matricule, email, telephone, 
      username, password, statut
    } = req.body;
    
    // Validate required fields
    if (!company_id || !matricule?.trim() || !marque?.trim() || !modele?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID, matricule, brand and model are required' 
      });
    }
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Get current bus data to check if photo exists
    const currentBus = await pool.query(
      'SELECT photo_chauffeur_url, password FROM external_buses WHERE id = $1',
      [id]
    );
      
    if (currentBus.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }

    // Handle photo: use new photo if uploaded, otherwise keep existing one
    const photo_chauffeur_url = req.file 
      ? `/uploads/drivers/${req.file.filename}` 
      : currentBus.rows[0].photo_chauffeur_url;

    // Handle password: hash new password if provided, otherwise keep existing one
    let passwordParam;
    if (password) {
      // New password provided, hash it
      passwordParam = await bcrypt.hash(password, SALT_ROUNDS);
    } else {
      // No new password, use existing one
      passwordParam = currentBus.rows[0].password;
    }
    
    // Update record with new data
    const result = await pool.query(
      `UPDATE external_buses SET
        company_id = $1, matricule = $2, marque = $3, modele = $4, type_eng = $5, 
        couleur = $6, kilometrage = $7, annee = $8, nb_places = $9, chauffeur_nom = $10, 
        chauffeur_prenom = $11, chauffeur_matricule = $12, email = $13, telephone = $14, 
        photo_chauffeur_url = $15, username = $16, password = $17, statut = $18
      WHERE id = $19
      RETURNING *`,
      [
        company_id, 
        matricule.trim(), 
        marque.trim(), 
        modele.trim(), 
        type_eng || null, 
        couleur || null, 
        kilometrage || 0, 
        annee || new Date().getFullYear(),
        nb_places || null,
        chauffeur_nom || null,
        chauffeur_prenom || null,
        chauffeur_matricule || null, 
        email || null, 
        telephone || null,
        photo_chauffeur_url,
        username || null, 
        passwordParam, 
        statut || 'Actif',
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }
    // Get company name
    const companyName = await pool.query(
      'SELECT name FROM transport_companies WHERE id = $1',
      [company_id]
    );
    
    const updatedBus = result.rows[0];
    updatedBus.company_name = companyName.rows[0]?.name;
    
    res.json({ success: true, bus: updatedBus });
  } catch (err) {
    console.error('Erreur de mise à jour du bus:', err);
    
    if (err.code === '23505' && err.constraint === 'external_buses_matricule_key') {
      return res.status(409).json({ success: false, error: 'Bus avec ce matricule existe deja ' });
    }
    
    if (err.code === '23503') {
      return res.status(400).json({ success: false, error: 'Entreprise n\'existe pas' });
    }
    
    res.status(500).json({ success: false, error: 'Erreur du serveur' });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM external_buses WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bus non trouvé' });
    }

    res.json({ success: true, message: 'Bus supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du bus externe:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};