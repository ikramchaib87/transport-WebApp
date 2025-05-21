const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const transporter = require('../config/email');
router.post('/', async (req, res) => {
  try {
    const {
      dateVoyage,
      heureReelle,
      categorie,
      description,
      employeeId,
      employeeMatricule,
      employeeNom,
      employeePrenom,
      employeeLigne,
      employeeArret,  // Nouveau champ pour le nom de l'arrêt
      employeeStopPosition  // Nouveau champ pour la position de l'arrêt
    } = req.body;

    const result = await pool.query(
      `INSERT INTO reclamations (
        date_voyage, heure_reelle, categorie, description,
        employee_id, employee_matricule, employee_nom, 
        employee_prenom, employee_ligne, employee_stop_name,
        employee_stop_position, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Nouvelle') 
      RETURNING *`,
      [
        dateVoyage,
        heureReelle,
        categorie,
        description,
        employeeId,
        employeeMatricule,
        employeeNom,
        employeePrenom,
        employeeLigne,
        employeeArret,    // Nom de l'arrêt
        employeeStopPosition // Position de l'arrêt
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur création réclamation:', error);
    res.status(500).json({ 
      message: "Erreur serveur",
      detail: error.message
    });
  }
});
// Récupérer toutes les réclamations
// Récupérer toutes les réclamations
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT r.*, e.email as employee_email
      FROM reclamations r
      JOIN employes e ON r.employee_id = e.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE r.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY r.date_soumission DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération réclamations:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      detail: error.message
    });
  }
});
// Traiter une réclamation
router.put('/:id/traiter', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, commentaire } = req.body;

    // Récupérer la réclamation avec l'email de l'employé via une jointure
    const reclamationQuery = `
      SELECT r.*, e.email as employee_email
      FROM reclamations r
      JOIN employes e ON r.employee_id = e.id
      WHERE r.id = $1
    `;
    
    const reclamationResult = await pool.query(reclamationQuery, [id]);

    if (reclamationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Réclamation non trouvée' });
    }

    const reclamation = reclamationResult.rows[0];
    const email = reclamation.employee_email;

    // Validation du statut
    const validStatuses = ['Nouvelle', 'En cours', 'Résolue', 'Rejetée'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // Mettre à jour la réclamation
    const updateResult = await pool.query(
      `UPDATE reclamations 
       SET status = $1, 
           commentaire_gestionnaire = $2,
           date_traitement = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, commentaire, id]
    );

    // Envoyer l'email de réponse seulement si l'email existe
    if (email) {
      try {
        const mailOptions = {
          from: '"Service Transport" <bouchraboukhalfa013@gmail.com>',
          to: email,
          subject: `Mise à jour de votre réclamation #${id}`,
          html: `
            <h2>Votre réclamation a été mise à jour</h2>
            <p><strong>Numéro de réclamation:</strong> #${id}</p>
            <p><strong>Nouveau statut:</strong> ${status}</p>
            ${commentaire ? `<p><strong>Réponse de l'administrateur:</strong></p>
            <p>${commentaire}</p>` : ''}
            <p>Cordialement,<br/>L'équipe Transport</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email envoyé à ${email} pour la réclamation #${id}`);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        // On continue même si l'email échoue
      }
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erreur traitement réclamation:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      detail: error.message
    });
  }
});
module.exports = router;