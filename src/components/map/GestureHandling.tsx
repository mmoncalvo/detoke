import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

const HINT_MS = 1500;

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);
const isTouchFirst = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * Google Maps style "cooperative gestures": the page keeps scrolling over the map.
 * Desktop: the wheel zooms only with Ctrl or ⌘ (trackpad pinch sends ctrlKey too).
 * Touch: one finger scrolls the page, two fingers pan and zoom.
 */
export function GestureHandling() {
  const map = useMap();
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => {
    const container = map.getContainer();
    const show = (text: string) => {
      setHint(text);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setHint(null), HINT_MS);
    };

    // With dragging off the container gets touch-action: pan-x pan-y, so one finger
    // scrolls the page while Leaflet's pinch handler still pans and zooms with two.
    if (isTouchFirst()) map.dragging.disable();

    // Capture runs before Leaflet's own listener; stopping it lets the page scroll.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return setHint(null);
      e.stopPropagation();
      show(`Usá ${isMac() ? '⌘' : 'Ctrl'} + desplazamiento para acercar o alejar el mapa`);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && !map.dragging.enabled()) show('Usá dos dedos para mover el mapa');
      else setHint(null);
    };

    container.addEventListener('wheel', onWheel, { capture: true, passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      container.removeEventListener('wheel', onWheel, { capture: true });
      container.removeEventListener('touchmove', onTouchMove);
      window.clearTimeout(timer.current);
    };
  }, [map]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-foreground/55 p-6 text-center text-sm font-medium text-background transition-opacity duration-300 ${hint ? 'opacity-100' : 'opacity-0'}`}
    >
      {hint}
    </div>
  );
}
