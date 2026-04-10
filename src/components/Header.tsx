import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { NAV_LINKS } from '../constants';
import { Settings, LogOut, Menu, X, User } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user?: any;
}

const DEFAULT_ALLOWED_ADMIN_ROLES = ['President', 'Vice President'];

const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, user }) => {
  const [userData, setUserData] = useState<any>(null);
  const [allowedAdminRoles, setAllowedAdminRoles] = useState<string[]>(DEFAULT_ALLOWED_ADMIN_ROLES);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  
  // Check if a menu item is the current page (so we can underline it)
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

  // Live list of roles allowed to open the admin panel (same doc as Admin Access page)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, 'config', 'adminAccess'),
      (snap) => {
        const roles = snap.exists()
          ? (snap.data()?.allowedRoles || DEFAULT_ALLOWED_ADMIN_ROLES)
          : DEFAULT_ALLOWED_ADMIN_ROLES;
        setAllowedAdminRoles(Array.isArray(roles) ? roles : DEFAULT_ALLOWED_ADMIN_ROLES);
      },
      () => setAllowedAdminRoles(DEFAULT_ALLOWED_ADMIN_ROLES)
    );
    return () => unsub();
  }, [user]);

  const canAccessAdmin =
    userData?.role &&
    (userData.role === 'President' ||
      userData.role === 'admin' ||
      allowedAdminRoles.includes(userData.role));

  // Fetch admin notification counts (only when user can access admin)
  useEffect(() => {
    if (!canAccessAdmin) {
      setAdminNotificationCount(0);
      return;
    }

    // Use state variables to match Dashboard logic exactly
    let pendingUsersCount = 0;
    let pendingProjectsCount = 0;
    let deletionRequestsCount = 0;
    let sponsorDeletionRequestsCount = 0;

    const updateTotalCount = () => {
      // Exact same calculation as Dashboard: pendingUsersCount + pendingProjectsCount + deletionRequestsCount + sponsorDeletionRequestsCount
      const total = pendingUsersCount + pendingProjectsCount + deletionRequestsCount + sponsorDeletionRequestsCount;
      setAdminNotificationCount(total);
    };

    // Listen for pending users - same as Dashboard
    const usersQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        pendingUsersCount = snapshot.size;
        updateTotalCount();
      },
      (error) => {
        console.error('Header - Error fetching pending users:', error);
      }
    );

    // Listen for pending projects - same as Dashboard
    const pendingProjectsQuery = query(collection(db, 'projects'), where('approvalStatus', '==', 'pending'));
    const unsubscribePendingProjects = onSnapshot(pendingProjectsQuery, (snapshot) => {
      pendingProjectsCount = snapshot.size;
      updateTotalCount();
    });

    // Listen for deletion requests (projects with permanentDeleteRequest that aren't fully approved) - same as Dashboard
    const allProjectsQuery = query(collection(db, 'projects'));
    const unsubscribeAllProjects = onSnapshot(allProjectsQuery, (snapshot) => {
      deletionRequestsCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          // Count if not fully approved (either leader or exec approval is missing) - same logic as Dashboard
          if (!request.approvedByLeader || !request.approvedByExec) {
            deletionRequestsCount++;
          }
        }
      });
      updateTotalCount();
    });

    // Listen for sponsor deletion requests (sponsors with permanentDeleteRequest that aren't fully approved) - same as Dashboard
    const allSponsorsQuery = query(collection(db, 'sponsors'));
    const unsubscribeAllSponsors = onSnapshot(allSponsorsQuery, (snapshot) => {
      sponsorDeletionRequestsCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          // Count if not fully approved (both exec approvals are missing) - same logic as Dashboard
          if (!request.approvedByExec1 || !request.approvedByExec2) {
            sponsorDeletionRequestsCount++;
          }
        }
      });
      updateTotalCount();
    });

    return () => {
      unsubscribeUsers();
      unsubscribePendingProjects();
      unsubscribeAllProjects();
      unsubscribeAllSponsors();
    };
  }, [canAccessAdmin]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      setMobileNavOpen(false);
      onNavigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close mobile nav when viewport becomes desktop-sized
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpen && !target.closest('[data-menu-container]')) {
        setMenuOpen(false);
      }
      if (mobileNavOpen && !target.closest('[data-mobile-nav-container]')) {
        setMobileNavOpen(false);
      }
    };

    if (menuOpen || mobileNavOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen, mobileNavOpen]);

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
        height: "clamp(70px, 8vw, 125px)",
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
            height: "clamp(40px, 6vw, 113px)",
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

        {/* Desktop: horizontal nav (md and up) */}
        <div className="hidden md:flex md:flex-1 md:items-center md:justify-between md:min-w-0 md:mx-4 lg:mx-8">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.path);
            return (
              <button
                key={link.name}
                onClick={() => onNavigate(link.path)}
                style={{
                  color: "#FFF",
                  fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                  fontSize: "clamp(12px, 1.8vw, 34.575px)",
                  fontWeight: 400,
                  textDecoration: active ? "underline" : "none",
                  textDecorationColor: active ? "#FFF" : "transparent",
                  textUnderlineOffset: "clamp(2px, 0.26vw, 4px)",
                  textDecorationThickness: "clamp(1px, 0.13vw, 2px)",
                  whiteSpace: "nowrap",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {link.name}
              </button>
            );
          })}

          {canAccessAdmin && (
            <button
              onClick={() => onNavigate('/admin')}
              style={{
                position: "relative",
                color: "#FFF",
                fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                fontSize: "clamp(12px, 2.29vw, 34.575px)",
                fontWeight: 400,
                textDecoration: isActive('/admin') ? "underline" : "none",
                textDecorationColor: isActive('/admin') ? "#FFF" : "transparent",
                textUnderlineOffset: "clamp(2px, 0.26vw, 4px)",
                textDecorationThickness: "clamp(1px, 0.13vw, 2px)",
                whiteSpace: "nowrap",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ADMIN
              {adminNotificationCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-6px",
                    backgroundColor: "#EF4444",
                    color: "#FFF",
                    borderRadius: "50%",
                    minWidth: "clamp(18px, 2vw, 24px)",
                    height: "clamp(18px, 2vw, 24px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(10px, 1.2vw, 14px)",
                    fontWeight: "bold",
                    padding: "0 clamp(4px, 0.5vw, 6px)",
                    fontFamily: "var(--font-jost, 'Jost', sans-serif)",
                    border: "2px solid rgba(0, 0, 0, 0.3)",
                    boxSizing: "border-box",
                  }}
                >
                  {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Right cluster: mobile site nav + account (account only on md+) */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {/* Mobile: site nav hamburger (below md) */}
        <div
          className="relative md:hidden shrink-0"
          data-mobile-nav-container
        >
          <button
            type="button"
            onClick={() => {
              setMobileNavOpen(!mobileNavOpen);
              setMenuOpen(false);
            }}
            style={{
              color: "#FFF",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "clamp(8px, 1vw, 12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-expanded={mobileNavOpen}
            aria-label="Open site menu"
          >
            {mobileNavOpen ? (
              <X style={{ width: 28, height: 28 }} />
            ) : (
              <Menu style={{ width: 28, height: 28 }} />
            )}
          </button>

          {mobileNavOpen && (
            <div
              className="absolute right-0 z-[60] mt-2 min-w-[min(100vw-2rem,280px)] rounded-lg border border-white/20 bg-black/95 p-3 shadow-lg backdrop-blur-md"
              role="menu"
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <button
                      key={link.name}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onNavigate(link.path);
                        setMobileNavOpen(false);
                      }}
                      className="w-full rounded px-3 py-2.5 text-left font-jost text-base text-white transition-colors hover:bg-white/10"
                      style={{
                        textDecoration: active ? "underline" : "none",
                        textDecorationColor: active ? "#FFF" : "transparent",
                        textUnderlineOffset: "4px",
                      }}
                    >
                      {link.name}
                    </button>
                  );
                })}
                {canAccessAdmin && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onNavigate('/admin');
                      setMobileNavOpen(false);
                    }}
                    className="relative w-full rounded px-3 py-2.5 text-left font-jost text-base text-white transition-colors hover:bg-white/10"
                    style={{
                      textDecoration: isActive('/admin') ? "underline" : "none",
                      textDecorationColor: isActive('/admin') ? "#FFF" : "transparent",
                      textUnderlineOffset: "4px",
                    }}
                  >
                    ADMIN
                    {adminNotificationCount > 0 && (
                      <span
                        className="ml-2 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
                      >
                        {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu — account (desktop: menu icon; mobile: user icon to distinguish from site nav) */}
        <div className="relative shrink-0" data-menu-container>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(!menuOpen);
              setMobileNavOpen(false);
            }}
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
            title="Account"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className="hidden md:inline">
              {menuOpen ? (
                <X style={{ width: "clamp(24px, 2.29vw, 40px)", height: "clamp(24px, 2.29vw, 40px)" }} />
              ) : (
                <Menu style={{ width: "clamp(24px, 2.29vw, 40px)", height: "clamp(24px, 2.29vw, 40px)" }} />
              )}
            </span>
            <span className="md:hidden">
              {menuOpen ? (
                <X style={{ width: 28, height: 28 }} />
              ) : (
                <User style={{ width: 28, height: 28 }} />
              )}
            </span>
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
      </div>
    </header>
  );
};

export default Header;
