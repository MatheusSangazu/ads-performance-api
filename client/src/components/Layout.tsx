import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Settings, Users, Shield, MailPlus, LogOut, ClipboardList, Menu, X, CreditCard, Building2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AlertDropdown from './AlertDropdown';

const baseNavItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { to: '/plans', label: 'Planos', icon: CreditCard },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

const adminNavItems = [
  { to: '/managers', label: 'Gestores', icon: Shield },
  { to: '/invites', label: 'Convites', icon: MailPlus },
];

const agencyOnlyItems = [
  { to: '/agency', label: 'Equipe', icon: Building2 },
];

function getVisibleAdminItems(isAdmin: boolean, isAgency: boolean) {
  if (isAdmin) return [...adminNavItems, ...agencyOnlyItems];
  if (isAgency) return agencyOnlyItems;
  return [];
}

function NavItem({ to, label, icon: Icon, end, admin, onClick }: {
  to: string; label: string; icon: typeof BarChart3; end?: boolean; admin?: boolean; onClick?: () => void;
}) {
  return (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          isActive
            ? admin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout, isAdmin, isAgency } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-lg font-bold text-gray-900 md:text-xl dark:text-white">Growth Ads</h1>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Alternar tema"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          <div className="ml-8 hidden flex-1 items-center gap-1 md:flex">
            {baseNavItems.map(({ to, label, icon }) => (
              <NavItem key={to} to={to} label={label} icon={icon} end={to === '/'} />
            ))}
            {getVisibleAdminItems(isAdmin, isAgency).map(({ to, label, icon }) => (
              <NavItem key={to} to={to} label={label} icon={icon} admin />
            ))}
          </div>

          <div className="ml-auto hidden items-center gap-4 md:flex">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Alternar tema"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {user && (
              <div className="flex items-center gap-3">
                <AlertDropdown />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {isAdmin && (
                  <span className="rounded-full bg-purple-600/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:bg-purple-600/20 dark:text-purple-400">
                    Admin
                  </span>
                )}
                {isAgency && !isAdmin && (
                  <span className="rounded-full bg-amber-600/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-600/20 dark:text-amber-400">
                    Agency
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-gray-200 bg-white px-4 pb-4 md:hidden dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-1 pt-2">
              {baseNavItems.map(({ to, label, icon }) => (
                <NavItem key={to} to={to} label={label} icon={icon} end={to === '/'} onClick={closeMobile} />
              ))}
              {getVisibleAdminItems(isAdmin, isAgency).length > 0 && (
                <>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
                  {getVisibleAdminItems(isAdmin, isAgency).map(({ to, label, icon }) => (
                    <NavItem key={to} to={to} label={label} icon={icon} admin onClick={closeMobile} />
                  ))}
                </>
              )}
            </div>

            {user && (
              <div className="mt-3 flex items-center gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                <AlertDropdown />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {isAdmin && (
                  <span className="rounded-full bg-purple-600/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-600/20 dark:text-purple-400">
                    Admin
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
