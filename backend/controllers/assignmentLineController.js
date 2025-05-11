const pool = require('../config/db');
// Bus assignment methods
exports.assignBusToLine = async (req, res) => {
  const { busId, lineId } = req.body;
  
  try {
    // Vérifier si le bus est déjà affecté à n'importe quelle ligne
    const existingAssignment = await pool.query(
      'SELECT id FROM bus_line_assignments WHERE bus_id = $1',
      [busId]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce bus est déjà affecté à une ligne'
      });
    }

    // Vérifier si la combinaison bus/ligne existe déjà
    const existingCombination = await pool.query(
      'SELECT id FROM bus_line_assignments WHERE bus_id = $1 AND line_id = $2',
      [busId, lineId]
    );

    if (existingCombination.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce bus est déjà affecté à cette ligne'
      });
    }

    // Si tout est OK, créer l'affectation
    const result = await pool.query(
      `INSERT INTO bus_line_assignments (bus_id, line_id) 
       VALUES ($1, $2) 
       RETURNING *`,
      [busId, lineId]
    );

    res.status(201).json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.unassignBusFromLine = async (req, res) => {
  const { busId, lineId } = req.body;
  
  try {
    const result = await pool.query(
      `DELETE FROM bus_line_assignments 
       WHERE bus_id = $1 AND line_id = $2 
       RETURNING *`,
      [busId, lineId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Affectation non trouvée' });
    }

    res.json({ success: true, message: 'Affectation supprimée' });
  } catch (err) {
    console.error('Erreur lors de la désaffectation:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getBusAssignments = async (req, res) => {
  const { busId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT l.id as line_id, l.number as line_number, l.name as line_name, 
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN lines l ON a.line_id = l.id
       WHERE a.bus_id = $1`,
      [busId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Erreur lors de la récupération des affectations:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getLineAssignments = async (req, res) => {
  const { lineId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT b.id as bus_id, b.matricule, b.marque, b.modele, 
              b.chauffeur_nom, b.chauffeur_prenom, b.statut,
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN external_buses b ON a.bus_id = b.id
       WHERE a.line_id = $1`,
      [lineId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Erreur lors de la récupération des affectations:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

exports.getAllBusLineAssignments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, l.number as line_number, l.name as line_name, 
             l.depart, l.arrivee
      FROM bus_line_assignments a
      JOIN lines l ON a.line_id = l.id
      WHERE a.is_active = TRUE
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
exports.getbusassignmentsbusId = async (req, res) => {
 const { busId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT l.id as line_id, l.number as line_number, l.name as line_name, 
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN lines l ON a.line_id = l.id
       WHERE a.bus_id = $1 AND a.is_active = TRUE`,
      [busId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Error fetching bus assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
  };
  // Get assignments for a specific line
exports.getlineassignmentslineId = async (req, res) => {
  const { lineId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT b.id as bus_id, b.matricule, b.marque, b.modele, 
              b.chauffeur_nom, b.chauffeur_prenom, b.statut,
              a.assigned_at, a.is_active
       FROM bus_line_assignments a
       JOIN external_buses b ON a.bus_id = b.id
       WHERE a.line_id = $1 AND a.is_active = TRUE`,
      [lineId]
    );

    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Error fetching line assignments:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};