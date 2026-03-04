import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import Header from './components/Header';
import Footer from './components/Footer';
import NotificationBanner from './components/NotificationBanner';
import Home from './pages/Home';
import About from './pages/About';
import Projects from './pages/Projects';
import Events from './pages/Events';
import Sponsors from './pages/Sponsors';
import Migrate from './pages/Migrate';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/admin/Admin';

import { IKContext } from 'imagekitio-react';

const App: React.FC = () => {
  // Simple custom router state using hash
  const [currentPath, setCurrentPath] = useState(() => {
    // Initialize from URL hash if available
    const fullHash = window.location.hash.slice(1) || '/';
    return fullHash.split('#')[0];
  });
  
  // User authentication state
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleHashChange = () => {
      // Get the hash and extract only the route path (before any # fragment)
      const fullHash = window.location.hash.slice(1) || '/';
      // Split by # to get only the route part (ignore fragment identifiers)
      const routePath = fullHash.split('#')[0];
      setCurrentPath(routePath);
      window.scrollTo(0, 0); // Scroll to top on navigation
    };

    // Set initial path
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  const renderPage = () => {
    try {
      // Check if path starts with /about (for /about/generalbody, etc.)
      if (currentPath && currentPath.startsWith('/about')) {
        return <About currentPath={currentPath} onNavigate={navigate} />;
      }
      
      // Check if path starts with /projects (for /projects/[project-id], etc.)
      if (currentPath && currentPath.startsWith('/projects')) {
        return <Projects currentPath={currentPath} onNavigate={navigate} />;
      }
      
      // Check if path starts with /admin
      if (currentPath && currentPath.startsWith('/admin')) {
        return <Admin currentPath={currentPath} onNavigate={navigate} />;
      }
      
      // Extract base path (remove hash fragment for routing)
      const basePath = currentPath ? currentPath.split('#')[0] : '/';
      
      switch (basePath) {
        case '/':
          return <Home />;
        case '/events':
          return <Events />;
        case '/sponsors':
          return <Sponsors />;
        case '/migrate':
          return <Migrate />;
        case '/login':
          return <Login onNavigate={navigate} />;
        case '/profile':
        case '/settings':
          return <Profile onNavigate={navigate} />;
        default:
          return <Home />;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return <Home />;
    }
  };

  
return (
    <IKContext
      publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT}
    >
      <div className="flex flex-col min-h-screen font-sans" style={{ background: 'transparent' }}>
        {/* Notification Banner - shows at top when user is logged in */}
        {user && <NotificationBanner />}

        <Header currentPath={currentPath} onNavigate={navigate} user={user} />

        <main className="flex-grow">
          {renderPage()}
        </main>

        <Footer />
      </div>
    </IKContext>
  );
};

export default App;