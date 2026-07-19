import { useEffect, useState } from 'react';

// Media-query hook for collapsing dashboard grids on small screens.
export const useIsNarrow = (maxWidth = 900) => {
  const query = `(max-width: ${maxWidth}px)`;
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsNarrow(e.matches);
    setIsNarrow(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return isNarrow;
};

export default useIsNarrow;
