import { Activity, Flag, Trophy, Zap, Target } from 'lucide-react';
import { formatearFechaHora } from '../../utils/dateUtils';
import { getDriverPhoto } from '../../utils/formatUtils';
import { getTeamColor } from '../../utils/chartColors';

export const getSessionIcon = (type) => {
  switch (type) {
    case 'practice': return <Activity className="w-4 h-4" />;
    case 'qualifying': return <Target className="w-4 h-4" />;
    case 'sprint': return <Zap className="w-4 h-4" />;
    case 'race': return <Trophy className="w-4 h-4" />;
    default: return <Flag className="w-4 h-4" />;
  }
};

export const getSessionName = (type) => {
  switch (type) {
    case 'practice': return 'Entrenamientos Libres';
    case 'qualifying': return 'Clasificación';
    case 'sprint': return 'Sprint';
    case 'race': return 'Carrera';
    default: return 'Sesión';
  }
};

const getResultTimeOrGap = ({ result, position, sessionInfo, sessionType }) => {
  const typeText = String((sessionInfo.session_name || sessionInfo.session_type || sessionType || '')).toLowerCase();
  const isRaceLike = /race|sprint/.test(typeText);
  const isPractice = /(practice|fp1|fp2|fp3|free practice)/.test(typeText);
  const gapOrInterval = result.gap_to_leader || result.interval;
  const lapOrTime = result.time || result.best_lap_time || result.duration;
  const statusCandidates = [result.status, result.finish_status, result.classification, result.status_text, result.result];
  const statusText = statusCandidates.find(Boolean);
  const normalizedStatus = statusText ? String(statusText).toUpperCase() : '';
  const positionText = String(result.position_text || '').toUpperCase();

  if (normalizedStatus.includes('DNF') || normalizedStatus.includes('RETIRED') || normalizedStatus === 'R' || positionText.includes('DNF') || positionText === 'R' || positionText.includes('RET')) return 'DNF';
  if (normalizedStatus.includes('DNS') || positionText.includes('DNS')) return 'DNS · No salió';
  if (normalizedStatus.includes('DSQ') || normalizedStatus.includes('DQ') || normalizedStatus.includes('DISQUALIFIED') || positionText.includes('DSQ')) return 'DSQ · Descalificado';
  if (normalizedStatus.includes('NC') || normalizedStatus.includes('NOT CLASSIFIED') || positionText.includes('NC')) return 'NC · No clasificado';
  if (isPractice) return '—';

  if (isRaceLike) {
    if (position === 1) return '-';
    if (gapOrInterval) return gapOrInterval;
    if (lapOrTime) return lapOrTime;
    return 'DNF';
  }

  return lapOrTime || '—';
};

const EmptySessionState = ({ sessionType }) => (
  <div className="text-center py-8">
    <Flag className="w-12 h-12 text-white/40 mx-auto mb-3" />
    <p className="text-white/60">
      No hay sesiones de {getSessionName(sessionType).toLowerCase()} disponibles
    </p>
  </div>
);

const RaceSessionResults = ({ sessionType, categorizedSessions, meetingData, loadingMeeting }) => {
  const sessions = categorizedSessions[sessionType] || [];

  if (sessions.length === 0) {
    return <EmptySessionState sessionType={sessionType} />;
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const sessionResults = meetingData?.sessions?.[session.session_key]?.results || [];
        const sessionInfo = meetingData?.sessions?.[session.session_key]?.session_info || session;
        const typeTextForSession = String((sessionInfo.session_name || sessionInfo.session_type || sessionType || '')).toLowerCase();
        const showTimeColumn = /race|sprint/.test(typeTextForSession);

        return (
          <div key={session.session_key} className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-racing italic text-xl text-white flex items-center space-x-2">
                {getSessionIcon(sessionType)}
                <span>{sessionInfo.session_name || getSessionName(sessionType)}</span>
              </h4>
              <span className="data-label">
                {formatearFechaHora(sessionInfo.date_start)}
              </span>
            </div>

            {sessionResults.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
                  <div className="col-span-2 data-label text-white/80">Pos / Nº</div>
                  <div className="col-span-4 data-label text-white/80">Piloto</div>
                  <div className={`${showTimeColumn ? 'col-span-4' : 'col-span-6'} data-label text-white/80`}>Equipo</div>
                  {showTimeColumn && (
                    <div className="col-span-2 data-label text-white/80 text-right">Tiempo / Gap</div>
                  )}
                </div>

                {sessionResults.map((result, index) => {
                  const position = result.position || index + 1;
                  const teamName = result.driver_info?.team_name || 'Equipo no disponible';
                  const teamColor = getTeamColor(teamName);
                  const timeOrGap = getResultTimeOrGap({ result, position, sessionInfo, sessionType });
                  const driverName = result.driver_info?.full_name || result.driver_info?.broadcast_name || `Piloto #${result.driver_number}`;

                  return (
                    <div
                      key={result.driver_number || index}
                      className="grid grid-cols-12 gap-3 items-center bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                      style={{ borderLeft: `4px solid ${teamColor}` }}
                    >
                      <div className="col-span-2 flex items-center space-x-3 px-4 py-3">
                        <div
                          className={`relative w-10 h-10 flex items-center justify-center text-sm font-mono font-extrabold shadow-lg border ${position === 1
                            ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black border-yellow-200/50 shadow-yellow-400/30'
                            : position === 2
                              ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-slate-500 text-black border-gray-200/50 shadow-gray-400/30'
                              : position === 3
                                ? 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white border-amber-300/50 shadow-amber-500/30'
                                : 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white border-slate-400/30 shadow-slate-600/20'
                            }`}
                        >
                          {position}
                        </div>
                        <span className="text-white/80 text-sm">#{result.driver_number || '?'}</span>
                      </div>

                      <div className="col-span-4 flex items-center space-x-3 px-2 py-2">
                        <div className="relative">
                          <img
                            src={getDriverPhoto(result.driver_info) || '/drivers/default.png'}
                            alt={driverName}
                            className="w-9 h-9 object-cover border-2 border-white/20"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                              event.currentTarget.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          <div
                            className="w-9 h-9 bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-xs border-2 border-white/20"
                            style={{ display: 'none' }}
                          >
                            {result.driver_number || '?'}
                          </div>
                        </div>
                        <p className="text-white font-semibold text-base truncate">{driverName}</p>
                      </div>

                      <div className={`${showTimeColumn ? 'col-span-4' : 'col-span-6'} px-2 py-2`}>
                        <p className="text-white/80 text-base truncate">{teamName}</p>
                      </div>

                      {showTimeColumn && (
                        <div className="col-span-2 px-4 py-3 text-right">
                          <p className="data-value text-base">{timeOrGap}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : loadingMeeting ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto" />
                <p className="text-white/60 mt-2 text-sm">Cargando resultados…</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <Flag className="w-6 h-6 text-white/40 mx-auto mb-2" />
                <p className="text-white/60 text-sm">
                  No hay resultados disponibles para esta sesión
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RaceSessionResults;
