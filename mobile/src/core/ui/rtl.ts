/**
 * Physical-edge helpers. AppText freezes direction to LTR on the Text node so
 * these map 1:1 to the screen (right = Arabic start). Use for TextInput too.
 */
export function getAlignEnd(): 'left' | 'right' {
  return 'right';
}

export function getAlignStart(): 'left' | 'right' {
  return 'left';
}

/** @deprecated use getAlignEnd() */
export const alignEnd: 'left' | 'right' = 'right';
/** @deprecated use getAlignStart() */
export const alignStart: 'left' | 'right' = 'left';
