import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Shield, Flag, BarChart3, Activity } from 'lucide-react';
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

      tl.from(containerRef.current, { y: -18, duration: 0.45, ease: 'power2.out', delay: 0.05 });

      tl.from(logoRef.current, { x: -8, duration: 0.3, ease: 'power2.out' }, '-=0.25');

      const validItems = itemsRef.current.filter(Boolean);
      if (validItems.length > 0) {
        tl.fromTo(
          validItems,
          { y: -6 },
          { y: 0, duration: 0.26, stagger: 0.03, ease: 'power2.out' },
          '-=0.18'
        );
      }
    });

    return () => ctx.revert();
  }, []);

  const handleItemHover = useCallback((index, isHovering) => {
    const item = itemsRef.current[index];
    if (!item) return;

    gsap.to(item, {
      scale: 1,
      y: isHovering ? -1 : 0,
      color: isHovering ? '#fff' : 'rgba(255,255,255,0.7)',
      duration: 0.22,
      ease: 'power2.out'
    });
  }, []);

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] flex justify-center w-full pointer-events-none ${isScrolled ? 'pt-2' : 'pt-3 sm:pt-4'}`}
    >
      <div
        ref={containerRef}
        className={`pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-5 py-2.5 transition-all duration-500 border border-f1-copper/15 bg-[#15151e]/80 backdrop-blur-xl shadow-[0_14px_44px_rgba(0,0,0,0.42)] ${isScrolled ? 'w-[96%] lg:w-[1040px]' : 'w-[97%] lg:w-[1140px]'}`}
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}
      >
        <Link to="/" className="relative flex items-center gap-3 group min-w-0">
          <span className="hidden sm:block h-8 w-1 bg-f1-red shadow-[0_0_18px_rgba(255,85,61,0.55)]" />
          <div ref={logoRef} className="relative z-10 flex items-center">
            <span className="text-2xl sm:text-3xl font-racing font-extrabold italic tracking-normal text-f1-copper text-glow">
              F1
            </span>
            <span className="ml-1 text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.18em] text-white/80 group-hover:text-white transition-colors duration-300">
              Explorer
            </span>
          </div>
        </Link>

        <div className="min-w-0 w-full justify-self-stretch sm:justify-self-center flex items-center justify-end sm:justify-center gap-1 overflow-x-auto no-scrollbar max-w-full">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                ref={(el) => (itemsRef.current[index] = el)}
                className={`relative flex items-center gap-2 px-2.5 sm:px-3.5 py-2 transition-all duration-300 border font-mono uppercase tracking-[0.12em] ${isActive ? 'border-f1-red/45 bg-f1-red/12 text-white shadow-[inset_0_-2px_0_rgba(255,85,61,0.55)]' : 'border-transparent text-white/62 hover:border-white/12 hover:bg-white/[0.04]'}`}
                onMouseEnter={() => handleItemHover(index, true)}
                onMouseLeave={() => handleItemHover(index, false)}
              >
                <Icon className={`w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] transition-colors duration-300 ${isActive ? 'text-f1-red' : 'group-hover:text-white'}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden lg:block text-[11px] font-bold">
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute left-1 right-1 bottom-0 h-px bg-f1-copper/70 lg:hidden" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden sm:flex justify-self-end items-center gap-2 border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
          <Activity className="w-3.5 h-3.5" />
          Live Data
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
