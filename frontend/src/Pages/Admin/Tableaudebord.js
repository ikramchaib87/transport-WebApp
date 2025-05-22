import React, { useState, useEffect } from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Tableaudebord.css";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ff8000',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <p className="label">{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Tableaudebord = () => {
  const [busStats, setBusStats] = useState({
    totalBuses: 0,
    internalBuses: 0,
    externalBuses: 0,
    activeBuses: 0,
    maintenanceBuses: 0,
    internalPercentage: 0,
    externalPercentage: 0
  });

  const [transportRequests, setTransportRequests] = useState({
    todayRequests: [],
    allRequests: []
  });

  const [requestsCount, setRequestsCount] = useState({
    pending: 0,
    accepted: 0,
    refused: 0,
    total: 0
  });

  const [employees, setEmployees] = useState([]);
  const [transportUsersCount, setTransportUsersCount] = useState(0);
  const [employeeEvolution, setEmployeeEvolution] = useState([]);
  const [tripsStats, setTripsStats] = useState({
    totalTrips: 0,
    allerTrips: 0,
    retourTrips: 0
  });

  const calculateEmployeeEvolution = (requests) => {
    const monthlyData = {};
    const currentDate = new Date();
    
    // Initialiser les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      
      monthlyData[monthKey] = {
        name: monthName,
        employés: 0,
        demandes: 0,
        acceptées: 0,
        refusées: 0
      };
    }

    // Compter les demandes par mois
    requests.forEach(request => {
      const requestDate = new Date(request.date_soumission);
      const monthKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].demandes++;
        
        if (request.statut === 'Accepté' || request.statut === 'Approuvée') {
          monthlyData[monthKey].acceptées++;
          monthlyData[monthKey].employés++;
        } else if (request.statut === 'Refusé' || request.statut === 'Rejetée') {
          monthlyData[monthKey].refusées++;
        }
      }
    });

    return Object.values(monthlyData);
  };

  const availablePercentage = (busStats.activeBuses / busStats.totalBuses) * 100;
  const maintenancePercentage = (busStats.maintenanceBuses / busStats.totalBuses) * 100;
  const onServicePercentage = 100 - availablePercentage - maintenancePercentage;

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const internalResponse = await axios.get('http://localhost:5000/api/buses');
        const externalResponse = await axios.get('http://localhost:5000/api/external-buses');
        
        const internalBuses = internalResponse.data;
        const externalBuses = externalResponse.data;
        const totalBuses = internalBuses.length + externalBuses.length;
        const activeInternal = internalBuses.filter(bus => bus.statut === 'disponible').length;
        const activeExternal = externalBuses.filter(bus => bus.statut === 'Actif').length;
        const maintenanceInternal = internalBuses.filter(bus => bus.statut === 'en panne').length;
        
        setBusStats({
          totalBuses,
          internalBuses: internalBuses.length,
          externalBuses: externalBuses.length,
          activeBuses: activeInternal + activeExternal,
          maintenanceBuses: maintenanceInternal,
          internalPercentage: Math.round((internalBuses.length / totalBuses) * 100),
          externalPercentage: Math.round((externalBuses.length / totalBuses) * 100)
        });
      } catch (error) {
        console.error("Erreur bus:", error);
      }
    };

    const fetchTransportRequests = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/transport-requests');
        
        const today = new Date().toISOString().split('T')[0];
        const todayRequests = response.data.data.filter(request => {
          const requestDate = new Date(request.date_soumission).toISOString().split('T')[0];
          return requestDate === today;
        });

        setTransportRequests({
          todayRequests,
          allRequests: response.data.data
        });

        // Calculer les statistiques d'évolution
        const evolutionData = calculateEmployeeEvolution(response.data.data);
        setEmployeeEvolution(evolutionData);

        const pending = response.data.data.filter(req => req.statut === 'En attente').length;
        const accepted = response.data.data.filter(req => req.statut === 'Accepté').length;
        const refused = response.data.data.filter(req => req.statut === 'Refusé').length;

        setRequestsCount({
          pending,
          accepted,
          refused,
          total: response.data.pagination.total
        });
      } catch (error) {
        console.error("Erreur demandes:", error);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employes');
        const allEmployees = response.data.employes || [];
        setEmployees(allEmployees);
        
        // Calculer le nombre d'employés utilisant le service (ceux avec une ligne assignée)
        const usersCount = allEmployees.filter(emp => emp.line_id !== null).length;
        setTransportUsersCount(usersCount);
      } catch (error) {
        console.error("Erreur employés:", error);
      }
    };

    const fetchTripsData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/trajets');
        const allTrips = response.data;
        
        setTripsStats({
          totalTrips: allTrips.length,
          allerTrips: allTrips.filter(trip => trip.sens === 'aller').length,
          retourTrips: allTrips.filter(trip => trip.sens === 'retour').length
        });
      } catch (error) {
        console.error("Erreur trajets:", error);
      }
    };

    fetchBusData();
    fetchTransportRequests();
    fetchEmployees();
    fetchTripsData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'En attente':
        return <span className="tableaudebord-status tableaudebord-status-pending">🕒 En attente</span>;
      case 'Accepté':
        return <span className="tableaudebord-status tableaudebord-status-accepted">✅ Accepté</span>;
      case 'Refusé':
        return <span className="tableaudebord-status tableaudebord-status-refused">❌ Refusé</span>;
      default:
        return <span className="tableaudebord-status">{status}</span>;
    }
  };

  return (
    <div className="tableaudebord-page">
      <Header />
      <div className="tableaudebord-main-content">
        <Navbar />
        <div className="tableaudebord-content-container">
          {/* Haut */}
          <div className="tableaudebord-cards-row tableaudebord-top-row">
            <div className="tableaudebord-card tableaudebord-chart-card">
              <h3 className="tableaudebord-card-title">Évolution des employés transportés (6 derniers mois)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={employeeEvolution}>
                  <defs>
                    <linearGradient id="colorEmp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff8000" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff8000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="employés" stroke="#ff8000" fillOpacity={1} fill="url(#colorEmp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="tableaudebord-activity-column">
              <div className="tableaudebord-card tableaudebord-bus-activity">
                <div className="tableaudebord-card-header">
                  <h3>Activité des bus</h3>
                </div>
                <div className="tableaudebord-donut-chart-container">
                  <div 
                    className="tableaudebord-donut-chart"
                    style={{
                      background: `conic-gradient(
                        #f9c74f 0% ${availablePercentage}%,
                        #ff8800 ${availablePercentage}% ${availablePercentage + maintenancePercentage}%,
                        #28a745 ${availablePercentage + maintenancePercentage}% 100%
                      )`
                    }}
                  >
                    <div className="tableaudebord-donut-hole">
                      <span className="tableaudebord-donut-number">{busStats.activeBuses}</span>
                      <span className="tableaudebord-donut-label">bus disponible</span>
                    </div>
                  </div>
                  <div className="tableaudebord-chart-stats">
                    <div className="tableaudebord-stat-item">
                      <span className="tableaudebord-stat-color yellow"></span>
                      <span className="tableaudebord-stat-label">
                        Disponibles {Math.round(availablePercentage)}%
                      </span>
                    </div>
                    <div className="tableaudebord-stat-item">
                      <span className="tableaudebord-stat-color orange"></span>
                      <span className="tableaudebord-stat-label">
                        En panne {Math.round(maintenancePercentage)}%
                      </span>
                    </div>
                    <div className="tableaudebord-stat-item">
                      <span className="tableaudebord-stat-color vert"></span>
                      <span className="tableaudebord-stat-label">
                        En service {Math.round(onServicePercentage)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tableaudebord-stats-cards">
                <div className="tableaudebord-card tableaudebord-small-card">
                  <h3 className="tableaudebord-card-title">Nombre total de bus</h3>
                  <p className="tableaudebord-big-number">{busStats.totalBuses}</p>
                  <p>Interne {busStats.internalPercentage}%, Externe {busStats.externalPercentage}%</p>
                </div>

                <div className="tableaudebord-card tableaudebord-small-card">
                  <h3 className="tableaudebord-card-title">Employés utilisant le service</h3>
                  <p className="tableaudebord-big-number">{transportUsersCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Milieu */}
          <div className="tableaudebord-cards-row tableaudebord-middle-row">
            <div className="tableaudebord-card tableaudebord-medium-card">
              <h3 className="tableaudebord-card-title">Demande de transport</h3>
              <p className="tableaudebord-big-number">{requestsCount.total}</p>
            </div>
            <div className="tableaudebord-card tableaudebord-medium-card">
              <h3 className="tableaudebord-card-title">Bus en maintenance</h3>
              <p className="tableaudebord-big-number">{busStats.maintenanceBuses}</p>
            </div>
            <div className="tableaudebord-card tableaudebord-medium-card">
              <h3 className="tableaudebord-card-title">Statistiques des Trajets</h3>
              <div className="tableaudebord-trips-stats">
                <div className="tableaudebord-trip-stat">
                  <span className="tableaudebord-big-number">{tripsStats.totalTrips}</span>
                  <span className="tableaudebord-stat-label">Total</span>
                </div>
                <div className="tableaudebord-trip-stat">
                  <span className="tableaudebord-big-number">{tripsStats.allerTrips}</span>
                  <span className="tableaudebord-stat-label">Aller</span>
                </div>
                <div className="tableaudebord-trip-stat">
                  <span className="tableaudebord-big-number">{tripsStats.retourTrips}</span>
                  <span className="tableaudebord-stat-label">Retour</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bas */}
          <div className="tableaudebord-cards-row tableaudebord-bottom-row">
            <div className="tableaudebord-card tableaudebord-full-card">
              <h3 className="tableaudebord-card-title">Demandes de Transport (Aujourd'hui)</h3>
              <table className="tableaudebord-requests-table">
                <thead>
                  <tr>
                    <th>Nom Prénom</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transportRequests.todayRequests.length > 0 ? (
                    transportRequests.todayRequests.map((request, index) => (
                      <tr key={index}>
                        <td>{request.nom} {request.prenom}</td>
                        <td>{getStatusBadge(request.statut)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" style={{textAlign: 'center'}}>Aucune demande aujourd'hui</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tableaudebord;