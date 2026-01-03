import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { NAV_LINKS } from '../constants';
import { Settings, LogOut, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user?: any;
}

const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, user }) => {
  const [userData, setUserData] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Check if a menu item is the current page (so we can underline it)
  // If the link is "/" (home), check if we're exactly on the home page
  // Otherwise, check if the current path starts with the link path
  // Remove hash fragment for comparison
  const basePath = currentPath?.split('#')[0] || currentPath;
  const isActive = (path: string) =>
    path === '/' ? basePath === '/' : basePath?.startsWith(path);

  // Fetch user data if user is logged in
  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
        });
    } else {
      setUserData(null);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      onNavigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpen && !target.closest('[data-menu-container]')) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  return (
    // The main header container - this is the whole header bar at the top of the page
    <header
      className="font-jost text-white select-none"
      style={{
        // Slightly darker black background so background image shows through but with subtle black tint
        background: "rgba(0, 0, 0, 0.3)",
        // Add subtle backdrop blur for better readability
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        // Subtle border at the bottom
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        // Make the height responsive: smallest is 70px, biggest is 140px
        // Reduced height for more compact header
        height: "clamp(70px, 9.5vw, 140px)",
        // Make the header take up the full width of the screen
        width: "100%",
        // Use flexbox to arrange things inside
        display: "flex",
        // Put things in the middle vertically (up and down)
        alignItems: "center",
        // Put things in the middle horizontally (left and right)
        justifyContent: "center",
        // Make header sticky
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Inner container: keeps space on left and right sides (64px on large screens, smaller on small screens) */}
      <div
        style={{
          // Use flexbox to arrange logo and menu items
          display: "flex",
          // Put things in the middle vertically
          alignItems: "center",
          // Put space between logo and menu items evenly
          justifyContent: "space-between",
          // Make width = full width minus padding on both sides
          // Padding is responsive: smallest is 16px, biggest is 64px on each side
          // So we subtract clamp(16px, 4.23vw, 64px) * 2 (left + right)
          width: "calc(100% - clamp(32px, 8.46vw, 128px))",
          // Allow the container to shrink if screen is too small
          minWidth: 0,
        }}
      >
        {/* The ASME logo image on the left side */}
        <img
          src="/asme_Logo.png"
          alt="ASME"
          style={{
            // Make height responsive: smallest is 40px, biggest is 113px
            height: "clamp(40px, 7.47vw, 113px)",
            // Keep the width proportional to height (auto = figure it out)
            width: "auto",
            // Make it a block element
            display: "block",
            // Don't let the logo shrink if space is tight
            flexShrink: 0,
            cursor: "pointer",
          }}
          onClick={() => onNavigate('/')}
          onError={(e) => {
            // Fallback to Wikipedia image if local image doesn't exist
            (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/ASME_logo.svg/512px-ASME_logo.svg.png";
            (e.target as HTMLImageElement).style.filter = "brightness(0) invert(1)";
          }}
        />

        {/* Loop through all menu items and create a link for each one */}
        {/* Menu items are directly rendered without wrapper div, allowing space-between to distribute them */}
        {NAV_LINKS.map((link) => {
          // Check if this menu item is the current page
          const active = isActive(link.path);
          return (
            <button
              key={link.name}
              onClick={() => onNavigate(link.path)}
              style={{
                // Make text white
                color: "#FFF",
                // Use the Jost font we set up earlier
                fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                // Make font size responsive: smallest is 12px, biggest is 34.575px
                fontSize: "clamp(12px, 2.29vw, 34.575px)",
                // Make text normal weight (not bold)
                fontWeight: 400,
                // If this is the active page, underline it. Otherwise, no underline
                textDecoration: active ? "underline" : "none",
                // Make underline white if it's active, invisible if not
                textDecorationColor: active ? "#FFF" : "transparent",
                // Make the underline a little bit below the text (responsive)
                textUnderlineOffset: "clamp(2px, 0.26vw, 4px)",
                // Make the underline thickness responsive
                textDecorationThickness: "clamp(1px, 0.13vw, 2px)",
                // Don't let the text wrap to a new line - keep it on one line
                whiteSpace: "nowrap",
                // Remove button default styles
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {/* Show the menu item label (like "HOME", "ABOUT", etc.) */}
              {link.name}
            </button>
          );
        })}

        {/* Admin Menu Item - Only show if user is admin or President */}
        {(userData?.role === 'admin' || userData?.role === 'President') && (
          <button
            onClick={() => onNavigate('/admin')}
            style={{
              // Make text white
              color: "#FFF",
              // Use the Jost font we set up earlier
              fontFamily: "var(--font-jost, 'Jost', sans-serif)",
              // Make font size responsive: smallest is 12px, biggest is 34.575px
              fontSize: "clamp(12px, 2.29vw, 34.575px)",
              // Make text normal weight (not bold)
              fontWeight: 400,
              // If this is the active page, underline it. Otherwise, no underline
              textDecoration: isActive('/admin') ? "underline" : "none",
              // Make underline white if it's active, invisible if not
              textDecorationColor: isActive('/admin') ? "#FFF" : "transparent",
              // Make the underline a little bit below the text (responsive)
              textUnderlineOffset: "clamp(2px, 0.26vw, 4px)",
              // Make the underline thickness responsive
              textDecorationThickness: "clamp(1px, 0.13vw, 2px)",
              // Don't let the text wrap to a new line - keep it on one line
              whiteSpace: "nowrap",
              // Remove button default styles
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ADMIN
          </button>
        )}

        {/* User Menu - Hamburger Menu */}
        <div style={{ position: "relative", flexShrink: 0 }} data-menu-container>
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              color: "#FFF",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "clamp(8px, 1vw, 16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Menu"
          >
            {menuOpen ? (
              <X style={{ width: "clamp(24px, 2.29vw, 40px)", height: "clamp(24px, 2.29vw, 40px)" }} />
            ) : (
              <Menu style={{ width: "clamp(24px, 2.29vw, 40px)", height: "clamp(24px, 2.29vw, 40px)" }} />
            )}
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "clamp(8px, 1vw, 16px)",
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "clamp(4px, 0.5vw, 8px)",
                padding: "clamp(8px, 1vw, 16px)",
                minWidth: "clamp(150px, 20vw, 250px)",
                zIndex: 1000,
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              }}
            >
              {user ? (
                <>
                  {/* User Name Display */}
                  <div
                    style={{
                      padding: "clamp(8px, 1vw, 14px)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                      marginBottom: "clamp(4px, 0.5vw, 8px)",
                    }}
                  >
                    <span
                      style={{
                        color: "#FFF",
                        fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                        fontSize: "clamp(14px, 1.5vw, 20px)",
                        fontWeight: 600,
                      }}
                    >
                      {userData?.name || user.email?.split('@')[0] || 'User'}
                    </span>
                  </div>

                  {/* Profile/Settings Button */}
                  <button
                    onClick={() => {
                      onNavigate('/profile');
                      setMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      color: "#FFF",
                      fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                      fontSize: "clamp(12px, 1.5vw, 18px)",
                      fontWeight: 400,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "clamp(8px, 1vw, 14px)",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(8px, 1vw, 14px)",
                      borderRadius: "clamp(4px, 0.5vw, 6px)",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Settings style={{ width: "clamp(16px, 1.5vw, 24px)", height: "clamp(16px, 1.5vw, 24px)" }} />
                    <span>Settings</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      color: "#FFF",
                      fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                      fontSize: "clamp(12px, 1.5vw, 18px)",
                      fontWeight: 400,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "clamp(8px, 1vw, 14px)",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(8px, 1vw, 14px)",
                      borderRadius: "clamp(4px, 0.5vw, 6px)",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <LogOut style={{ width: "clamp(16px, 1.5vw, 24px)", height: "clamp(16px, 1.5vw, 24px)" }} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                /* Login Button - When not logged in */
                <button
                  onClick={() => {
                    onNavigate('/login');
                    setMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    color: "#FFF",
                    fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                    fontSize: "clamp(12px, 1.5vw, 18px)",
                    fontWeight: 400,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "clamp(8px, 1vw, 14px)",
                    textAlign: "left",
                    borderRadius: "clamp(4px, 0.5vw, 6px)",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
