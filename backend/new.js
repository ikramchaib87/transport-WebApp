// Ligne de transport - Backend Express

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'transport_app',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à la base de données PostgreSQL:', err);
  } else {
    console.log('Connexion à PostgreSQL établie avec succès');
  }
});

// Initialiser les tables si elles n'existent pas encore
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS lines (
        id SERIAL PRIMARY KEY,
        number VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        depart VARCHAR(255) NOT NULL,
        arrivee VARCHAR(255) NOT NULL,
        distance VARCHAR(50),
        duree VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS stops (
        id SERIAL PRIMARY KEY,
        line_id INTEGER REFERENCES lines(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL,
        coordinates JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Tables vérifiées/créées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables:', error);
  } finally {
    client.release();
  }
}

// Initialiser la base de données au démarrage
initDatabase();

// Utility function to get a complete line with its stops
async function getCompleteLineById(id) {
  const lineResult = await pool.query('SELECT * FROM lines WHERE id = $1', [id]);
  
  if (lineResult.rows.length === 0) {
    return null;
  }
  
  const line = lineResult.rows[0];
  const stopsResult = await pool.query(
    'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
    [id]
  );
  
  line.stops = stopsResult.rows;
  return line;
}

// GET - Fetch all lines with stops
app.get('/api/lines', async (req, res) => {
  try {
    const linesResult = await pool.query(
      'SELECT * FROM lines ORDER BY number ASC'
    );
    
    // For each line, get its stops
    const lines = linesResult.rows;
    for (let line of lines) {
      const stopsResult = await pool.query(
        'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
        [line.id]
      );
      line.stops = stopsResult.rows;
    }
    
    res.json(lines);
  } catch (error) {
    console.error('Erreur lors de la récupération des lignes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des lignes' });
  }
});

// GET - Fetch a specific line by ID with its stops
app.get('/api/lines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lineResult = await pool.query(
      'SELECT * FROM lines WHERE id = $1',
      [id]
    );

    if (lineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }

    const line = lineResult.rows[0];
    
    // Get stops associated with this line
    const stopsResult = await pool.query(
      'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
      [id]
    );
    
    line.stops = stopsResult.rows;
    
    res.json(line);
  } catch (error) {
    console.error('Erreur lors de la récupération de la ligne:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la ligne' });
  }
});

// POST - Create a new line with stops
app.post('/api/lines', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { number, name, depart, arrivee, distance, duree, stops } = req.body;
    
    // Check if the number already exists
    const checkNumber = await client.query(
      'SELECT * FROM lines WHERE number = $1',
      [number]
    );
    
    if (checkNumber.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro de ligne existe déjà' });
    }
    
    // Create the line
    const lineResult = await client.query(
      `INSERT INTO lines (number, name, depart, arrivee, distance, duree) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [number, name, depart, arrivee, distance || '', duree || '']
    );

    const newLine = lineResult.rows[0];
    
    // Add stops if provided
    if (stops && Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const coordinates = stop.coordinates ? JSON.stringify(stop.coordinates) : null;
        
        await client.query(
          `INSERT INTO stops (line_id, name, position, coordinates) 
           VALUES ($1, $2, $3, $4)`,
          [newLine.id, stop.name, i + 1, coordinates]
        );
      }
    }
    // Si aucun arrêt n'est fourni, créer au moins les arrêts de départ et d'arrivée
    else if (depart && arrivee) {
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [newLine.id, depart, 1]
      );
      
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [newLine.id, arrivee, 2]
      );
    }
    
    await client.query('COMMIT');
    
    // Get the complete line with its stops
    const completeLine = await getCompleteLineById(newLine.id);
    
    res.status(201).json(completeLine);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la ligne:', error);
    res.status(400).json({ message: 'Erreur lors de la création de la ligne', error: error.message });
  } finally {
    client.release();
  }
});

// PUT - Update an existing line with its stops
app.put('/api/lines/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { number, name, depart, arrivee, distance, duree, stops } = req.body;
    
    // Check if the number already exists for another line
    const checkNumber = await client.query(
      'SELECT * FROM lines WHERE number = $1 AND id != $2',
      [number, id]
    );
    
    if (checkNumber.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro de ligne existe déjà' });
    }

    // Update the line
    const lineResult = await client.query(
      `UPDATE lines 
       SET number = $1, name = $2, depart = $3, arrivee = $4, 
           distance = $5, duree = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [number, name, depart, arrivee, distance || '', duree || '', id]
    );

    if (lineResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }

    // Delete all existing stops for this line
    await client.query('DELETE FROM stops WHERE line_id = $1', [id]);
    
    // Add new stops
    if (stops && Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const coordinates = stop.coordinates ? JSON.stringify(stop.coordinates) : null;
        
        await client.query(
          `INSERT INTO stops (line_id, name, position, coordinates) 
           VALUES ($1, $2, $3, $4)`,
          [id, stop.name, i + 1, coordinates]
        );
      }
    }
    // Si aucun arrêt n'est fourni, créer au moins les arrêts de départ et d'arrivée
    else if (depart && arrivee) {
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [id, depart, 1]
      );
      
      await client.query(
        `INSERT INTO stops (line_id, name, position) 
         VALUES ($1, $2, $3)`,
        [id, arrivee, 2]
      );
    }
    
    await client.query('COMMIT');
    
    // Get the complete updated line with its stops
    const updatedLine = await getCompleteLineById(id);
    
    res.json(updatedLine);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour de la ligne:', error);
    res.status(400).json({ message: 'Erreur lors de la mise à jour de la ligne', error: error.message });
  } finally {
    client.release();
  }
});

