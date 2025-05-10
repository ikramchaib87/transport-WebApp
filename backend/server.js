const app = require('./app');
const pool = require('./config/db');

// Initialize database tables
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS bus_line_assignments (
        id SERIAL PRIMARY KEY,
        bus_id INTEGER NOT NULL REFERENCES external_buses(id) ON DELETE CASCADE,
        line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(bus_id, line_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS trajets (
        id SERIAL PRIMARY KEY,
        ligne_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
        ligne_number VARCHAR(10),
        depart VARCHAR(255) NOT NULL,
        arrivee VARCHAR(255) NOT NULL,
        jours VARCHAR(100) NOT NULL,
        heure_depart TIME NOT NULL,
        heure_arrivee TIME NOT NULL,
        duree VARCHAR(50) NOT NULL,
        chauffeur VARCHAR(255),
        vehicule VARCHAR(255),
        statut VARCHAR(50) DEFAULT 'Actif',
        arrets JSONB,
        remarques TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tables vérifiées/créées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables:', error);
  } finally {
    client.release();
  }
}


// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));