import { useState, useRef } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LineChart, FolderKanban } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Menu } from 'lucide-react';
import Chatbot from './Chatbot';

export default function Layout() {
  // Authentication state management
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <div className={`
          fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:static lg:inset-auto lg:translate-x-0 lg:shadow-none
          w-64 bg-white
        `}
        style={{ backgroundColor: "rgb(31, 41, 55)" }}
      >
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2 font-sans ml-2 my-2">
            Malomatia
          </h1>
        </div>
        <nav className="ml-2">
          <Link 
            to="/" 
            className="my-3 flex items-center px-6 py-3 text-white hover:bg-gray-700 transition-colors"
            onClick={closeSidebar}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link 
            to="/returns" 
            className="my-3 flex items-center px-6 py-3 text-white hover:bg-gray-700 transition-colors"
            onClick={closeSidebar}
          >
            <Users className="w-5 h-5 mr-3" />
            Returns
          </Link>
          <Link 
            to="/net_sales" 
            className="flex items-center px-6 py-3 text-white hover:bg-gray-700 transition-colors"
            onClick={closeSidebar}
          >
            <FolderKanban className="w-5 h-5 mr-3" />
            Net Sales
          </Link>
          <Link 
            to="/return_rate" 
            className="my-3 flex items-center px-6 py-3 text-white hover:bg-gray-700 transition-colors"
            onClick={closeSidebar}
          >
            <LineChart className="w-5 h-5 mr-3" />
            Return Rate
          </Link>
        </nav>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <header className="bg-blue shadow-sm relative z-10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            {/* Mobile Sidebar Toggle Button: Visible only on smaller screens */}
            <button 
              className="lg:hidden mr-4 text-white focus:outline-none"
              onClick={toggleSidebar}
              aria-label="Toggle navigation sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white"></h1>
          </div>
          
          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center space-x-2 bg-gray-700 text-white px-4 py-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={() => setIsDropdownOpen(prev => !prev)}
            >
              <span className="font-semibold">{user?.name}</span>
              <img
                src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 mr-3 border rounded-lg shadow-lg bg-gray-200">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-11 py-2 text-gray-700 hover:bg-gray-300 rounded-md"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-100 p-0">
          <div className="p-6 pt-0">
            <Outlet />
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
