import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Shield, Flag, BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';

const Navbar = () => {
  const location = useLocation();
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const logoGlowRef = useRef(null);
  const logoLineRef = useRef(null);
  const itemsRef = useRef([]);
  const activeIndicatorRef = useRef(null);
  const speedLinesRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/pilotos', label: 'Pilotos', icon: Users },
    { path: '/equipos', label: 'Equipos', icon: Shield },
    { path: '/carreras', label: 'Carreras', icon: Flag },
    { path: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  ];

  // Animación inicial del navbar
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Entrada del navbar
      tl.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
      );

      // Logo con efecto de arranque
      tl.fromTo(
        logoRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(2)' },
        '-=0.5'
      );

      // Items del menú con stagger
      const validItems = itemsRef.current.filter(Boolean);
      if (validItems.length > 0) {
        tl.fromTo(
          validItems,
          { y: -50, opacity: 0, scale: 0.5 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)' },
          '-=0.6'
        );
      }

      // Animación de pulso sutil en el glow del logo
      if (logoGlowRef.current) {
        gsap.to(logoGlowRef.current, {
          scale: 1.06,
          opacity: 0.3,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }

      // Línea decorativa inferior
      if (logoLineRef.current) {
        gsap.fromTo(
          logoLineRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 1, delay: 0.5, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Animación de las líneas de velocidad
  useEffect(() => {
    if (!speedLinesRef.current) return;

    const ctx = gsap.context(() => {
      const lines = speedLinesRef.current.querySelectorAll('.speed-line');
      gsap.to(lines, {
        x: '200%',
        opacity: 0,
        duration: 1.5,
        stagger: 0.1,
        repeat: -1,
        ease: 'power2.in'
      });
    });

    return () => ctx.revert();
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Efecto magnético en el logo
  const handleLogoMouseMove = useCallback((e) => {
    if (!logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.15;
    const deltaY = (e.clientY - centerY) * 0.15;

    gsap.to(logoRef.current, {
      x: deltaX,
      y: deltaY,
      rotation: deltaX * 0.5,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleLogoMouseLeave = useCallback(() => {
    if (!logoRef.current) return;
    gsap.to(logoRef.current, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)'
    });
  }, []);

  // Hover en items
  const handleItemHover = useCallback((index, isHovering) => {
    const item = itemsRef.current[index];
    if (!item) return;

    gsap.to(item, {
      scale: isHovering ? 1.05 : 1,
      y: isHovering ? -3 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Shimmer effect
    const shimmer = item.querySelector('.shimmer-effect');
    if (shimmer && isHovering) {
      gsap.fromTo(shimmer,
        { x: '-100%' },
        { x: '200%', duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  const handleItemTap = useCallback((index) => {
    const item = itemsRef.current[index];
    if (!item) return;
    gsap.to(item, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
      style={{ opacity: 0 }}
    >
      {/* Líneas de velocidad */}
      <div ref={speedLinesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="speed-line absolute h-px bg-gradient-to-r from-transparent via-f1-red/20 to-transparent"
            style={{
              top: `${20 + i * 15}%`,
              left: '-50%',
              width: '150px'
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className={`
          glass rounded-2xl px-6 py-3 flex items-center justify-between
          border border-white/10 transition-all duration-300
          ${isScrolled ? 'shadow-2xl shadow-black/50' : 'shadow-xl shadow-black/30'}
        `}>
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 group relative z-10"
            onMouseMove={handleLogoMouseMove}
            onMouseLeave={handleLogoMouseLeave}
          >
            <div ref={logoRef} className="relative">
              <div
                ref={logoGlowRef}
                className="absolute inset-0 bg-f1-red/15 rounded-full blur-lg -z-10"
                style={{ opacity: 0.18 }}
              />
              <div className="text-f1-red text-2xl font-black tracking-tighter">F1</div>
            </div>

            <div className="relative overflow-hidden">
              <span className="text-lg font-bold text-white/90 hidden sm:block group-hover:text-white transition-colors">
                Data
              </span>
              <div
                ref={logoLineRef}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-f1-red to-red-500 origin-left"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
          </Link>

          {/* Navegación */}
          <div className="flex items-center space-x-1 sm:space-x-2 relative z-10">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative group"
                  onMouseEnter={() => handleItemHover(index, true)}
                  onMouseLeave={() => handleItemHover(index, false)}
                  onClick={() => handleItemTap(index)}
                >
                  <div
                    ref={(el) => (itemsRef.current[index] = el)}
                    className={`
                      flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl
                      transition-all duration-300 relative overflow-hidden
                      ${isActive
                        ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                    style={{ opacity: 0 }}
                  >
                    {/* Shimmer effect */}
                    <div className="shimmer-effect absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full" />

                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                    <span className="hidden md:block text-sm font-medium relative z-10">
                      {item.label}
                    </span>
                  </div>

                  {/* Indicador activo */}
                  {isActive && (
                    <div
                      ref={activeIndicatorRef}
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full w-full bg-gradient-to-r from-transparent via-f1-red to-transparent animate-slide"
                        style={{ animation: 'slideIndicator 1.5s linear infinite' }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Espaciador */}
          <div className="w-20 sm:w-24 relative z-10" />
        </div>

        {/* Línea decorativa inferior */}
        <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-f1-red/30 to-transparent" />
      </div>

      <style>{`
        @keyframes slideIndicator {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
