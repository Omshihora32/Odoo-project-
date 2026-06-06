# 🌉 VendorBridge — Procurement & Vendor Management ERP

<div align="center">

![VendorBridge](https://img.shields.io/badge/VendorBridge-ERP-16a34a?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01eiIvPjwvc3ZnPg==)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)

**A centralized procurement platform for organizations to manage vendors, RFQs, quotations, approvals, purchase orders, and invoices.**

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [User Roles](#-user-roles)
- [Default Credentials](#-default-credentials)
- [Workflow](#-workflow)
- [Environment Variables](#-environment-variables)

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Vendor Management** | Add, edit, delete vendors with categories, GST, contact info |
| **RFQ Creation** | Multi-step form with items, vendor assignment, attachments |
| **Quotation Submission** | Vendors submit quotations against RFQs |
| **Quotation Comparison** | Side-by-side comparison matrix with auto-recommendation |
| **Approval Workflow** | Manager approval/rejection with comments and history |
| **Purchase Orders** | Auto-generated POs with PDF download |
| **Invoices** | Auto-generated invoices with GST, PDF, print, email |
| **Reports & Analytics** | Procurement trends, spend analysis, vendor performance |
| **Activity Logs** | Complete audit trail with timeline view |
| **Notifications** | Real-time notifications for all workflow events |

---

## 🛠 Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (Build Tool)
- Tailwind CSS + ShadCN UI
- React Router v7
- React Hook Form + Zod
- Recharts (Charts)
- Zustand (State Management)
- Axios (HTTP Client)

### Backend
- Node.js + Express.js + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt (Password Hashing)
- pdf-lib (PDF Generation)
- Nodemailer (Email)
- Zod (Validation)
- Multer (File Upload)

### DevOps
- Docker + Docker Compose
- Nginx (Production)

---

## 📦 Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** >= 16 (or Docker)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Navigate to the project
cd VendorBridge

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create a PostgreSQL database
# Update the DATABASE_URL in backend/.env

cd backend

# Copy environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed the database with sample data
npm run seed
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend (from backend/)
cd backend
npm run dev

# Terminal 2 — Frontend (from frontend/)
cd frontend
npm run dev
```

### 4. Open the App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

---

## 🐳 Docker Setup

```bash
# Start all services
docker-compose up -d

# Run migrations & seed
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run seed

# Access the app
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

---

## 📁 Project Structure

```
VendorBridge/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, RBAC, validation
│   │   ├── routes/          # API routes
│   │   ├── services/        # PDF, email, activity
│   │   ├── utils/           # JWT, hashing, helpers
│   │   ├── validators/      # Zod schemas
│   │   ├── types/           # TypeScript types
│   │   ├── app.ts           # Express app
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   └── uploads/             # File storage
├── frontend/
│   ├── src/
│   │   ├── components/      # UI & feature components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   ├── types/           # TypeScript types
│   │   └── router/          # React Router config
│   └── public/
├── docker-compose.yml
└── README.md
```

---

## 📡 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors` | List all vendors |
| POST | `/api/vendors` | Create a vendor |
| GET | `/api/vendors/:id` | Get vendor details |
| PUT | `/api/vendors/:id` | Update a vendor |
| DELETE | `/api/vendors/:id` | Delete a vendor |

### RFQs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfqs` | List all RFQs |
| POST | `/api/rfqs` | Create an RFQ |
| GET | `/api/rfqs/:id` | Get RFQ details |
| PUT | `/api/rfqs/:id` | Update an RFQ |
| POST | `/api/rfqs/:id/publish` | Publish an RFQ |

### Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotations` | List all quotations |
| POST | `/api/quotations` | Submit a quotation |
| GET | `/api/quotations/:id` | Get quotation details |
| GET | `/api/quotations/rfq/:rfqId/compare` | Compare quotations |

### Approvals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals` | List all approvals |
| POST | `/api/approvals/:id/approve` | Approve a request |
| POST | `/api/approvals/:id/reject` | Reject a request |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchase-orders` | List all POs |
| POST | `/api/purchase-orders` | Generate a PO |
| GET | `/api/purchase-orders/:id` | Get PO details |
| GET | `/api/purchase-orders/:id/pdf` | Download PO PDF |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Generate an invoice |
| GET | `/api/invoices/:id` | Get invoice details |
| GET | `/api/invoices/:id/pdf` | Download invoice PDF |
| POST | `/api/invoices/:id/email` | Email invoice |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/analytics` | Analytics data |
| GET | `/api/reports/export/:format` | Export reports |

### Activity Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity-logs` | List activity logs |

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — manage users, vendors, view analytics |
| **Procurement Officer** | Create RFQs, compare quotations, generate POs & invoices |
| **Vendor** | View assigned RFQs, submit quotations, track status |
| **Manager** | Approve/reject procurement requests, monitor workflows |

---

## 🔑 Default Credentials

After running the seeder, use these credentials to log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendorbridge.com | admin123 |
| Manager | manager1@vendorbridge.com | manager123 |
| Manager | manager2@vendorbridge.com | manager123 |
| Procurement Officer | procurement1@vendorbridge.com | procurement123 |
| Procurement Officer | procurement2@vendorbridge.com | procurement123 |
| Vendor | vendor1@vendorbridge.com | vendor123 |
| Vendor | vendor2@vendorbridge.com | vendor123 |
| Vendor | vendor3@vendorbridge.com | vendor123 |
| Vendor | vendor4@vendorbridge.com | vendor123 |
| Vendor | vendor5@vendorbridge.com | vendor123 |

---

## 🔄 Workflow

```
1. Procurement Officer creates RFQ
          ↓
2. Vendors receive RFQ notification
          ↓
3. Vendors submit quotations
          ↓
4. Procurement Officer compares quotations
          ↓
5. Best quotation selected (auto-recommendation)
          ↓
6. Manager approves/rejects
          ↓
7. Purchase Order generated
          ↓
8. Invoice generated
          ↓
9. Invoice emailed to vendor
          ↓
10. All activities logged
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://vendorbridge:vendorbridge_secret@localhost:5432/vendorbridge
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@vendorbridge.com
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

---

## 📄 License

This project is built for the VendorBridge Hackathon.

---

<div align="center">
  <strong>Built with ❤️ for VendorBridge Hackathon</strong>
</div>
