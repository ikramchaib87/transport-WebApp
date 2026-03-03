# 🚍 Transport WebApp
**Personnel Transportation Management System**
*(L3 Final Year Project)*

## 📖 Overview

Transport WebApp is a full-stack web application developed as part of my L3 final year project in **ISIL (Ingénierie des Systèmes d'Information et Logiciels)**.

The system was designed and implemented for the **Transport Service at Sonatrach** to replace a fully manual, paper-based process with a centralized digital platform serving a department of **50–100 employees**.

Before this system existed, there was no central tool to manage personnel transportation. Route coordination, employee requests, and chauffeur assignments were all handled manually, creating unnecessary overhead and coordination errors. Transport WebApp digitizes and streamlines the entire workflow end-to-end, from request submission to admin approval to chauffeur dispatch.

The project was **presented to and validated by Sonatrach**, making it a real institutional deployment rather than a purely academic prototype.

---

## 🧩 Tech Stack

### Frontend
- React.js (component-based architecture)
- Dynamic route rendering with **Leaflet.js** maps

### Backend
- Node.js + Express.js (REST API architecture)
- Middleware-based request handling with **custom role guards** (`isAdmin`, `isDriver`)
- Modular folder structure: `routes/`, `controllers/`, `config/`, `utils/`

### Database
- PostgreSQL — relational schema covering route coordinates, schedules, employees, and vehicles

### Authentication & Security
- LDAP integration for secure directory-based login
- Gmail verification via **automatic code sending** for employee identity validation
- Role-based authorization: Admin, Employee, Chauffeur (Internal & External)

### Design
- Figma (UI/UX prototyping)

---

## 🔐 Authentication & Access Control

- Secure LDAP-based login system
- Employee identity verification through LDAP + Gmail validation codes
- **Role-based authorization** dynamically restricts access to system features:
  - **Admin** — full control: route approval, chauffeur & vehicle management
  - **Employee** — submit and track transport requests
  - **Chauffeur (Internal / External)** — view assigned routes and schedules

---

## 🗺 Route, Workflow & API

- Interactive **Leaflet.js** map for real-time route visualization
- Employees can submit new transport route requests
- Admin approval workflow validates and activates new routes
- Management of both internal and external chauffeurs
- Vehicle and route assignment logic handled server-side
- Middleware enforces authentication, authorization, and role-based access on every protected route

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/login` | Authenticate user via LDAP |
| `GET` | `/routes` | Fetch available transport routes |
| `POST` | `/route-request` | Submit a new route request |
| `PUT` | `/approve-route` | Admin approves a pending route |

---

## 🗄 Database Architecture

PostgreSQL manages:
- Employee records
- Chauffeur classification (internal / external)
- Vehicle fleet data
- Route definitions with **GPS coordinates**
- Transport schedules
- Request and approval workflow state

---

## 🏢 Project Context

Developed collaboratively with my *binôme* as our Licence final year project, conducted at **Sonatrach** for the Transport Service department.

Sonatrach is Algeria's national energy company and one of the largest corporations in Africa. Building a validated, production-grade system for one of its departments -as a final year undergraduate project - reflects both the ambition and the practical scope of this work.
