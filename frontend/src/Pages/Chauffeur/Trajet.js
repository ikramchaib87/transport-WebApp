import React from "react";
import Navbar from '../../components/Navbar';
import Header from "../../components/Header";
import "./Trajet.css";

const Trajet = () => {
  

  return (
   <div>
     <Header />
     <div className="add">
           <Navbar />
           <div className="cart-container">
             <div className="emp-carte-title">
               <h2>Trajet</h2>
               <div className="emp-red-dot"></div>
             </div>
       </div>
      </div>
    </div>
  );
};

export default Trajet;