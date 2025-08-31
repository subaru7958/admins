import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/dashboard/training-plans', label: 'Training Plans' },
  { to: '/dashboard/events', label: 'Events' },
  { to: '/dashboard/sessions', label: 'Session Management' },
  { to: '/dashboard/settings', label: 'Settings' },
];

const adminLinks = [
  { to: '/dashboard/players', label: 'Players' },
  { to: '/dashboard/coaches', label: 'Coaches' },
];

function SidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-blue-600 dark:text-gray-100">SportManager</div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm"
          aria-label="Toggle navigation"
        >
          Menu
        </button>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="flex">
          {/* Sidebar */}
          <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-gray-200 transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="hidden md:flex items-center gap-2 px-4 py-4 border-b border-gray-200">
              <div className="text-lg font-semibold text-blue-600 dark:text-gray-100">SportManager</div>
            </div>
            <nav className="p-3 space-y-1">
              {links.map((l) => {
                const active = location.pathname === l.to;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                );
              })}
              
              {/* Administration des Ressources Humaines Section */}
              <div className="border-t border-gray-200 pt-1 mt-1">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                >
                  <span>Administration des Ressources Humaines</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {adminOpen && (
                  <div className="pl-4 py-1 space-y-1">
                    {adminLinks.map((l) => {
                      const active = location.pathname === l.to;
                      return (
                        <Link
                          key={l.to}
                          to={l.to}
                          className={`block rounded-md px-3 py-2 text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    handleLogout();
                  }
                }}
                className="block w-full text-left rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 md:ml-0 ml-0 w-full md:w-auto md:pl-0 pl-0 md:py-6">
            <div className="md:ml-64" />
            <div className="px-4 md:px-6 py-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default SidebarLayout;


