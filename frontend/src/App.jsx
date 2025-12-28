import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import LeaderDashboard from './pages/LeaderDashboard';

function ProtectedRoute({ children, requiredRole }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={user ? (
                    <Navigate to={user.role === 'admin' ? '/admin' : '/leader'} replace />
                ) : (
                    <LoginPage />
                )}
            />

            <Route
                path="/admin/*"
                element={
                    <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/leader/*"
                element={
                    <ProtectedRoute requiredRole="leader">
                        <LeaderDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/"
                element={
                    user ? (
                        <Navigate to={user.role === 'admin' ? '/admin' : '/leader'} replace />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