// DELETE - Delete a line (associated stops will be deleted automatically with ON DELETE CASCADE)
app.delete('/api/lines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the line before deleting it
    const lineToDelete = await getCompleteLineById(id);
    
    if (!lineToDelete) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    // Delete the line (and its stops thanks to ON DELETE CASCADE)
    await pool.query('DELETE FROM lines WHERE id = $1', [id]);

    res.json({ message: 'Ligne supprimée avec succès', deletedLine: lineToDelete });
  } catch (error) {
    console.error('Erreur lors de la suppression de la ligne:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la ligne' });
  }
});

// Routes to manage stops independently

// GET - Get all stops of a line
app.get('/api/lines/:lineId/stops', async (req, res) => {
  try {
    const { lineId } = req.params;
    
    // Check if the line exists
    const lineExists = await pool.query('SELECT id FROM lines WHERE id = $1', [lineId]);
    
    if (lineExists.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    const stopsResult = await pool.query(
      'SELECT * FROM stops WHERE line_id = $1 ORDER BY position ASC',
      [lineId]
    );
    
    res.json(stopsResult.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des arrêts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des arrêts' });
  }
});

// POST - Add a new stop to a line
app.post('/api/lines/:lineId/stops', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { name, position, coordinates } = req.body;
    
    // Check if the line exists
    const lineExists = await pool.query('SELECT id FROM lines WHERE id = $1', [lineId]);
    
    if (lineExists.rows.length === 0) {
      return res.status(404).json({ message: 'Ligne non trouvée' });
    }
    
    // If position is not specified, add to the end
    let finalPosition = position;
    if (!finalPosition) {
      const lastStopResult = await pool.query(
        'SELECT MAX(position) as max_pos FROM stops WHERE line_id = $1',
        [lineId]
      );
      finalPosition = (lastStopResult.rows[0].max_pos || 0) + 1;
    } else {
      // If a position is specified, shift the following stops
      await pool.query(
        'UPDATE stops SET position = position + 1 WHERE line_id = $1 AND position >= $2',
        [lineId, finalPosition]
      );
    }
    
    const coordinatesJson = coordinates ? JSON.stringify(coordinates) : null;
    
    const result = await pool.query(
      'INSERT INTO stops (line_id, name, position, coordinates) VALUES ($1, $2, $3, $4) RETURNING *',
      [lineId, name, finalPosition, coordinatesJson]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un arrêt:", error);
    res.status(400).json({ message: "Erreur lors de l'ajout d'un arrêt", error: error.message });
  }
});

// PUT - Update a stop
app.put('/api/stops/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, position, coordinates } = req.body;
    
    // Get the current stop
    const currentStopResult = await client.query(
      'SELECT * FROM stops WHERE id = $1',
      [id]
    );
    
    if (currentStopResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Arrêt non trouvé' });
    }
    
    const currentStop = currentStopResult.rows[0];
    const lineId = currentStop.line_id;
    
    // If position changes, adjust other stops
    if (position && position !== currentStop.position) {
      if (position > currentStop.position) {
        // Shift upwards stops between old and new position
        await client.query(
          'UPDATE stops SET position = position - 1 WHERE line_id = $1 AND position > $2 AND position <= $3',
          [lineId, currentStop.position, position]
        );
      } else {
        // Shift downwards stops between new and old position
        await client.query(
          'UPDATE stops SET position = position + 1 WHERE line_id = $1 AND position >= $2 AND position < $3',
          [lineId, position, currentStop.position]
        );
      }
    }
    
    const coordinatesJson = coordinates ? JSON.stringify(coordinates) : currentStop.coordinates;
    
    // Update the stop
    const result = await client.query(
      'UPDATE stops SET name = $1, position = $2, coordinates = $3 WHERE id = $4 RETURNING *',
      [name || currentStop.name, position || currentStop.position, coordinatesJson, id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la mise à jour d'un arrêt:", error);
    res.status(400).json({ message: "Erreur lors de la mise à jour d'un arrêt", error: error.message });
  } finally {
    client.release();
  }
});

// DELETE - Delete a stop
app.delete('/api/stops/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get the stop to delete
    const stopToDeleteResult = await client.query(
      'SELECT * FROM stops WHERE id = $1',
      [id]
    );
    
    if (stopToDeleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Arrêt non trouvé' });
    }
    
    const stopToDelete = stopToDeleteResult.rows[0];
    
    // Delete the stop
    await client.query('DELETE FROM stops WHERE id = $1', [id]);
    
    // Reorganize positions of remaining stops
    await client.query(
      'UPDATE stops SET position = position - 1 WHERE line_id = $1 AND position > $2',
      [stopToDelete.line_id, stopToDelete.position]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Arrêt supprimé avec succès', deletedStop: stopToDelete });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la suppression d'un arrêt:", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression d'un arrêt" });
  } finally {
    client.release();
  }
});

// Route pour la recherche d'arrêts par nom
app.get('/api/stops/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Un terme de recherche est requis' });
    }
    
    const searchResult = await pool.query(
      `SELECT s.*, l.number as line_number, l.name as line_name 
       FROM stops s
       JOIN lines l ON s.line_id = l.id
       WHERE s.name ILIKE $1
       ORDER BY l.number, s.position
       LIMIT 20`,
      [`%${query}%`]
    );
    
    res.json(searchResult.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'arrêts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la recherche d\'arrêts' });
  }
});

// Route pour la santé de l'API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});