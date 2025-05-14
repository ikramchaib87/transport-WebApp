const pool = require('../config/db');

// Get all assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.statut,
        a.raison_modification,
        a.date_prise_charge,
        a.line_id,
        b.matricule AS matricule_bus,
        b.marque AS marque_bus,
        b.modele,
        b.nb_places AS places_disponibles,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom,
        l.number AS line_number,
        l.name AS line_name,
        l.depart,
        l.arrivee
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      LEFT JOIN lines l ON a.line_id = l.id
      ORDER BY a.id DESC
    `);
    
    const affectations = result.rows.map(row => ({
      id: row.id,
      bus_id: row.bus_id,
      chauffeur_id: row.chauffeur_id,
      matriculeBus: row.matricule_bus,
      marqueBus: row.marque_bus,
      modele: row.modele,
      placesDisponibles: row.places_disponibles,
      matriculeChauffeur: row.matricule_chauffeur,
      nomChauffeur: `${row.nom} ${row.prenom}`,
      statut: row.statut,
      date_prise_charge: row.date_prise_charge,
      raison_modification: row.raison_modification,
      line_id: row.line_id,
      line_number: row.line_number,
      line_name: row.line_name,
      depart: row.depart,
      arrivee: row.arrivee
    }));
   
    res.json({ success: true, affectations });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
};

// Create new assignment
exports.createAssignment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { bus_id, chauffeur_id, date_prise_charge } = req.body;
    
    if (!bus_id || !chauffeur_id || !date_prise_charge) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'affectation incomplètes'
      });
    }

    await client.query('BEGIN');

    // Check bus availability
    const busCheck = await client.query(
      'SELECT id, statut FROM bus WHERE id = $1',
      [bus_id]
    );
    
    if (busCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Bus non trouvé'
      });
    }
    
    if (busCheck.rows[0].statut !== 'disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le bus sélectionné n\'est pas disponible'
      });
    }

    // Check driver availability
    const chauffeurCheck = await client.query(
      'SELECT ldap_id, disponibilite FROM chauffeurs WHERE ldap_id = $1',
      [chauffeur_id]
    );
    
    if (chauffeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Chauffeur non trouvé'
      });
    }
    
    if (chauffeurCheck.rows[0].disponibilite !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le chauffeur sélectionné n\'est pas disponible'
      });
    }

    // Create assignment
    const result = await client.query(
      `INSERT INTO affectations 
      (bus_id, chauffeur_id, date_prise_charge, statut, created_at, updated_at) 
      VALUES ($1, $2, $3, 'actif', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *`,
      [bus_id, chauffeur_id, date_prise_charge]
    );

    // Update bus status
    await client.query(
      'UPDATE bus SET statut = $1 WHERE id = $2',
      ['affecté', bus_id]
    );

    // Update driver availability
    await client.query(
      'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
      ['En service', chauffeur_id]
    );

    await client.query('COMMIT');

    // Get full details
    const details = await client.query(
      `SELECT 
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.date_prise_charge,
        b.matricule AS matricule_bus,
        b.marque,
        b.modele,
        b.nb_places,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      affectation: {
        id: details.rows[0].id,
        bus_id: details.rows[0].bus_id,
        chauffeur_id: details.rows[0].chauffeur_id,
        matriculeBus: details.rows[0].matricule_bus,
        matriculeChauffeur: details.rows[0].matricule_chauffeur,
        placesDisponibles: details.rows[0].nb_places,
        nomChauffeur: `${details.rows[0].nom} ${details.rows[0].prenom}`,
        marqueBus: details.rows[0].marque,
        modele: details.rows[0].modele,
        date_prise_charge: details.rows[0].date_prise_charge
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'affectation',
      error: err.message
    });
  } finally {
    client.release();
  }
};

