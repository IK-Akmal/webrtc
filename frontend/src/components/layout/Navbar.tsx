import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/rooms" className="navbar-brand">WebRTC Conf</Link>
      {user && (
        <div className="navbar-right">
          <span className="navbar-user">{user.displayName}</span>
          <button onClick={handleLogout} className="btn btn-sm">Logout</button>
        </div>
      )}
    </nav>
  );
}
