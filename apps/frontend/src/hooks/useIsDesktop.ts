import { useEffect, useState } from 'react';

export function useIsDesktop(breakpoint = 768): boolean {
  const query = `(min-width: ${breakpoint}px)`;

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return isDesktop;
}
