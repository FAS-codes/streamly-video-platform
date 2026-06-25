import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        ▶ Streamly
      </Link>
      <div className="nav-links">
        <NavLink to="/" end>
          Browse
        </NavLink>
        {user && <NavLink to="/history">History</NavLink>}
        {user && <NavLink to="/studio">Studio</NavLink>}
        {user && (
          <NavLink to="/upload" className="btn btn-primary">
            Upload
          </NavLink>
        )}
        {user ? (
          <div className="nav-user">
            <span className="muted">{user.name}</span>
            <button className="btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn btn-primary">
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  );
}
