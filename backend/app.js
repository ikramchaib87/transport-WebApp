const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const driverRoutes = require('./routes/driverRoutes');
const busRoutes = require('./routes/busRoutes');
const adminRoutes = require('./routes/adminRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const externalBusRoutes = require('./routes/externalBusRoutes');
const aasignmentLineRoutes = require('./routes/aasignmentLineRoutes');
const lineRoutes = require('./routes/lineRoutes');
const tripRoutes = require('./routes/tripRoutes');
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
const driversDir = path.join(uploadDir, 'drivers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(driversDir)) fs.mkdirSync(driversDir, { recursive: true });
const chauffeurRoutes = require('./routes/chauffeurRoutes');


const app = express();

// Configure CORS globally for all routes
app.use(cors({
  origin: 'http://localhost:3000', // Your React app's origin
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

app.use(bodyParser.json());

// Static files middleware with proper CORS headers
// Make this middleware come BEFORE the routes
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// API Routes
app.use('/api', authRoutes);
app.use('/api/employes', employeeRoutes);
app.use('/api/chauffeurs', driverRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/sousadmins', adminRoutes);
app.use('/api/affectations', assignmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/external-buses', externalBusRoutes);
app.use('/api/lines', lineRoutes);
app.use('/api', aasignmentLineRoutes);
app.use('/api', tripRoutes); 
app.use('/api', chauffeurRoutes);

module.exports = app;