// Update assignment
exports.updateAssignment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { bus_id, chauffeur_id, raison_modification, date_prise_charge } = req.body;
    
    console.log("Données reçues:", { 
      id, 
      bus_id, 
      chauffeur_id, 
      raison_modification, 
      date_prise_charge,
      date_type: typeof date_prise_charge 
    });
    
    if (!bus_id || !chauffeur_id || !date_prise_charge) {
      return res.status(400).json({
        success: false,
        message: 'Données d\'affectation incomplètes'
      });
    }

    // Format date
    let formattedDate;
    try {
      if (typeof date_prise_charge === 'string' && date_prise_charge.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedDate = date_prise_charge;
      } else {
        const parsedDate = new Date(date_prise_charge);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Format de date invalide');
        }
        formattedDate = parsedDate.toISOString().split('T')[0];
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: `Format de date invalide: ${err.message}`
      });
    }

    await client.query('BEGIN');

    // Check existing assignment
    const affectationCheck = await client.query(
      'SELECT bus_id, chauffeur_id, date_prise_charge FROM affectations WHERE id = $1',
      [id]
    );
    
    if (affectationCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }

    const oldBusId = affectationCheck.rows[0].bus_id;
    const oldChauffeurId = affectationCheck.rows[0].chauffeur_id;
    const oldDate = affectationCheck.rows[0].date_prise_charge;

    // Check new bus
    const busCheck = await client.query(
      'SELECT id, statut FROM bus WHERE id = $1',
      [bus_id]
    );
    
    if (busCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Nouveau bus non trouvé'
      });
    }
    
    if (bus_id !== oldBusId && busCheck.rows[0].statut !== 'disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le nouveau bus sélectionné n\'est pas disponible'
      });
    }

    // Check new driver
    const chauffeurCheck = await client.query(
      'SELECT ldap_id, disponibilite FROM chauffeurs WHERE ldap_id = $1',
      [chauffeur_id]
    );
    
    if (chauffeurCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Nouveau chauffeur non trouvé'
      });
    }
    
    if (chauffeur_id !== oldChauffeurId && chauffeurCheck.rows[0].disponibilite !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Le nouveau chauffeur sélectionné n\'est pas disponible'
      });
    }

    // Use original date if no changes
    const useDateValue = (
      bus_id === oldBusId && 
      chauffeur_id === oldChauffeurId && 
      !raison_modification
    ) ? oldDate : formattedDate;

    console.log("Date utilisée pour la mise à jour:", useDateValue);

    // Update assignment
    const result = await client.query(
      `UPDATE affectations 
      SET bus_id = $1, chauffeur_id = $2, 
          updated_at = CURRENT_TIMESTAMP, 
          raison_modification = $3,
          date_prise_charge = $4
      WHERE id = $5
      RETURNING *`,
      [bus_id, chauffeur_id, raison_modification, useDateValue, id]
    );

    // Handle bus changes
    if (bus_id !== oldBusId) {
      if (raison_modification === 'bus_en_panne') {
        await client.query(
          'UPDATE bus SET statut = $1 WHERE id = $2',
          ['en panne', oldBusId]
        );
      } else {
        await client.query(
          'UPDATE bus SET statut = $1 WHERE id = $2',
          ['disponible', oldBusId]
        );
      }
      
      await client.query(
        'UPDATE bus SET statut = $1 WHERE id = $2',
        ['affecté', bus_id]
      );
    }

    // Handle driver changes
    if (chauffeur_id !== oldChauffeurId) {
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['Disponible', oldChauffeurId]
      );
      
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['En service', chauffeur_id]
      );
    }

    await client.query('COMMIT');

    // Get full details
    const details = await client.query(
      `SELECT 
        a.id,
        a.bus_id,
        a.chauffeur_id,
        a.date_prise_charge,
        b.matricule AS matricule_bus,
        b.marque,
        b.modele,
        b.nb_places,
        c.matricule AS matricule_chauffeur,
        c.nom,
        c.prenom
      FROM affectations a
      JOIN bus b ON a.bus_id = b.id
      JOIN chauffeurs c ON a.chauffeur_id = c.ldap_id
      WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(200).json({
      success: true,
      affectation: {
        id: details.rows[0].id,
        bus_id: details.rows[0].bus_id,
        chauffeur_id: details.rows[0].chauffeur_id,
        matriculeBus: details.rows[0].matricule_bus,
        matriculeChauffeur: details.rows[0].matricule_chauffeur,
        placesDisponibles: details.rows[0].nb_places,
        nomChauffeur: `${details.rows[0].nom} ${details.rows[0].prenom}`,
        marqueBus: details.rows[0].marque,
        modele: details.rows[0].modele,
        date_prise_charge: details.rows[0].date_prise_charge,
        raison_modification: raison_modification
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la modification d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la modification de l\'affectation',
      error: err.message
    });
  } finally {
    client.release();
  }
};
// Affecter une ligne à un bus
exports.putassignline = async (req, res) => {
  const { line_id } = req.body;
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE affectations 
      SET line_id = $1 
      WHERE id = $2 
      RETURNING *,
        (SELECT number FROM lines WHERE id = $1) AS line_number,
        (SELECT name FROM lines WHERE id = $1) AS line_name,
        (SELECT depart FROM lines WHERE id = $1) AS depart,
        (SELECT arrivee FROM lines WHERE id = $1) AS arrivee
    `, [line_id, id]);

    await client.query('COMMIT');
    
    res.json({
      ...result.rows[0],
      line_number: result.rows[0].line_number,
      line_name: result.rows[0].line_name,
      depart: result.rows[0].depart,
      arrivee: result.rows[0].arrivee
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};
// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const affectationCheck = await pool.query(
      'SELECT bus_id, chauffeur_id FROM affectations WHERE id = $1',
      [id]
    );
    
    if (affectationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affectation non trouvée'
      });
    }
    
    const busId = affectationCheck.rows[0].bus_id;
    const chauffeurId = affectationCheck.rows[0].chauffeur_id;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        'DELETE FROM affectations WHERE id = $1',
        [id]
      );
      
      await client.query(
        'UPDATE bus SET statut = $1 WHERE id = $2',
        ['disponible', busId]
      );
      
      await client.query(
        'UPDATE chauffeurs SET disponibilite = $1 WHERE ldap_id = $2',
        ['Disponible', chauffeurId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Affectation supprimée avec succès'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erreur lors de la suppression d\'une affectation:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'affectation'
    });
  }
};
