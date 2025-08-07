import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ currentUser, onlineServices, totalServices }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { logout, isAuthenticated } = useAuth();
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-green-900/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo with TDX image AND text */}
            <div className="flex items-center space-x-3">
              <img 
                src="/TDX_Night.png" 
                alt="TaylorDex Logo" 
                className="h-10 w-10 object-contain hover:opacity-90 transition-opacity cursor-pointer"
                title="TaylorDex - Docker Dashboard"
                onError={(e) => {
                  // Fallback to letter logo if image fails
                  e.target.style.display = 'none';
                  document.getElementById('fallback-logo-icon').style.display = 'flex';
                }}
              />
              {/* Fallback logo icon (hidden by default) */}
              <div id="fallback-logo-icon" className="hidden w-10 h-10 bg-gradient-to-br from-green-400 to-yellow-500 rounded-lg items-center justify-center shadow-lg shadow-green-500/30">
                <span className="text-xl font-bold text-gray-900">T</span>
              </div>
              {/* TaylorDex text with green to yellow gradient */}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-green-300 to-yellow-400 bg-clip-text text-transparent">
                TaylorDex
              </h1>
            </div>
            {/* Status indicator */}
            <div className="flex items-center space-x-2 text-sm ml-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400"></div>
              <span className="text-gray-400">{onlineServices}/{totalServices} Services Online</span>
            </div>
          </div>
          
          {/* Right side - User area */}
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors group">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="relative" ref={menuRef}>
              <div 
                className="flex items-center space-x-2 group cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                  {currentUser.name || currentUser.username}
                </span>
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-md shadow-green-500/30 flex items-center justify-center text-sm font-bold text-gray-900">
                  {(currentUser.name || currentUser.username || 'A').charAt(0).toUpperCase()}
                </div>
                {isAuthenticated && (
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {showUserMenu && isAuthenticated && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-[9999]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">
                      <div className="font-medium">{currentUser.username}</div>
                      <div className="text-xs text-gray-500">{currentUser.email}</div>
                      <div className="text-xs text-green-400 capitalize">{currentUser.role}</div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
