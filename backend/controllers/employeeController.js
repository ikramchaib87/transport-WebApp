const { ldap, LDAP_URL, LDAP_SEARCH_BASE, LDAP_GROUP_BASE } = require('../config/ldap');
const pool = require('../config/db');

exports.getEmployees = async (req, res) => {
  try {
    const { rows } = await pool.query(`
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
        e.statut,
        e.created_at,
        e.updated_at,
        l.id as line_id,
        l.number as line_number,
        l.name as line_name,
        l.depart as line_depart,
        l.arrivee as line_arrivee
      FROM employes e
      LEFT JOIN lines l ON e.line_id = l.id
      ORDER BY e.nom, e.prenom
    `);
    
    res.json({ 
      success: true, 
      employes: rows,
      message: 'Liste des employés récupérée avec succès'
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des employés' 
    });
  }
};
exports.getEmployeesid = async (req, res) => {
try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT 
        e.*,
        l.id as line_id,
        l.number as line_number,
        l.name as line_name
      FROM employes e
      LEFT JOIN lines l ON e.line_id = l.id
      WHERE e.id = $1 OR e.ldap_id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employé non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      employe: rows[0],
      message: 'Employé récupéré avec succès'
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de l\'employé' 
    });
  }
};
exports.getemployessearch = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Le terme de recherche est requis'
      });
    }
    
    const searchTerm = `%${q}%`;
    
    const { rows } = await pool.query(`
      SELECT 
        e.id,
        e.ldap_id,
        e.nom,
        e.prenom,
        e.email,
        e.photo_url,
        l.number as line_number,
        l.name as line_name
      FROM employes e
      LEFT JOIN lines l ON e.line_id = l.id
      WHERE 
        e.ldap_id ILIKE $1 OR
        e.nom ILIKE $1 OR
        e.prenom ILIKE $1 OR
        e.email ILIKE $1 OR
        e.commune ILIKE $1 OR
        e.wilaya ILIKE $1 OR
        l.name ILIKE $1 OR
        l.number::text ILIKE $1
      LIMIT 20
    `, [searchTerm]);
    
    res.json({ 
      success: true, 
      results: rows,
      message: 'Résultats de la recherche'
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la recherche' 
    });
  }
};