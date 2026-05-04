import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Trophy, TrendingUp, Users, Shield, Github } from 'lucide-react';
import { getSeasonProgress, getDriverStandings, getDrivers } from '../services/openf1Service';
import { useYear } from '../contexts/YearContext';
import { getDriverPhoto, getTeamLogo } from '../utils/formatUtils';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const isLocalDriverPhoto = (path) => typeof path === 'string' && path.startsWith('/drivers/');

const resolveDriverLocalPhoto = (driverCandidate) => {
  const photo = getDriverPhoto(driverCandidate);
  return isLocalDriverPhoto(photo) ? photo : null;
};

const mapStandingsWithPhotos = (standings = [], drivers = []) => (
  standings.slice(0, 3).map((standing) => {
    const standingNumber = standing.driver?.permanentNumber?.toString();
    const standingCode = standing.driver?.code?.toLowerCase();
    const standingFullName = `${standing.driver?.givenName || ''} ${standing.driver?.familyName || ''}`.trim().toLowerCase();

    const driverData = drivers.find((driver) =>
      driver.driver_number?.toString() === standingNumber ||
      driver.name_acronym?.toLowerCase() === standingCode ||
      driver.full_name?.toLowerCase() === standingFullName
    );

    const localPhoto = resolveDriverLocalPhoto(
      driverData || {
        full_name: `${standing.driver?.givenName || ''} ${standing.driver?.familyName || ''}`.trim(),
        familyName: standing.driver?.familyName,
        givenName: standing.driver?.givenName,
        code: standing.driver?.code,
        name_acronym: standing.driver?.code
      }
    );

    return {
      ...standing,
      headshot_url: driverData?.headshot_url,
      driver_data: driverData,
      local_photo: localPhoto
    };
  })
);

