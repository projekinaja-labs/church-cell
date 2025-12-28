# Church Cell Group Management System

A full-stack web application for managing church cell groups, tracking weekly member attendance and spiritual activities, with role-based access for leaders and administrators.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Setup Database**
```bash
cd backend
npm run db:push   # Create SQLite database
npm run db:seed   # Seed with test data
```

3. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

### Running the Application

1. **Start Backend Server** (Terminal 1)
```bash
cd backend
npm run dev
```
Backend runs at: http://localhost:3001

2. **Start Frontend Server** (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:5173

## 🔑 Test Credentials

| Role | Cell ID | Password |
|------|---------|----------|
| Admin | `admin` | `admin123` |
| Leader (Faith Cell) | `cell001` | `leader123` |
| Leader (Hope Cell) | `cell002` | `leader123` |

## 📋 Features

### Admin Dashboard
- **Cell Groups**: Create, edit, delete cell groups with their leaders
- **Members**: Add, edit, remove members from any cell group
- **Reports**: View all weekly reports across all cells with filters
- **Export**: Download reports as CSV or Excel files
- **Credentials**: Change leader login IDs and passwords

### Leader Dashboard
- **Weekly Report**: Submit attendance and activity data for each member
  - Mark as present/absent
  - Bible chapters read
  - Prayer count
  - Notes
- **Members**: Add new members to their cell group
- **History**: View past weekly reports

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite with Prisma ORM
- **Auth**: JWT (JSON Web Tokens)
- **Password**: bcryptjs for hashing
- **Export**: xlsx library for Excel/CSV

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **HTTP**: Axios
- **Icons**: React Icons
- **Styling**: Custom CSS with dark theme

## 📁 Project Structure

```
church_cell/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.js          # Test data seeder
│   │   └── dev.db           # SQLite database
│   ├── src/
│   │   ├── index.js         # Express server
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT authentication
│   │   └── routes/
│   │       ├── auth.js      # Login/logout
│   │       ├── admin.js     # Admin API endpoints
│   │       ├── leader.js    # Leader API endpoints
│   │       └── export.js    # CSV/Excel export
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx         # Entry point
    │   ├── App.jsx          # Main app with routes
    │   ├── index.css        # Global styles
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── AdminDashboard.jsx
    │       └── LeaderDashboard.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with cellId and password
- `GET /api/auth/me` - Get current user info

### Admin Routes (requires admin role)
- `GET /api/admin/cell-groups` - List all cell groups
- `POST /api/admin/cell-groups` - Create cell group with leader
- `PUT /api/admin/cell-groups/:id` - Update cell group
- `DELETE /api/admin/cell-groups/:id` - Delete cell group
- `PUT /api/admin/leaders/:id` - Update leader credentials
- `GET /api/admin/members` - List all members
- `POST /api/admin/members` - Add member
- `PUT /api/admin/members/:id` - Update member
- `DELETE /api/admin/members/:id` - Delete member
- `GET /api/admin/reports` - Get all reports

### Leader Routes (requires leader role)
- `GET /api/leader/my-cell-group` - Get leader's cell group
- `POST /api/leader/members` - Add member to cell group
- `GET /api/leader/reports/week/:weekStart` - Get week data
- `POST /api/leader/reports/batch` - Submit weekly reports
- `GET /api/leader/reports/history` - Get report history

### Export Routes (requires admin role)
- `GET /api/export/excel` - Download Excel file
- `GET /api/export/csv` - Download CSV file
- `GET /api/export/summary` - Download summary report

## 🔧 Configuration

### Environment Variables (optional)
Create a `.env` file in the backend folder:
```
PORT=3001
JWT_SECRET=your-secret-key
```

## 📝 License

MIT
