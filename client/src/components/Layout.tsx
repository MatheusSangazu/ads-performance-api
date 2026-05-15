import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Settings, Users, Shield, MailPlus, LogOut, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AlertDropdown from './AlertDropdown';

const baseNavItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

const adminNavItems = [
  { to: '/managers', label: 'Gestores', icon: Shield },
  { to: '/invites', label: 'Convites', icon: MailPlus },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Growth Ads</h1>

          <div className="flex gap-1">
            {baseNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}

            {isAdmin &&
              adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <AlertDropdown />
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {isAdmin && (
                  <span className="rounded-full bg-purple-600/20 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
                    Admin
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
