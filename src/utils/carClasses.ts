// Shared car class utilities — used by LiveTimingView, MapView, and others

/** CSS border classes for LiveTimingView table rows */
export const CLASS_BORDER_STYLES: Record<string, string> = {
    'hypercar': 'border-l-4 border-l-red-600',
    'lmp2': 'border-l-4 border-l-blue-600',
    'gt3': 'border-l-4 border-l-orange-500',
    'lmgt3': 'border-l-4 border-l-orange-500',
    'default': 'border-l-4 border-l-slate-500'
};

/** Hex colors for MapView vehicle dots */
export const CLASS_HEX_COLORS: Record<string, string> = {
    'hypercar': '#ff3333',
    'lmp3': '#b133ff',
    'lmp2': '#3399ff',
    'gt3': '#ff9933',
    'default': '#cccccc'
};

/** Detect class key from a raw class string (e.g. "LMGT3", "Hypercar", "LMDh") */
export const getClassKey = (rawClass: string): string => {
    const c = (rawClass || "").toLowerCase();
    if (c.includes('hyper') || c.includes('lmh') || c.includes('lmdh')) return 'hypercar';
    if (c.includes('lmp3')) return 'lmp3';
    if (c.includes('lmp2')) return 'lmp2';
    if (c.includes('gt3')) return 'gt3';
    return 'default';
};

export const getClassBorderStyle = (rawClass: string): string => {
    return CLASS_BORDER_STYLES[getClassKey(rawClass)] || CLASS_BORDER_STYLES['default'];
};

export const getClassHexColor = (rawClass: string): string => {
    return CLASS_HEX_COLORS[getClassKey(rawClass)] || CLASS_HEX_COLORS['default'];
};

/** Detect if a car category uses virtual energy (hybrid) */
export const isHybridCategory = (category: string): boolean => {
    const c = (category || "").toLowerCase();
    return c.includes('hyper') || c.includes('lmh') || c.includes('lmdh') || c.includes('gt3');
};
