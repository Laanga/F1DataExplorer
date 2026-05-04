import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Shield, Flag, BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';

const Navbar = () => {
  const location = useLocation();
  const navRef = useRef(null);
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const itemsRef = useRef([]);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/pilotos', label: 'Pilotos', icon: Users },
    { path: '/equipos', label: 'Equipos', icon: Shield },
    { path: '/carreras', label: 'Carreras', icon: Flag },
    { path: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  ];

  // Scroll effect to shrink navbar
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const nextIsScrolled = window.scrollY > 40;
        setIsScrolled(prev => prev === nextIsScrolled ? prev : nextIsScrolled);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP initial animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Fade in floating container
      tl.fromTo(
        containerRef.current,
        { y: -80, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'power4.out', delay: 0.2 }
      );

      // Logo pop
      tl.fromTo(
        logoRef.current,
        { opacity: 0, rotateX: -90 },
        { opacity: 1, rotateX: 0, duration: 0.8, ease: 'back.out(2)' },
        '-=0.8'
      );

      // Nav item stagger
      const validItems = itemsRef.current.filter(Boolean);
      if (validItems.length > 0) {
        tl.fromTo(
          validItems,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(1.5)' },
          '-=0.7'
        );
      }
    });

    return () => ctx.revert();
  }, []);

  const handleItemHover = useCallback((index, isHovering) => {
    const item = itemsRef.current[index];
    if (!item) return;

    gsap.to(item, {
      scale: isHovering ? 1.05 : 1,
      y: isHovering ? -3 : 0,
      color: isHovering ? '#fff' : 'rgba(255,255,255,0.7)',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] flex justify-center w-full pointer-events-none ${isScrolled ? 'pt-2 sm:pt-4' : 'pt-4 sm:pt-6'}`}
    >
      <div
        ref={containerRef}
        className={`pointer-events-auto flex items-center justify-between px-6 py-3 transition-all duration-500 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] glass rounded-full ring-1 ring-white/10 ${isScrolled ? 'w-[90%] sm:w-[80vw] lg:w-[1000px] shadow-[0_8px_32px_rgba(225,6,0,0.15)] bg-f1-dark/60' : 'w-[95%] sm:w-[90vw] lg:w-[1100px] shadow-[0_16px_40px_rgba(0,0,0,0.4)] bg-f1-dark/40'}`}
      >
        {/* Logo */}
        <Link to="/" className="relative flex items-center space-x-2 group">
          <div ref={logoRef} className="relative z-10 flex items-center">
            <span className="text-xl sm:text-2xl font-racing tracking-wider text-f1-red text-glow">
              F1
            </span>
            <span className="ml-[2px] text-sm sm:text-base font-sans font-bold uppercase tracking-widest text-white/90 group-hover:text-white transition-colors duration-300">
              Data
            </span>
          </div>
          <div className="absolute inset-0 bg-f1-red/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center space-x-1 sm:space-x-3 md:space-x-6">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                ref={(el) => (itemsRef.current[index] = el)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 overflow-hidden ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
                onMouseEnter={() => handleItemHover(index, true)}
                onMouseLeave={() => handleItemHover(index, false)}
              >
                <Icon className={`w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] transition-colors duration-300 ${isActive ? 'text-f1-red' : 'group-hover:text-white'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden lg:block text-sm font-medium tracking-wide">
                  {item.label}
                </span>

                {/* Active Highlight Glow */}
                {isActive && (
                  <div className="absolute inset-0 border border-f1-red/30 rounded-full bg-gradient-to-t from-f1-red/10 to-transparent z-[-1]" />
                )}
                {/* Active Indicator Dot (Mobile/Tablet) */}
                {isActive && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-f1-red lg:hidden shadow-[0_0_8px_rgba(225,6,0,0.8)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
