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


const app = express();

app.use('/uploads', express.static(uploadDir));
// Middleware
app.use(cors());
app.use(bodyParser.json());
// Routes
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
app.use('/api/trajets',tripRoutes);
module.exports = app;