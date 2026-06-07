import { useEffect, useMemo, useState } from 'react';

const clampProgress = (value) => Math.max(0, Math.min(100, Math.round(value)));

const AppStartLoader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const progressText = useMemo(() => String(progress).padStart(3, '0'), [progress]);

  useEffect(() => {
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 450 : 2200;
    const start = performance.now();
    let frameId;
    let finishTimer;
    let exitTimer;

    const tick = (now) => {
      const elapsed = now - start;
      const rawProgress = clampProgress((elapsed / duration) * 100);
      const easedProgress = clampProgress(100 - ((100 - rawProgress) ** 1.45 / (100 ** 0.45)));

      setProgress(easedProgress);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      setProgress(100);
      finishTimer = window.setTimeout(() => {
        setIsLeaving(true);
        exitTimer = window.setTimeout(() => {
          onComplete?.();
        }, reducedMotion ? 90 : 760);
      }, reducedMotion ? 80 : 180);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(finishTimer);
      window.clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`app-start-loader ${isLeaving ? 'is-leaving' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div className="app-start-loader__grid" />
      <div className="app-start-loader__track" />
      <div className="app-start-loader__panel">
        <div className="app-start-loader__number">{progressText}</div>
        <div className="app-start-loader__bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="app-start-loader__segments" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, index) => (
            <span
              key={`start-loader-segment-${index}`}
              className={progress >= (index + 1) * 10 ? 'is-filled' : ''}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppStartLoader;
