import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Search, PlusSquare, Heart, Settings, LogOut, User as UserIcon, Mail } from 'lucide-react';
import clsx from 'clsx';

export const Navbar = () => {
  const { user, logout, users, login } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/explore', icon: Search, label: 'Explorar' },
    { to: '/create', icon: PlusSquare, label: 'Criar' },
    { to: '/messages', icon: Mail, label: 'Mensagens' },
    { to: '/notifications', icon: Heart, label: 'Notificações' },
    { to: `/profile/${user?.id}`, icon: UserIcon, label: 'Perfil' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-60 h-screen border-r border-[#262626] bg-black fixed left-0 top-0 p-5 justify-between">
        <div>
          <div className="flex items-center gap-2 px-2 mb-8">
            <Link to="/" className="text-2xl font-bold tracking-tighter text-white">OfflineGram</Link>
            <div className="h-2 w-2 rounded-full bg-blue-500 offline-glow"></div>
          </div>
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={clsx(
                    "flex items-center gap-4 p-3 rounded-lg transition-all",
                    isActive ? "bg-white/10 font-semibold" : "hover:bg-white/5 font-normal"
                  )}
                >
                  <link.icon className={clsx("w-6 h-6 stroke-[2px]", !isActive && "text-gray-300")} />
                  <span className={clsx("text-base", !isActive && "text-gray-300")}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-[#262626] text-xs text-gray-500">
          <div className="relative group mb-2">
            <select
              className="w-full bg-transparent border border-[#262626] rounded-lg p-2 text-sm focus:ring-1 focus:ring-white text-white appearance-none"
              value={user?.id || ''}
              onChange={(e) => login(parseInt(e.target.value))}
            >
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-neutral-900">{u.username}</option>
              ))}
            </select>
            <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-widest">Usuário Logado</div>
          </div>

          <div className="flex justify-between items-center mb-2 px-1">
            <span className="font-mono text-[10px]">SQLITE STORAGE: ACTIVE</span>
            <span className="text-blue-500 font-bold text-[10px]">OFFLINE</span>
          </div>

          <Link
            to="/admin"
            className="flex items-center gap-4 p-3 admin-badge rounded-lg text-white font-medium hover:bg-white/20 transition-all text-sm"
          >
            <Settings className="w-5 h-5 stroke-[2px]" />
            <span>Admin Panel</span>
          </Link>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#262626] bg-black flex justify-around p-3 z-50">
        {navLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <link.icon className={clsx("w-6 h-6", location.pathname === link.to ? "stroke-[2px] text-white" : "stroke-[2px] text-gray-500")} />
          </Link>
        ))}
      </div>
    </>
  );
};
