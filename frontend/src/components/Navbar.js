import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard,
  Users,
  MapPin,
  User,
  Bus,
  Notebook,
  Route,
  Mail,
  AlertTriangle,
  Menu,
  X,
  IdCard,
  CalendarDays, Home 
} from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Memoize the isSubmenuRoute function with useCallback
  const isSubmenuRoute = useCallback(() => {
    const submenuPaths = [
      "/AdminRoutes/bus", 
      "/AdminRoutes/chauffeurs",
      "/SousAdminRoutes/bus",
      "/SousAdminRoutes/chauffeurs",
      "/AdminRoutes/Affectation",
      "/SousAdminRoutes/Affectation"
    ];
    return submenuPaths.some(path => location.pathname === path);
  }, [location.pathname]);
  
  // Initialize submenu state based on current route
  const [showTransportSubMenu, setShowTransportSubMenu] = useState(isSubmenuRoute());
  
  // Update submenu state when route changes
  useEffect(() => {
    if (isSubmenuRoute()) {
      setShowTransportSubMenu(true);
    }
  }, [isSubmenuRoute]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  const isAdmin = location.pathname.startsWith("/AdminRoutes");
  const isSousAdmin = location.pathname.startsWith("/SousAdminRoutes");
  const isEmploye = location.pathname.startsWith("/EmployeRoutes");
  const isChuffeur = location.pathname.startsWith("/ChauffeurRoutes");

  const getMenuItems = () => {
    if (isAdmin) {
      return [
        { name: "Tableau de bord", path: "/AdminRoutes/Tableaudebord", icon: <LayoutDashboard /> },
        { name: "Administrateurs", path: "/AdminRoutes/Administrateurs", icon: <Users /> },
        { name: "Employes", path: "/AdminRoutes/Employes", icon: <User /> },
        { name: "Transport Interne", path: "#", icon: <Bus />, hasSubmenu: true },
        { name: "Transport Externe", path: "/AdminRoutes/TransportExterne", icon: <Bus /> },
        { name: "Lignes", path: "/AdminRoutes/Lignes", icon: <Notebook/> },
        { name: "Trajets", path: "/AdminRoutes/TrajetAdmin", icon: <Route /> },
        { name: "Demande", path: "/AdminRoutes/Demande", icon: <Mail /> },
        { name: "Réclamation", path: "/AdminRoutes/Reclamation", icon: <AlertTriangle /> }
      ];
    } else if (isSousAdmin) {
      return [
        { name: "Tableau de bord", path: "/SousAdminRoutes/Tableaudebord", icon: <LayoutDashboard /> },
        { name: "Employes", path: "/SousAdminRoutes/Employes", icon: <User /> },
        { name: "Transport Interne", path: "#", icon: <Bus />, hasSubmenu: true },
        { name: "Transport Externe", path: "/SousAdminRoutes/TransportExterne", icon: <Bus /> },
        { name: "Lignes", path: "/SousAdminRoutes/Lignes", icon: <Notebook/> },
        { name: "Trajets", path: "/SousAdminRoutes/TrajetAdmin", icon: <Route /> },
        { name: "Demande", path: "/SousAdminRoutes/Demande", icon: <Mail /> },
        { name: "Réclamation", path: "/SousAdminRoutes/Reclamation", icon: <AlertTriangle /> }
      ];
    } else if (isEmploye) {
      return [
        { name: "Accueil", path: "/EmployeRoutes/Accueille", icon: <Home /> },
        { name: "Carte", path: "/EmployeRoutes/CartEmploye", icon: <IdCard /> },
        { name: "Profil", path: "/EmployeRoutes/Profil", icon: <User /> },
        { name: "Réclamation", path: "/EmployeRoutes/Reclamation", icon: <AlertTriangle /> }
      ];
    } else if (isChuffeur) {
      return [
        { name: "Plan du jour", path: "/ChauffeurRoutes/Plandejour", icon: <CalendarDays /> },
        { name: "Trajet", path: "/ChauffeurRoutes/Trajet", icon: <Route /> },
        { name: "Carte", path: "/ChauffeurRoutes/CartChauffeur", icon: <IdCard /> },
        { name: "Profil", path: "/ChauffeurRoutes/Profil", icon: <User /> }
      ];
    }
    return [];
  };

  const menu = getMenuItems();
  
  // Function to check if a menu item is active
  const isItemActive = (path) => {
    if (path === "#") return false; // Don't highlight dropdown toggles
    return location.pathname === path;
  };
  
  // Function to check if a submenu item should be highlighted
  const isSubmenuActive = () => {
    const activePaths = [
      isAdmin ? "/AdminRoutes/bus" : "/SousAdminRoutes/bus",
      isAdmin ? "/AdminRoutes/chauffeurs" : "/SousAdminRoutes/chauffeurs",
      isAdmin ? "/AdminRoutes/Affectation" : "/SousAdminRoutes/Affectation"
    ];
    
    return activePaths.includes(location.pathname);
  };

  return (
    <div className="navbar-container">
      <nav className={`vertical-sidebar ${isExpanded ? "expanded" : "collapsed"} ${isMobile ? "mobile" : ""}`}>
        <div className="menu-toggle" onClick={toggleMenu}>
          {isExpanded ? <X /> : <Menu />}
        </div>
        <ul className="icon-menu">
          {menu.map((item, index) => (
            <React.Fragment key={index}>
              {item.hasSubmenu ? (
                <li className={`menu-item ${showTransportSubMenu ? "active" : ""} ${isSubmenuActive() ? "active" : ""}`} onClick={() => setShowTransportSubMenu(!showTransportSubMenu)}>
                  <div className="icon-wrapper">{item.icon}</div>
                  {isExpanded && <span className="menu-text">{item.name}</span>}
                  {isExpanded && <span className="arrow">{showTransportSubMenu ? '▲' : '▼'}</span>}
                </li>
              ) : (
                <li className={`menu-item ${isItemActive(item.path) ? "active" : ""}`}>
                  <Link to={item.path} className="menu-link">
                    <div className="icon-wrapper">{item.icon}</div>
                    {isExpanded && <span className="menu-text">{item.name}</span>}
                  </Link>
                </li>
              )}
              
              {item.hasSubmenu && showTransportSubMenu && isExpanded && (
                <>
                  <li className={`submenu-item ${isItemActive(isAdmin ? "/AdminRoutes/bus" : "/SousAdminRoutes/bus") ? "active" : ""}`}>
                    <Link to={isAdmin ? "/AdminRoutes/bus" : "/SousAdminRoutes/bus"} className="menu-link">
                      <div className="icon-wrapper"><Bus /></div>
                      <span className="menu-text">Bus</span>
                    </Link>
                  </li>
                  <li className={`submenu-item ${isItemActive(isAdmin ? "/AdminRoutes/chauffeurs" : "/SousAdminRoutes/chauffeurs") ? "active" : ""}`}>
                    <Link to={isAdmin ? "/AdminRoutes/chauffeurs" : "/SousAdminRoutes/chauffeurs"} className="menu-link">
                      <div className="icon-wrapper"><User /></div>
                      <span className="menu-text">Chauffeurs</span>
                    </Link>
                  </li>
                  <li className={`submenu-item ${isItemActive(isAdmin ? "/AdminRoutes/Affectation" : "/SousAdminRoutes/Affectation") ? "active" : ""}`}>
                    <Link to={isAdmin ? "/AdminRoutes/Affectation" : "/SousAdminRoutes/Affectation"} className="menu-link">
                      <div className="icon-wrapper"><Notebook /></div>
                      <span className="menu-text">Affectation</span>
                    </Link>
                  </li>
                </>
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Navbar;