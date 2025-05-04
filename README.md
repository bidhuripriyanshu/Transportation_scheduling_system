# 🚚 Transportation Scheduling System (MERN + Real-Time)

A full-stack web application built using the **MERN stack**, enhanced with **Docker** for containerization and **GitHub Actions** for CI/CD. The system facilitates **real-time interaction between Users and Transporters**, enabling them to connect instantly for **ride booking and shipment requests**.

---

## 🌍 Live Demo

👉 **[Visit the Deployed App](https://transporter-schedular.onrender.com)**

---

## 🌐 Project Overview

This application serves as a **transportation scheduling platform** where:

- **Users** can request rides or shipments.
- **Transporters** can accept and manage those requests.
- All interactions are **real-time**, ensuring instant updates and notifications.
- The system is scalable and production-ready using Docker and GitHub Actions.

---

## ⚙️ Tech Stack

- **Frontend:** React.js with dynamic JavaScript (real-time DOM updates)
- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Real-time Communication:** Socket.io (WebSockets)
- **Authentication:** JWT
- **CI/CD:** GitHub Actions
- **Containerization:** Docker

---

## 🚀 Features

- 🧍‍♂️ User and 🚛 Transporter roles
- 📦 Book or accept shipment and ride requests
- ⏱️ Real-time communication between users and transporters
- 📅 Schedule and manage trips dynamically
- 🔐 Secure login and role-based access
- 📈 Dashboard for activity tracking
- 🐳 Dockerized environment
- ⚙️ Automated CI/CD with GitHub Actions

---

## 🐳 Run with Docker

Make sure you have Docker and Docker Compose installed.

```bash
git clone https://github.com/your-username/transport-scheduling-system.git
cd transport-scheduling-system
docker-compose up --build
