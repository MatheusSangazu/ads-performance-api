import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Loader2, BarChart3, Sun, Moon } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 transition-colors dark:bg-gray-950">
      <div className="absolute right-4 top-4">
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Alternar tema"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <BarChart3 size={32} className="text-blue-600 dark:text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Growth Ads</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200 border border-gray-100 dark:bg-gray-900 dark:shadow-none dark:border-gray-800">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white text-center">Boas-vindas de volta</h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mb-4 space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Endereço de Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              placeholder="seu@email.com"
            />
          </div>

          <div className="mb-8 space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Senha de Acesso</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500/50 outline-none transition-all focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
