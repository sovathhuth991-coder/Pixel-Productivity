import React from 'react'
import { useDesignMode, type DesignMode } from '../../context/DesignModeContext'
import { SPRITE_THEME, resolveSpritePalette } from './spriteTheme'

export type PixelEmojiName =
  | 'clipboard'
  | 'board'
  | 'bookmark'
  | 'tomato'
  | 'trophy'
  | 'gear'
  | 'flame'
  | 'target'
  | 'hourglass'
  | 'rocket'
  | 'check_shield'
  | 'skull'
  | 'gem'
  | 'sun'
  | 'calendar'
  | 'star'
  | 'coffee'
  | 'palm'
  | 'bell'
  | 'speaker'
  | 'speaker_muted'
  | 'floppy'
  | 'book'
  | 'warning'
  | 'coin'
  | 'heart'
  | 'lightning'
  | 'chat'
  | 'paperclip'
  | 'paint'

interface PixelEmojiProps {
  name: PixelEmojiName
  size?: number
  className?: string
  animated?: boolean
}

interface EmojiDef {
  size: number
  palette: Record<string, string>
  grid: string[]
  animClass?: string
}

/**
 * The neutral ramp of the sprite palette lives in `spriteTheme.ts` and is
 * shared with the icon library, so a concept drawn in both — the clipboard,
 * the gear, the tomato — is drawn in the same colours wherever it appears.
 */
const EMOJI_THEME = SPRITE_THEME