const Inicio = () => {
  const { selectedYear } = useYear();
  const homeDataYear = selectedYear;
  const [seasonProgress, setSeasonProgress] = useState(null);
  const [topDrivers, setTopDrivers] = useState([]);
  const [failedPodiumPhotos, setFailedPodiumPhotos] = useState({});
  const [loading, setLoading] = useState(true);

  // Refs for massive animations
  const heroTextRef = useRef(null);
  const gridCardsRef = useRef([]);
  const progressRef = useRef(null);
  const podiumRef = useRef(null);
  const bgLinesRef = useRef([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [progress, standings, drivers] = await Promise.all([
          getSeasonProgress({ year: homeDataYear }),
          getDriverStandings({ signal: controller.signal, year: homeDataYear }),
          getDrivers({ signal: controller.signal, year: homeDataYear })
        ]);
        if (!controller.signal.aborted) {
          setSeasonProgress(progress);
          const top3WithPhotos = mapStandingsWithPhotos(standings, drivers);
          setTopDrivers(top3WithPhotos);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && !controller.signal.aborted) console.error(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [homeDataYear]);

  useEffect(() => {
    setFailedPodiumPhotos({});
  }, [topDrivers, homeDataYear]);

  // GSAP 2026 Epic Symmetric Animations
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Background central racing lines parallax
      bgLinesRef.current.forEach((line, i) => {
        if (!line) return;
        gsap.to(line, {
          yPercent: -100 * (i + 1),
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5
          }
        });
      });

      // Hero Entry Timeline
      const tl = gsap.timeline();
      tl.fromTo(
        heroTextRef.current.querySelectorAll('.char'),
        { y: 150, opacity: 0, rotateX: 90 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.05, ease: 'power4.out', delay: 0.2 }
      );

      // Symmetrical Grid Cards Reveal
      gridCardsRef.current.forEach((card) => {
        if (!card) return;
        gsap.fromTo(card,
          { opacity: 0, y: 100, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 1, ease: 'expo.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
            }
          }
        );
      });

      // Progress Bar Reveal
      if (progressRef.current) {
        gsap.fromTo(progressRef.current,
          { opacity: 0, scaleX: 0.8 },
          {
            opacity: 1, scaleX: 1, duration: 1.5, ease: 'power3.out',
            scrollTrigger: { trigger: progressRef.current, start: 'top 90%' }
          }
        );
      }

      // Symmetrical Podium Reveal
      if (podiumRef.current && topDrivers.length > 0) {
        const driversCards = podiumRef.current.querySelectorAll('.podium-card');
        gsap.fromTo(driversCards,
          { opacity: 0, y: 150 },
          {
            opacity: 1, y: 0,
            duration: 1.2, stagger: 0.2, ease: 'power3.out',
            scrollTrigger: {
              trigger: podiumRef.current,
              start: 'top 80%',
            }
          }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, topDrivers]);

  const splitText = (text) => {
    const occurrenceCount = {};

    return text.split('').map((char) => {
      occurrenceCount[char] = (occurrenceCount[char] || 0) + 1;
      return (
        <span key={`${char}-${occurrenceCount[char]}`} className="char inline-block">{char === ' ' ? '\u00A0' : char}</span>
      );
    });
  };

  const handleHoverMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(card, {
      rotateX: -y * 0.05,
      rotateY: x * 0.05,
      scale: 1.03,
      duration: 0.4,
      ease: 'power3.out'
    });
  };

  const handleHoverLeave = (e) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.7,
      ease: 'elastic.out(1, 0.5)'
    });
  };

  const hasRealPodium = topDrivers.length === 3;
  const championshipLeader = topDrivers[0] || null;
  const championshipRunnerUp = topDrivers[1] || null;
  const leaderPoints = Number(championshipLeader?.points || 0);
  const leaderGap = championshipRunnerUp ? Math.max(0, leaderPoints - Number(championshipRunnerUp.points || 0)) : 0;

  const getPodiumDriverKey = (driverStanding) => {
    if (!driverStanding) return null;
    const driver = driverStanding.driver || driverStanding.driver_data || {};
    return String(
      driver.driverId ||
      driver.driver_number ||
      driver.permanentNumber ||
      driver.code ||
      driver.name_acronym ||
      `${driver.givenName || driver.first_name || ''}-${driver.familyName || driver.last_name || ''}`
    ).toLowerCase();
  };

  const markPodiumPhotoAsFailed = (driverStanding) => {
    const key = getPodiumDriverKey(driverStanding);
    if (!key) return;
    setFailedPodiumPhotos((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const getPodiumPhoto = (driverStanding) => {
    if (!driverStanding) return null;
    const key = getPodiumDriverKey(driverStanding);
    if (key && failedPodiumPhotos[key]) return null;
    return (
      driverStanding.local_photo ||
      resolveDriverLocalPhoto(driverStanding.driver_data || driverStanding.driver) ||
      null
    );
  };

  const leaderPhoto = getPodiumPhoto(championshipLeader);
  const secondPlacePhoto = getPodiumPhoto(topDrivers[1]);
  const firstPlacePhoto = getPodiumPhoto(topDrivers[0]);
  const thirdPlacePhoto = getPodiumPhoto(topDrivers[2]);

  return (
    <div className="min-h-screen overflow-hidden flex flex-col bg-f1-dark relative w-full">
      {/* PERFECTLY SYMMETRICAL BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 flex justify-center gap-12 sm:gap-32 w-full">
        <div ref={el => bgLinesRef.current[0] = el} className="w-px h-[200vh] bg-gradient-to-b from-transparent via-f1-red to-transparent" />
        <div ref={el => bgLinesRef.current[1] = el} className="w-px h-[200vh] bg-gradient-to-b from-transparent via-f1-red to-transparent" />
        <div ref={el => bgLinesRef.current[2] = el} className="w-px h-[200vh] bg-gradient-to-b from-transparent via-f1-red to-transparent" />
      </div>

      {/* Hero Section */}
      <section id="hero-section" className="min-h-screen flex items-center justify-center px-4 relative z-10 w-full">
        <div className="max-w-[1400px] mx-auto w-full text-center flex flex-col items-center">

          <div className="glass shadow-[0_0_20px_rgba(225,6,0,0.2)] rounded-full px-6 py-2 inline-flex items-center gap-3 mb-10 border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-f1-red animate-pulse" />
            <span className="text-sm tracking-widest font-sans font-bold text-white/90 uppercase">
              TEMPORADA {homeDataYear}
            </span>
          </div>

          <h1
            ref={heroTextRef}
            className="w-full text-center text-[clamp(3.25rem,15vw,11rem)] font-racing leading-[0.95] tracking-tight uppercase overflow-visible py-3 sm:py-4 px-2"
            style={{ filter: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.5))' }}
          >
            <span className="inline-block pb-[0.12em] text-f1-red" style={{ WebkitTextFillColor: '#e10600', textShadow: '0 0 40px rgba(225,6,0,0.6)' }}>
              {splitText('F1 DATA')}
            </span>
          </h1>

          {/* Symmetrical Scroll Indicator */}
          <button
            onClick={() => document.getElementById('grid-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-20 flex flex-col items-center gap-4 group opacity-70 hover:opacity-100 transition-opacity"
          >
            <span className="text-xs uppercase tracking-widest text-white/50 font-bold group-hover:text-white transition-colors">Explorar</span>
            <div className="w-px h-16 bg-gradient-to-b from-f1-red to-transparent relative overflow-hidden">
              <div className="w-full h-1/2 bg-white absolute top-0 -translate-y-full group-hover:animate-[scroll-down_1.5s_ease-in-out_infinite]" />
            </div>
          </button>
        </div>
      </section>

      {/* PERFECTLY SYMMETRICAL MAIN GRID SECTION */}
      <section id="grid-section" className="py-24 px-4 sm:px-8 relative z-10 w-full">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center gap-12 w-full">

          {/* Integrated Podium - now above cards */}
          {!loading && (
            <div className="w-full relative">
              {hasRealPodium && championshipLeader && (
                <div className="glass rounded-[2.5rem] border border-white/10 px-6 py-7 md:px-10 md:py-8 mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(225,6,0,0.16)_0%,transparent_55%)]" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center shrink-0">
                      {leaderPhoto ? (
                        <img
                          src={leaderPhoto}
                          alt={`${championshipLeader.driver?.givenName || ''} ${championshipLeader.driver?.familyName || ''}`.trim()}
                          className="w-full h-full object-cover object-top"
                          onError={() => markPodiumPhotoAsFailed(championshipLeader)}
                        />
                      ) : (
                        <span className="text-3xl font-racing text-white/80">
                          {(championshipLeader.driver?.familyName || championshipLeader.driver?.code || '?').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-f1-red font-bold mb-2">Líder del campeonato</p>
                      <h3 className="text-4xl md:text-5xl font-racing text-white leading-[0.95]">
                        {championshipLeader.driver?.givenName} {championshipLeader.driver?.familyName}
                      </h3>
                      <p className="text-white/65 text-sm mt-2 flex items-center justify-center md:justify-start gap-2">
                        <img
                          src={getTeamLogo(championshipLeader.constructor?.name)}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {championshipLeader.constructor?.name || 'Equipo'}
                      </p>
                    </div>

                    <div className="text-center md:text-right shrink-0">
                      <p className="text-white text-5xl md:text-6xl font-black leading-none">{leaderPoints}</p>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mt-1">PTS</p>
                      <p className="text-sm text-white/70 mt-2">
                        {championshipRunnerUp ? `+${leaderGap} sobre P2` : 'Sin referencia P2'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none rounded-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(225,6,0,0.18)_0%,transparent_62%)]" />

              <div className="glass relative z-10 rounded-[2.5rem] border border-white/10 px-6 py-10 md:px-10 md:py-14 overflow-hidden">
                <div className="text-center mb-12 text-glow">
                  <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                  <h2 className="text-5xl md:text-7xl font-racing text-white mb-2">PODIO OFICIAL</h2>
                  <p className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-white/60 font-bold">
                    Temporada {homeDataYear}
                  </p>
                </div>

                {hasRealPodium ? (
                  <div ref={podiumRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-5 lg:gap-10 w-full max-w-6xl items-end mx-auto relative perspective-[2000px]">
                    {/* P2 (Left) */}
                    {topDrivers[1] && (
                      <div className="podium-card w-full flex flex-col items-center group cursor-pointer" onMouseMove={handleHoverMove} onMouseLeave={handleHoverLeave}>
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-gray-400/20 to-transparent p-2 mb-6 relative shadow-[0_0_30px_rgba(156,163,175,0.1)] border border-gray-400/20 group-hover:border-gray-400/50 transition-colors">
                          {secondPlacePhoto ? (
                            <img src={secondPlacePhoto} alt="" className="w-full h-full object-cover rounded-full filter contrast-125 object-top" onError={() => markPodiumPhotoAsFailed(topDrivers[1])} />
                          ) : (
                            <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center">
                              <span className="text-3xl font-racing text-white/80">
                                {(topDrivers[1].driver?.familyName || topDrivers[1].driver?.code || '?').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-400 text-f1-dark font-racing text-2xl flex items-center justify-center rounded-full shadow-lg border-2 border-f1-dark">2</div>
                        </div>
                        <h3 className="text-3xl font-racing text-white tracking-widest text-center">{topDrivers[1].driver?.familyName}</h3>
                        <p className="text-gray-400 font-sans text-sm font-bold uppercase tracking-widest mt-2">{topDrivers[1].constructor?.name}</p>
                        <div className="text-5xl font-black font-sans text-white mt-4">{topDrivers[1].points} <span className="text-lg text-gray-500 font-normal">PTS</span></div>
                      </div>
                    )}

                    {/* P1 (Center) */}
                    {topDrivers[0] && (
                      <div className="podium-card w-full flex flex-col items-center group cursor-pointer z-10" onMouseMove={handleHoverMove} onMouseLeave={handleHoverLeave}>
                        <div className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-gradient-to-b from-yellow-500/20 to-transparent p-2 mb-8 relative shadow-[0_0_50px_rgba(234,179,8,0.2)] border border-yellow-500/40 group-hover:border-yellow-500 transition-colors">
                          <div className="absolute inset-0 rounded-full animate-[spin_10s_linear_infinite] border-t-2 border-yellow-500/50" />
                          {firstPlacePhoto ? (
                            <img src={firstPlacePhoto} alt="" className="w-full h-full object-cover rounded-full filter contrast-[1.15] object-top" onError={() => markPodiumPhotoAsFailed(topDrivers[0])} />
                          ) : (
                            <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center">
                              <span className="text-4xl font-racing text-white/85">
                                {(topDrivers[0].driver?.familyName || topDrivers[0].driver?.code || '?').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-b from-yellow-400 to-yellow-600 text-f1-dark font-racing text-4xl flex items-center justify-center rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] border-4 border-f1-dark">1</div>
                        </div>
                        <h3 className="text-5xl font-racing text-yellow-500 text-glow tracking-widest text-center">{topDrivers[0].driver?.familyName}</h3>
                        <p className="text-gray-300 font-sans text-sm font-bold uppercase tracking-widest mt-3">{topDrivers[0].constructor?.name}</p>
                        <div className="text-7xl font-black font-sans text-white mt-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{topDrivers[0].points} <span className="text-xl text-yellow-500/50 font-normal">PTS</span></div>
                      </div>
                    )}

                    {/* P3 (Right) */}
                    {topDrivers[2] && (
                      <div className="podium-card w-full flex flex-col items-center group cursor-pointer" onMouseMove={handleHoverMove} onMouseLeave={handleHoverLeave}>
                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-amber-700/20 to-transparent p-2 mb-6 relative shadow-[0_0_30px_rgba(180,83,9,0.1)] border border-amber-700/30 group-hover:border-amber-700/60 transition-colors">
                          {thirdPlacePhoto ? (
                            <img src={thirdPlacePhoto} alt="" className="w-full h-full object-cover rounded-full filter contrast-125 object-top" onError={() => markPodiumPhotoAsFailed(topDrivers[2])} />
                          ) : (
                            <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center">
                              <span className="text-3xl font-racing text-white/80">
                                {(topDrivers[2].driver?.familyName || topDrivers[2].driver?.code || '?').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-700 text-white font-racing text-2xl flex items-center justify-center rounded-full shadow-lg border-2 border-f1-dark">3</div>
                        </div>
                        <h3 className="text-3xl font-racing text-white tracking-widest text-center">{topDrivers[2].driver?.familyName}</h3>
                        <p className="text-gray-400 font-sans text-sm font-bold uppercase tracking-widest mt-2">{topDrivers[2].constructor?.name}</p>
                        <div className="text-5xl font-black font-sans text-white mt-4">{topDrivers[2].points} <span className="text-lg text-gray-500 font-normal">PTS</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-black/30 px-6 py-8 text-center">
                    <p className="text-white/85 font-semibold mb-2">Clasificación pendiente de actualización</p>
                    <p className="text-white/60 text-sm">
                      El podio aparecerá automáticamente en cuanto se publiquen resultados oficiales de la temporada {homeDataYear}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4 EVENLY SIZED CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 w-full">

            {[
              { title: "CARRERAS", icon: Flag, desc: "Calendario y resultados", path: "/carreras", color: "from-f1-red/20" },
              { title: "PILOTOS", icon: Users, desc: "Perfiles y clasificaciones", path: "/pilotos", color: "from-blue-500/20" },
              { title: "EQUIPOS", icon: Shield, desc: "Análisis de constructores", path: "/equipos", color: "from-green-500/20" },
              { title: "MÉTRICAS", icon: TrendingUp, desc: "Estadísticas avanzadas", path: "/estadisticas", color: "from-amber-500/20" }
            ].map((item, idx) => (
              <Link
                key={item.path}
                to={item.path}
                ref={el => gridCardsRef.current[idx] = el}
                onMouseMove={handleHoverMove} onMouseLeave={handleHoverLeave}
                className="glass rounded-3xl p-8 aspect-square relative overflow-hidden group flex flex-col items-center justify-center text-center cursor-pointer border border-white/5 shadow-2xl"
                style={{ perspective: '1000px' }}
                aria-label={`Abrir ${item.title.toLowerCase()}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${item.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <item.icon className="w-16 h-16 text-white mb-6 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                <h3 className="text-3xl font-racing text-white mb-2 relative z-10 group-hover:text-f1-red transition-colors">{item.title}</h3>
                <p className="text-gray-400 font-sans text-sm tracking-wide relative z-10">{item.desc}</p>
              </Link>
            ))}

          </div>

          {/* FULL WIDTH CENTERED PROGRESS BAR */}
          <div ref={progressRef} className="w-full glass rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-2xl border border-white/5 flex flex-col items-center text-center">
            <h4 className="text-2xl md:text-3xl font-racing text-white mb-8 tracking-widest">
              PROGRESO DE TEMPORADA <span className="text-f1-red">{seasonProgress?.progressPercentage || 0}%</span>
            </h4>
            <div className="w-full max-w-4xl h-6 bg-white/5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-f1-red/50 via-f1-red to-red-500"
                style={{ width: `${seasonProgress?.progressPercentage || 0}%` }}
              >
                <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_1s_linear_infinite]" />
              </div>
            </div>
            <div className="flex justify-between w-full max-w-4xl mt-4 font-mono text-sm tracking-widest font-bold">
              <span className="text-white/40">CARRERA 1</span>
              <span className="text-white/80">{seasonProgress?.completedRaces || 0} / {seasonProgress?.totalRaces || 24} COMPLETADAS</span>
              <span className="text-white/40">FINAL</span>
            </div>
          </div>

        </div>
      </section>

      {/* Symmetrical Footer */}
      <footer className="mt-auto px-4 py-16 relative z-10 w-full overflow-hidden flex justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-f1-red/10 to-transparent pointer-events-none" />
        <a
          href="https://github.com/Laanga/F1DataExplorer"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-full glass border border-white/10 hover:border-f1-red transition-all duration-500 overflow-hidden z-10 shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-f1-red/20 via-transparent to-f1-red/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Github className="w-6 h-6 text-white group-hover:scale-110 transition-transform relative z-10" />
          <span className="font-sans font-bold text-white tracking-widest uppercase text-sm relative z-10">GitHub Repository</span>
        </a>
      </footer>

      <style>{`
         @keyframes scroll-down {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(100%); opacity: 0; }
         }
      `}</style>
    </div>
  );
};

export default Inicio;
