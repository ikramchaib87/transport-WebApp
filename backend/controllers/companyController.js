const pool = require('../config/db');

exports.getAllCompanies = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, contract_start, contract_end FROM transport_companies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, contract_start, contract_end FROM transport_companies WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.createCompany = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, contract_start, contract_end } = req.body;
    
    await client.query('BEGIN');
    
     if (!name?.trim() || !contract_start || !contract_end) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and contract dates are required' 
      });
    }

    // Check for existing company
    const existing = await client.query(
      'SELECT id FROM transport_companies WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Company already exists' });
    }

    const result = await client.query(
      'INSERT INTO transport_companies (name, contract_start, contract_end) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), contract_start, contract_end]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, company: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contract_start, contract_end } = req.body;
    
    if (!name?.trim() || !contract_start || !contract_end) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and contract dates are required' 
      });
    }
    
    // Check for company with same name (excluding current company)
    const existing = await pool.query(
      'SELECT id FROM transport_companies WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Company name already in use' });
    }
    
    const result = await pool.query(
      'UPDATE transport_companies SET name = $1, contract_start = $2, contract_end = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name.trim(), contract_start, contract_end, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }    
};

exports.deleteCompany = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // First delete associated buses
    await client.query('DELETE FROM external_buses WHERE company_id = $1', [id]);
    
    // Then delete the company
    const result = await client.query(
      'DELETE FROM transport_companies WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Company and associated buses deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting company:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }    
};

exports.getCompanyBuses = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM external_buses WHERE company_id = $1 ORDER BY matricule',
      [id]
    );
    res.json({ success: true, buses: result.rows });
  } catch (err) {
    console.error('Error fetching company buses:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};