const EMOJIS: Record<PixelEmojiName, EmojiDef> = {
  clipboard: {
    size: 16,
    palette: {
      K: '$ink',
      T: '$dark',
      t: '$mid',
      S: '$ink',
      G: '#22c55e',
      C: '#06b6d4',
      P: '#a855f7',
      Y: '#f59e0b',
      W: '$hi',
      A: '#38bdf8',
      R: '#f43f5e',
    },
    animClass: 'pixel-anim-bounce',
    grid: [
      '       KA       ',
      '       Kt       ',
      '  KKKKKKKKKKKK  ',
      ' KtttttttttttTK ',
      ' KtSSSSSSSSSSsK ',
      ' KtSGWSSSSSSSSK ',
      ' KtSGCCCCSSSSSK ',
      ' KtSSSSSSSSSSsK ',
      ' KtSGWSSSSSSSSK ',
      ' KtSGPPPPSSSSSK ',
      ' KtSSSSSSSSSSsK ',
      ' KtSYYWSSSSSSsK ',
      ' KtSYYRRRRSSSkK ',
      ' KtSSSSSSSSSSsK ',
      ' KTTTTTKTTTTTTK ',
      '  KKKKKKKKKKKK  ',
    ],
  },

  board: {
    size: 16,
    palette: {
      K: '$ink',
      F: '$dark',
      f: '$mid',
      O: '#f59e0b',
      o: '#fef08a',
      C: '#06b6d4',
      c: '#67e8f9',
      G: '#22c55e',
      g: '#86efac',
      W: '$hi',
      S: '$ink',
      L: '$dark',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      ' KKKKKKKKKKKKKK ',
      'KffffffffffffffK',
      'Kf KKK KKK KKK fK',
      'Kf KOOK KCCK KGGK fK',
      'Kf KSSK KSSK KSSK fK',
      'Kf KoSK KSSK KWgK fK',
      'Kf KoSK KccK KWgK fK',
      'Kf KSSK KccK KSSK fK',
      'Kf KSSK KCcK KWgK fK',
      'Kf KoSK KSSK KWgK fK',
      'Kf KSSK KSSK KSSK fK',
      'Kf KKK KKK KKK fK',
      'KLLLLLLLLLLLLLLK',
      'KffffffffffffffK',
      ' KKKKKKKKKKKKKK ',
      '                ',
    ],
  },

  bookmark: {
    size: 16,
    palette: {
      K: '$ink',
      T: '$dark',
      t: '$mid',
      P: '#a855f7',
      p: '#c084fc',
      C: '#06b6d4',
      c: '#67e8f9',
      W: '$hi',
      Y: '#facc15',
    },
    animClass: 'pixel-anim-wobble',
    grid: [
      '   KYK      KYK ',
      '   KtK      KtK ',
      '  KtTK KKKK KtTK',
      '  KtTK KccK KtTK',
      '  KtTKCPPppCKtTK',
      '  KtTCWWWWWCttTK',
      '  KtTCPWWWPCCtTK',
      '  KtTCPWWWPCCtTK',
      '  KtTCWWWWWCttTK',
      '  KtTKCPPppCKtTK',
      '  KtTK KccK KtTK',
      '  KtTK KKKK KtTK',
      '  KtTTKKKKKKTTtK',
      '   KttttttttttK ',
      '    KKKKKKKKKK  ',
      '                ',
    ],
  },

  tomato: {
    size: 16,
    palette: {
      K: '$ink',
      R: '#e94560',
      r: '#ff7b93',
      C: '#06b6d4',
      c: '#67e8f9',
      W: '$hi',
      T: '$dark',
      t: '$mid',
    },
    animClass: 'pixel-anim-spin',
    grid: [
      '     KKtTtKK    ',
      '    KtCWWCtTK   ',
      '   KtccCCcctTK  ',
      '  KtC RRRR CtTK ',
      ' KtC RrWWrr CtTK',
      'KtC RrWWWWrr CtK',
      'KC  RrWWWWrr  CK',
      'KC  RRrrRRrr  CK',
      'KC  RRrrRRrr  CK',
      'KtC RrWWWWrr CtK',
      ' KtC RrWWrr CtTK',
      '  KtC RRRR CtTK ',
      '   KtccCCcctTK  ',
      '    KtCWWCtTK   ',
      '     KKtTtKK    ',
      '                ',
    ],
  },

  trophy: {
    size: 16,
    palette: {
      K: '$ink',
      Y: '#f59e0b',
      H: '#fef08a',
      D: '#b45309',
      W: '$hi',
      B: '$dark',
      b: '$mid',
    },
    animClass: 'pixel-anim-glint',
    grid: [
      ' KKKKKKKKKKKKKK ',
      'KHHYYYYYYYYYYYDK',
      ' KHHWHYYYYYYDDK ',
      'K KHHHYYYYYDDK K',
      'KK KHYYYYYDDK KK',
      'KK  KYYYYYYK  KK',
      '     KYYYYK     ',
      '      KYYK      ',
      '      KYYK      ',
      '     KHYYDK     ',
      '    KHHYYYDDK   ',
      '   KbbbbbbbbK   ',
      '   KBBBBBBBBK   ',
      '   KKKKKKKKKK   ',
      '                ',
      '                ',
    ],
  },

  gear: {
    size: 16,
    palette: {
      K: '$ink',
      W: '$hi',
      L: '$light',
      S: '$mid',
      D: '$dark',
      d: '$dark',
    },
    animClass: 'pixel-anim-spin',
    grid: [
      '     KKKKKK     ',
      '     KLSSDK     ',
      ' KK  KLSSDK  KK ',
      'KLsKKKLSSDKKKsDK',
      'KLsLLLLSSDDDDsDK',
      'KLsSKKKKKKKKDsDK',
      'KLsSKLddddLKDsDK',
      'KLSSKLddddLKSSDK',
      'KLSSKLddddLKSSDK',
      'KLsSKLddddLKDsDK',
      'KLsSKKKKKKKKDsDK',
      'KLsLLLLSSDDDDsDK',
      'KLsKKKLSSDKKKsDK',
      ' KK  KLSSDK  KK ',
      '     KLSSDK     ',
      '     KKKKKK     ',
    ],
  },

  flame: {
    size: 16,
    palette: {
      K: '$ink',
      R: '#ef4444',
      O: '#f97316',
      Y: '#facc15',
      W: '#fef9c3',
      D: '#991b1b',
    },
    animClass: 'pixel-anim-flame',
    grid: [
      '       KK       ',
      '      KRRK      ',
      '     KRROOK     ',
      '     KROYYOK    ',
      '    KROOYYOOK   ',
      '   KROOYYYYOOK  ',
      '   KROOWYYYYOOK ',
      '  KROOOWWYYYOOK ',
      '  KRROOWWYYROOK ',
      ' KRRROOWYYYYROOK',
      ' KRRRROWYYYYRROK',
      ' KRRRROWYYYYRROK',
      '  KDRRRWWYRROK  ',
      '  KDDRRRRRRROK  ',
      '   KDDDDDDDDK   ',
      '     KKKKKK     ',
    ],
  },

  target: {
    size: 16,
    palette: {
      K: '$ink',
      R: '#ef4444',
      r: '#f87171',
      D: '#991b1b',
      C: '#06b6d4',
      c: '#67e8f9',
      W: '$hi',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '       KK       ',
      '       KcK      ',
      '    KKKCcCKKK   ',
      '   KcCCCCCCsK   ',
      '  KcC      CsK  ',
      ' KcC   KK   CsK ',
      ' KcC  KRrDK  CsK',
      'KKKK KRWWRDKKKKK',
      'KKKK KRWWRDKKKKK',
      ' KcC  KRDDK  CsK',
      ' KcC   KK   CsK ',
      '  KcC      CsK  ',
      '   KcCCCCCCsK   ',
      '    KKKCcCKKK   ',
      '       KcK      ',
      '       KK       ',
    ],
  },

  hourglass: {
    size: 16,
    palette: {
      K: '$ink',
      W: '#854d0e',
      H: '#b45309',
      D: '#713f12',
      B: '#38bdf8',
      b: '#e0f2fe',
      S: '#f59e0b',
      s: '#fef08a',
    },
    animClass: 'pixel-anim-wobble',
    grid: [
      'KKKKKKKKKKKKKKKK',
      'KHHHHHHHHHHHHHDK',
      'KWWWWWWWWWWWWWDK',
      ' KKKbBBBBBBbKKK ',
      '  KbBssssssBbK  ',
      '   KbBssssBbK   ',
      '    KbBSsBbK    ',
      '     KbSSbK     ',
      '     KbSSbK     ',
      '    KbBSSBbK    ',
      '   KbBssssBbK   ',
      '  KbBssssssBbK  ',
      ' KKKbBBBBBBbKKK ',
      'KWWWWWWWWWWWWWDK',
      'KDDDDDDDDDDDDDDK',
      'KKKKKKKKKKKKKKKK',
    ],
  },

  rocket: {
    size: 16,
    palette: {
      R: '#ef4444',
      r: '#dc2626',
      W: '$hi',
      S: '$light',
      O: '#f97316',
      Y: '#facc15',
      B: '#38bdf8',
      b: '#0284c7',
      K: '$ink',
    },
    animClass: 'pixel-anim-bounce',
    grid: [
      '       KK       ',
      '      KRRK      ',
      '     KRRRRK     ',
      '     KWWWWK     ',
      '    KWWBBWWK    ',
      '    KWWbbWWK    ',
      '    KWWWWWWK    ',
      '   KKWWWWWWKK   ',
      '  KRKWWWWWWKRK  ',
      ' KrRKWWWWWWKrRK ',
      'KrrRKSSSSSSKrrRK',
      'KKKKKSSSSSSKKKKK',
      '     KYYYYK     ',
      '     KOYYOK     ',
      '      KYYK      ',
      '       KK       ',
    ],
  },

  check_shield: {
    size: 16,
    palette: {
      G: '#22c55e',
      g: '#16a34a',
      L: '#86efac',
      W: '$hi',
      K: '$ink',
      D: '#14532d',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '   KKKKKKKKKK   ',
      '  KLGGGGGGGGDK  ',
      ' KLGGGGGGGGGGDK ',
      ' KLGGGGGGGGGGWDK',
      'KLGGGGGGGGGGWKKD',
      'KLGGGGGGGGGWWKD ',
      'KLGGWGGGGGGWWKD ',
      'KLGGWWGGGGWWKD  ',
      'KLGgWWWGGWWKGD  ',
      ' KggWWWgWWKgD   ',
      '  KggWWWWKgD    ',
      '   KggWWKgD     ',
      '    KggKgD      ',
      '     KKgD       ',
      '      KD        ',
      '                ',
    ],
  },

  skull: {
    size: 16,
    palette: {
      R: '#ef4444',
      r: '#f87171',
      D: '#991b1b',
      W: '$hi',
      K: '$ink',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '    KKKKKKKK    ',
      '   KrrrrrrrrK   ',
      '  KrrRRRRRRrrK  ',
      ' KrrRRRRRRRRrrK ',
      ' KrrKKRRRRKKrrK ',
      ' KrrKKRRRRKKrrK ',
      ' KrrRRRRRRRRrrK ',
      ' KrrRRDKKDRRrrK ',
      '  KrrRDKKDRrrK  ',
      '   KKRRRRRRKK   ',
      '    KDKDKDKK    ',
      '    KWKWKWKK    ',
      '    KWKWKWKK    ',
      '     KKKKKK     ',
      '                ',
      '                ',
    ],
  },

  gem: {
    size: 16,
    palette: {
      C: '#38bdf8',
      c: '#7dd3fc',
      W: '$hi',
      D: '#0284c7',
      d: '#0369a1',
      K: '#0c4a6e',
    },
    animClass: 'pixel-anim-glint',
    grid: [
      '     KKKKKK     ',
      '   KKWccccWKK   ',
      '  KWWCCCCCCWDK  ',
      ' KWWWCCCCCCCDDK ',
      'KWWWWCCCCCCCDDDK',
      'KKKKKKKKKKKKKKKK',
      ' KWWCCCCCCCDddK ',
      '  KWWCCCCCCCDK  ',
      '   KWWCCCCCDK   ',
      '    KWCCCCDK    ',
      '     KWCCDK     ',
      '      KWCDK     ',
      '       KDK      ',
      '        KK      ',
      '                ',
      '                ',
    ],
  },

  sun: {
    size: 16,
    palette: {
      Y: '#facc15',
      y: '#fef08a',
      O: '#f97316',
      K: '#78350f',
    },
    animClass: 'pixel-anim-spin',
    grid: [
      '       YY       ',
      '  Y    YY    Y  ',
      '   Y  KKKK  Y   ',
      '    KYyyyyYK    ',
      '   KYyyyyyyYK   ',
      '  KYyyyyyyyyYK  ',
      'YYKyyyyyyyyyyKYY',
      'YYKyyyyyyyyyyKYY',
      '  KYyyyyyyyyYK  ',
      '   KYyyyyyyYK   ',
      '    KYyyyyYK    ',
      '   Y  KKKK  Y   ',
      '  Y    YY    Y  ',
      '       YY       ',
      '                ',
      '                ',
    ],
  },

  calendar: {
    size: 16,
    palette: {
      R: '#ef4444',
      r: '#f87171',
      W: '$hi',
      S: '$light',
      D: '$mid',
      K: '$ink',
      C: '#06b6d4',
    },
    animClass: 'pixel-anim-bounce',
    grid: [
      '  KK      KK    ',
      '  KDK    KDK    ',
      ' KrrrrrrrrrrrrK ',
      ' KRRRRRRRRRRRRK ',
      ' KRRRRRRRRRRRRK ',
      ' KWWWWWWWWWWWWK ',
      ' KWCKWDKWDKWDKK ',
      ' KWWWWWWWWWWWWK ',
      ' KWDKWCKWDKWDKK ',
      ' KWWWWWWWWWWWWK ',
      ' KWDKWDKWCKWDKK ',
      ' KWWWWWWWWWWWWK ',
      ' KDDDDDDDDDDDDK ',
      ' KKKKKKKKKKKKKK ',
      '                ',
      '                ',
    ],
  },

  star: {
    size: 16,
    palette: {
      Y: '#facc15',
      y: '#fef08a',
      W: '$hi',
      O: '#f59e0b',
      K: '#78350f',
    },
    animClass: 'pixel-anim-glint',
    grid: [
      '       KK       ',
      '       KY       ',
      '      KYYK      ',
      '      KyyK      ',
      'KKKKKKKyyKKKKKKK',
      ' KyyyyyyyyyyyK  ',
      '  KyyyyWyyyyK   ',
      '   KyyWWWyyK    ',
      '  KyyWWWWyyK    ',
      ' KyyyyWyyyyyyK  ',
      ' KyyKKKKKKyyyK  ',
      ' KyK      KyK   ',
      ' KK        KK   ',
      '                ',
      '                ',
      '                ',
    ],
  },

  coffee: {
    size: 16,
    palette: {
      W: '$hi',
      B: '#78350f',
      b: '#92400e',
      S: '$light',
      K: '$dark',
    },
    animClass: 'pixel-anim-steam',
    grid: [
      '    S   S       ',
      '     S   S      ',
      '    S   S       ',
      '                ',
      ' KKKKKKKKKK     ',
      ' KBBBBBBBBKKKK  ',
      ' KbbbbbbbbK  WK ',
      ' KbbbbbbbbK  WK ',
      ' KbbbbbbbbKKKK  ',
      ' KbbbbbbbbK     ',
      ' KbbbbbbbbK     ',
      '  KbbbbbbK      ',
      '   KKKKKK       ',
      ' KWWWWWWWWWWK   ',
      ' KKKKKKKKKKKK   ',
      '                ',
    ],
  },

  palm: {
    size: 16,
    palette: {
      G: '#22c55e',
      g: '#15803d',
      L: '#86efac',
      B: '#92400e',
      b: '#78350f',
      C: '#ca8a04',
      K: '$dark',
    },
    animClass: 'pixel-anim-wobble',
    grid: [
      '      GGG       ',
      '    GGLGGGG     ',
      '   GgGGGGggG    ',
      '  GGggGGggGG    ',
      '  Gg  KC   gG   ',
      '     KCC        ',
      '      KB        ',
      '     KBB        ',
      '     KBB        ',
      '      KBb       ',
      '      KBb       ',
      '      KBb       ',
      '     KBBb       ',
      '    KBBBBb      ',
      '   KKKKKKKK     ',
      '                ',
    ],
  },

  bell: {
    size: 16,
    palette: {
      Y: '#facc15',
      y: '#fef08a',
      D: '#b45309',
      K: '$dark',
      W: '$hi',
    },
    animClass: 'pixel-anim-ring',
    grid: [
      '       KK       ',
      '      KYYK      ',
      '      KyYK      ',
      '     KyYYYK     ',
      '     KyyyYK     ',
      '    KyyyyYYK    ',
      '    KyyyYYYK    ',
      '   KyyWYYYYYK   ',
      '   KyyWyyyyYYK  ',
      '  KyyyyyyyyYYK  ',
      '  KDDDDDDDDDDK  ',
      ' KKKKKKKKKKKKKK ',
      '      KDD       ',
      '     KYYYK      ',
      '      KKK       ',
      '                ',
    ],
  },

  speaker: {
    size: 16,
    palette: {
      G: '$mid',
      g: '$light',
      W: '$hi',
      C: '#38bdf8',
      K: '$ink',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '       KK       ',
      '      KGK   C   ',
      '    KKKgGK   C  ',
      '   KggKgGK C  C ',
      '   KggKgGK  C  C',
      '   KggKgGK  C  C',
      '   KggKgGK C  C ',
      '    KKKgGK   C  ',
      '      KGK   C   ',
      '       KK       ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },

  speaker_muted: {
    size: 16,
    palette: {
      G: '$mid',
      g: '$light',
      R: '#ef4444',
      K: '$ink',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '       KK   R  R',
      '      KGK    RR ',
      '    KKKgGK   RR ',
      '   KggKgGK  R  R',
      '   KggKgGK      ',
      '   KggKgGK      ',
      '   KggKgGK      ',
      '    KKKgGK      ',
      '      KGK       ',
      '       KK       ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },

  floppy: {
    size: 16,
    palette: {
      B: '#3b82f6',
      b: '#1d4ed8',
      S: '$light',
      W: '$hi',
      R: '#ef4444',
      K: '$ink',
    },
    animClass: 'pixel-anim-bounce',
    grid: [
      ' KKKKKKKKKKKKK  ',
      ' KBBBKSSSSKBBK  ',
      ' KBBBKSSSSKBBK  ',
      ' KBBBKSSSSKBBK  ',
      ' KBBBKSSSSKBBK  ',
      ' KBBBKSSSSKBBK  ',
      ' KBBKKKKKKKBBK  ',
      ' KBBBBBBBBBBBK  ',
      ' KBBKKKKKKKBBK  ',
      ' KBBKWWWWKKBBK  ',
      ' KBBKWWWWKKBBK  ',
      ' KBBKWWWWKKBBK  ',
      ' KBBKWWWWKKBBK  ',
      ' KbbKKKKKKKbbK  ',
      ' KKKKKKKKKKKKK  ',
      '                ',
    ],
  },

  book: {
    size: 16,
    palette: {
      P: '#a855f7',
      p: '#7e22ce',
      W: '$hi',
      G: '#facc15',
      K: '$ink',
    },
    animClass: 'pixel-anim-glint',
    grid: [
      '   KKKKKKKKKK   ',
      '  KPPPPPPPPPPK  ',
      ' KPGGPPGGPPGPK  ',
      ' KPGGPPGGPPGPK  ',
      ' KPPPPPPPPPPPK  ',
      ' KPPWWWWWWPPPK  ',
      ' KPPWKKKKWPPPK  ',
      ' KPPWKKKKWPPPK  ',
      ' KPPWWWWWWPPPK  ',
      ' KPPPPPPPPPPPK  ',
      '  KPPPPPPPPPK   ',
      '  KWWWWWWWWWK   ',
      '  KWWWWWWWWWK   ',
      '   KKKKKKKKK    ',
      '                ',
      '                ',
    ],
  },

  warning: {
    size: 16,
    palette: {
      Y: '#facc15',
      y: '#fef08a',
      O: '#f59e0b',
      K: '$ink',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '       KK       ',
      '      KYYK      ',
      '      KyYK      ',
      '     KyKKYK     ',
      '     KyKKYK     ',
      '    KyyKKYyK    ',
      '    KyyKKYyK    ',
      '   KyyyKKYyyK   ',
      '   KyyyKKYyyK   ',
      '  KyyyyKKYyyyK  ',
      '  Kyyyy  YyyyK  ',
      ' KyyyyyKKYyyyyK ',
      ' KyyyyyKKYyyyyK ',
      'KYYYYYYYYYYYYyyK',
      'KKKKKKKKKKKKKKKK',
      '                ',
    ],
  },

  coin: {
    size: 16,
    palette: {
      G: '#fbbf24',
      Y: '#fef08a',
      D: '#b45309',
      K: '$ink',
    },
    animClass: 'pixel-anim-coin',
    grid: [
      '     KKKKKK     ',
      '   KKGGGGGGKK   ',
      '  KGGYYYYYYGDK  ',
      ' KGGYYGGGGYYGDK ',
      'KGGYYGKKKKGYYGDK',
      'KGGYYGKDDDGYYGDK',
      'KGGYYGKDDDGYYGDK',
      'KGGYYGKKKKGYYGDK',
      'KGGYYGKKKKGYYGDK',
      'KGGYYGKDDDGYYGDK',
      'KGGYYGKDDDGYYGDK',
      ' KGGYYGGGGYYGDK ',
      '  KGDDDDDDDDDK  ',
      '   KKDDDDDDKK   ',
      '     KKKKKK     ',
      '                ',
    ],
  },

  heart: {
    size: 16,
    palette: {
      R: '#ef4444',
      r: '#f87171',
      W: '$hi',
      D: '#991b1b',
      K: '$ink',
    },
    animClass: 'pixel-anim-pulse',
    grid: [
      '                ',
      '  KKKK    KKKK  ',
      ' KrrrrK  KrrrrK ',
      'KrrWrrrKKrrrRrrK',
      'KrWWWrrrrRRRRRRK',
      'KrrWrrrrrRRRRRRK',
      'KrrrrrrrrRRRRRRK',
      ' KrrrrrrRRRRRRK ',
      '  KrrrrRRRRRRK  ',
      '   KrrRRRRRRK   ',
      '    KRRRRRRK    ',
      '     KRRRRK     ',
      '      KRRK      ',
      '       KK       ',
      '                ',
      '                ',
    ],
  },

  lightning: {
    size: 16,
    palette: {
      Y: '#facc15',
      y: '#fef08a',
      W: '$hi',
      D: '#ca8a04',
      K: '#713f12',
    },
    animClass: 'pixel-anim-glint',
    grid: [
      '        KKK     ',
      '       KyYK     ',
      '      KyyYK     ',
      '     KyyyYK     ',
      '    KyyyyYK     ',
      '   KyyyyyYK     ',
      '  KyyyWyyyYKKK  ',
      '  KKKKKyyyyyyK  ',
      '      KyyyyyK   ',
      '     KyyyyyK    ',
      '    KyyyyyK     ',
      '   KyyyyyK      ',
      '  KyyyyyK       ',
      '  KyyyK         ',
      '  KyK           ',
      '  KK            ',
    ],
  },

  chat: {
    size: 16,
    palette: {
      W: '$hi',
      S: '$light',
      B: '#38bdf8',
      K: '$ink',
    },
    animClass: 'pixel-anim-bounce',
    grid: [
      '  KKKKKKKKKKKK  ',
      ' KWWWWWWWWWWWWK ',
      ' KWWWWWWWWWWWWK ',
      ' KWBBWWBBWWBBWK ',
      ' KWWWWWWWWWWWWK ',
      ' KWBBWWBBWWBBWK ',
      ' KWWWWWWWWWWWWK ',
      ' KWWWWWWWWWWWWK ',
      '  KKKKKKKWWWWK  ',
      '         KWWK   ',
      '          KK    ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },

  paperclip: {
    size: 16,
    palette: {
      S: '$mid',
      s: '$light',
      K: '$ink',
    },
    animClass: 'pixel-anim-wobble',
    grid: [
      '      KKKK      ',
      '     KsSSsK     ',
      '    KsSKKsSK    ',
      '   KsSK  KsSK   ',
      '   KsSK   KsSK  ',
      '   KsSK   KsSK  ',
      '   KsSK  KsSK   ',
      '   KsSK KsSK    ',
      '   KsSKKsSK     ',
      '   KsSKsSK      ',
      '    KsSSsK      ',
      '     KKKK       ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },

  paint: {
    size: 16,
    palette: {
      W: '#fef08a',
      w: '#fde047',
      R: '#ef4444',
      B: '#38bdf8',
      G: '#22c55e',
      P: '#a855f7',
      K: '$ink',
      D: '#ca8a04',
    },
    animClass: 'pixel-anim-wobble',
    grid: [
      '     KKKKKK     ',
      '   KKWWWWWWKK   ',
      '  KWWWRWWWBWWK  ',
      ' KWWWRRRWBBBWWK ',
      'KWWWWWRWWWBWWWK ',
      'KWWGWWWWWWWWWWK ',
      'KWGGGWWWWWPWWWK ',
      'KWWGWWWWWPPPWWK ',
      'KWWWWWWWWWPWWDK ',
      ' KWWWWKKWWWWDK  ',
      '  KWWKKKKWWDK   ',
      '   KK    KKK    ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },
}

/**
 * The sprite definitions, exported so the icon library can reuse them.
 *
 * Eight concepts were drawn twice — once here and once in `PixelIcon` — with
 * the same art but different palettes, so the same "gear" looked different
 * in the sidebar than on the Setup screen. The icon library now imports
 * these instead of keeping its own copy.
 */
export const EMOJI_SPRITES = EMOJIS

export default function PixelEmoji({
  name,
  size = 18,
  className = '',
  animated = true,
}: PixelEmojiProps) {
  const { mode, animationsEnabled } = useDesignMode()
  const def = EMOJIS[name] ?? EMOJIS.star
  if (EMOJIS[name] === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[PixelEmoji] Unknown emoji "${String(name)}" — falling back to ⭐`)
  }
  const anim = animated && animationsEnabled && def.animClass ? def.animClass : ''
  const theme = EMOJI_THEME[mode]

  return (
    <span
      className={`inline-flex items-center justify-center select-none shrink-0 ${anim} ${className}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        verticalAlign: 'middle',
      }}
      title={name}
    >
      <svg
        viewBox={`0 0 ${def.size} ${def.size}`}
        width={size}
        height={size}
        className="overflow-visible"
        style={{
          imageRendering: 'pixelated',
          shapeRendering: 'crispEdges',
        }}
      >
        {def.grid.map((row, y) =>
          row.split('').map((char, x) => {
            if (char === ' ' || !def.palette[char]) return null
            const swatch = def.palette[char]
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={swatch.charCodeAt(0) === 36 ? theme[swatch.slice(1)] : swatch}
              />
            )
          })
        )}
      </svg>
    </span>
  )
}
