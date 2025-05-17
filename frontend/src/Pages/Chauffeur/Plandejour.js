import React from "react";
import "./Plandejour.css";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";

const Plandejour = () => {
  return (
    <div>
      <Header />
      <div className="add">
        <Navbar />
        <div className="cart-container">
          <div className="emp-carte-title">
            <h2>Plan de jour</h2>
            <div className="emp-red-dot"></div>
          </div>
          
          <div>
            <h3>aujourd'hui</h3>
            
            <div className="schedule-container">
              <div className="schedule-card">
                <div>
                  <h4>adresse 1 à adresse 2</h4>
                  <p>15 personnes · 5 arrêts</p>
                </div>
                
                <div className="time-container">
                  <div>8:00 am</div>
                  <div className="time-line"></div>
                  <div>8:30 am</div>
                </div>
                
                <a href="#" className="details-link">voir les détails</a>
              </div>
              
              <div className="schedule-card">
                <div>
                  <h4>adresse 1 à adresse 2</h4>
                  <p>15 personnes · 5 arrêts</p>
                </div>
                
                <div className="time-container">
                  <div>4:00 pm</div>
                  <div className="time-line"></div>
                  <div>4:30 pm</div>
                </div>
                
                <a href="#" className="details-link">voir les détails</a>
              </div>
            </div>
          </div>
          
          <div>
            <h3>Demain :</h3>
            
            <div className="schedule-container">
              <div className="schedule-card">
                <div>
                  <h4>adresse 1 à adresse 2</h4>
                  <p>15 personnes · 5 arrêts</p>
                </div>
                
                <div className="time-container">
                  <div>8:00 am</div>
                  <div className="time-line"></div>
                  <div>8:30 am</div>
                </div>
                
                <a href="#" className="details-link">voir les détails</a>
              </div>
              
              <div className="schedule-card">
                <div>
                  <h4>adresse 1 à adresse 2</h4>
                  <p>15 personnes · 5 arrêts</p>
                </div>
                
                <div className="time-container">
                  <div>4:00 pm</div>
                  <div className="time-line"></div>
                  <div>4:30 pm</div>
                </div>
                
                <a href="#" className="details-link">voir les détails</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plandejour;