import React from 'react'
import { useDesignMode } from '../../context/DesignModeContext'
import { EMOJI_SPRITES } from './PixelEmoji'
import { resolveSpritePalette } from './spriteTheme'

export type PixelIconName =
  | 'gamepad'
  | 'clipboard'
  | 'tasks'
  | 'gear'
  | 'settings'
  | 'tomato'
  | 'focus'
  | 'chart'
  | 'total'
  | 'check'
  | 'completed'
  | 'hourglass'
  | 'pending'
  | 'target'
  | 'progress'
  | 'flame'
  | 'streak'
  | 'search'
  | 'magnifier'
  | 'scroll'
  | 'activity'
  | 'folder'
  | 'category'
  | 'plus'
  | 'speaker'
  | 'speaker-muted'
  | 'trash'
  | 'pencil'
  | 'mailbox'
  | 'floppy'
  | 'bell'
  | 'trophy'
  | 'board'
  | 'kanban'
  | 'bookmark'
  | 'externalLink'
  | 'menu'

interface IconDefinition {
  palette: Record<string, string>
  grid: string[]
}

const ICONS: Record<string, IconDefinition> = {
  // ─── Shared with the emoji library ───────────────────────────────────
  floppy: EMOJI_SPRITES.floppy,
  bell: EMOJI_SPRITES.bell,
  clipboard: EMOJI_SPRITES.clipboard,
  // These eight were drawn twice — once here and once in PixelEmoji — with
  // the same art but different palettes, so the same "gear" looked different
  // in the sidebar than on the Setup screen. One definition, one palette.
  board: EMOJI_SPRITES.board,
  bookmark: EMOJI_SPRITES.bookmark,
  tomato: EMOJI_SPRITES.tomato,
  gear: EMOJI_SPRITES.gear,
  flame: EMOJI_SPRITES.flame,
  target: EMOJI_SPRITES.target,
  hourglass: EMOJI_SPRITES.hourglass,
  trophy: EMOJI_SPRITES.trophy,

  gamepad: {
    palette: {
      K: '$ink',
      S: '#3a4b68',
      L: '#627d9e',
      D: '#1a1e29',
      R: '#e94560',
      Y: '#f7b731',
      C: '#4ecdc4',
      W: '#ffffff',
    },
    grid: [
      '                ',
      '   KKKKKKKKKK   ',
      '  KLLLLLLLLLLK  ',
      ' KLLSSSSSSSSSSK ',
      'KLSSDSSSSSSRRSLK',
      'KLDDDDLSCCSRRRLK',
      'KLSSDLSCCSYYYSLK',
      'KLLSSLLSSSSYYSLK',
      'KSSSSSSSSSSSSSSK',
      'KSSSSSKKKKSSSSSK',
      'KSSSSK    KSSSSK',
      ' KSSK      KSSK ',
      '  KK        KK  ',
      '                ',
      '                ',
      '                ',
    ],
  },




  chart: {
    palette: {
      K: '$ink',
      A: '#334155',
      a: '#64748b',
      C: '#06b6d4',
      c: '#67e8f9',
      Y: '#f59e0b',
      y: '#fef08a',
      R: '#f43f5e',
      r: '#fda4af',
      G: '#22c55e',
      g: '#86efac',
    },
    grid: [
      '                ',
      ' Ka          gK ',
      ' Ka         KgGK',
      ' Ka   yK    KgGK',
      ' Ka  KyYK   KgGK',
      ' Ka  KyYK rKKgGK',
      ' Ka  KyYKKrRKGgK',
      ' KcK KyYKKrRKGgK',
      'KcCkKyYKKrRKGgK',
      'KcCkKyYKKrRKGgK',
      'KcCkKyYKKrRKGgK',
      'KcCkKyYKKrRKGgK',
      'KcCkKyYKKrRKGgK',
      'KaaaaaaaaaaaaaaK',
      ' KKKKKKKKKKKKKK ',
      '                ',
    ],
  },

  check: {
    palette: {
      K: '#052e16',
      G: '#22c55e',
      L: '#86efac',
      W: '#ffffff',
      D: '#15803d',
    },
    grid: [
      '                ',
      '             WW ',
      '            WLLK',
      '           WLLGK',
      '          WLLGGK',
      '         WLLGGDK',
      '   WW   WLLGGDK ',
      '  WLLK WLLGGDK  ',
      ' WLLGGKWLLGGDK  ',
      '  WLLGGLLGGDK   ',
      '   WLLGGGGDK    ',
      '    WLLGGDK     ',
      '     WGGDK      ',
      '      KKK       ',
      '                ',
      '                ',
    ],
  },





  search: {
    palette: {
      K: '$ink',
      S: '#64748b',
      L: '#cbd5e1',
      C: '#4ecdc4',
      W: '#ffffff',
      B: '#b87333',
      H: '#f39c12',
      G: '#94a3b8',
    },
    grid: [
      '   KKKKKK       ',
      '  KLLLLLLK      ',
      ' KLLWWWWLLK     ',
      'KLWWCCCCWWLK    ',
      'KLWCCCCCCCSK    ',
      'KLWCCCCCCCSSK   ',
      'KLWCCCCCCCSKK   ',
      'KLLCCCCCCCSSK   ',
      ' KSSSSSSSSSKGK  ',
      '  KKKKKKKKKKHBK ',
      '          KHHBK ',
      '           KHHBK',
      '            KHHB',
      '             KHB',
      '              KK',
      '                ',
    ],
  },

  scroll: {
    palette: {
      K: '$ink',
      P: '#f8fafc',
      Y: '#f5cd79',
      R: '#e94560',
      T: '#475569',
      S: '#cbd5e1',
    },
    grid: [
      '    KKKKKKKK    ',
      '   KYYYYYYYYK   ',
      '  KYPPPPPPPPYK  ',
      ' KYPTTTTTTTTPYK ',
      ' KYPPPPPPPPPPYK ',
      ' KYPTTTTTTTPPYK ',
      ' KYPPPPPPPPPPYK ',
      ' KYPTTTTTTTTPYK ',
      ' KYPPPPPRRPPPYK ',
      ' KYPPPPPRRRPPYK ',
      ' KYPPPPPRRRPPYK ',
      ' KYPPPPPPPRPPYK ',
      '  KYPPPPPPPPYK  ',
      '   KYYYYYYYYK   ',
      '    KKKKKKKK    ',
      '                ',
    ],
  },

  folder: {
    palette: {
      K: '$ink',
      C: '#4ecdc4',
      L: '#99f6e4',
      D: '#155e75',
      W: '#ffffff',
    },
    grid: [
      '                ',
      '  KKKKK         ',
      '  KLLLK         ',
      '  KLLLLKKKKKKK  ',
      ' KDDDDDDDDDDDDK ',
      ' KDWWWWWWWWWWDK ',
      'KKWWWWWWWWWWWWKK',
      'KLLLLLLLLLLLLLLK',
      'KLCLLLLLLLLLLLLK',
      'KLCCCCCCCCCCCCLK',
      'KLCCCCCCCCCCCCLK',
      'KLCCCCCCCCCCCCLK',
      'KLCCCCCCCCCCCCLK',
      'KCCCCCCCCCCCCCDK',
      ' KDDDDDDDDDDDDK ',
      '  KKKKKKKKKKKK  ',
    ],
  },

  plus: {
    palette: {
      K: '$ink',
      W: '#ffffff',
      T: '#4ecdc4',
      H: '#99f6e4',
    },
    grid: [
      '                ',
      '                ',
      '      KKKK      ',
      '      KWWK      ',
      '      KWWK      ',
      '      KWWK      ',
      '  KKKKKWWKKKKK  ',
      '  KWWWWWWWWWWK  ',
      '  KWWWWWWWWWWK  ',
      '  KKKKKWWKKKKK  ',
      '      KWWK      ',
      '      KWWK      ',
      '      KWWK      ',
      '      KKKK      ',
      '                ',
      '                ',
    ],
  },

  speaker: {
    palette: {
      K: '$ink',
      S: '#475569',
      L: '#94a3b8',
      C: '#4ecdc4',
      W: '#ffffff',
    },
    grid: [
      '                ',
      '          KK    ',
      '        KKCLK   ',
      '      KKLLCCLK  ',
      '    KKLLLLCCLK  ',
      '  KKLLLLLLCCLK  ',
      ' KKSSLLLLLCLK   ',
      ' KSSSSLLLLK     ',
      ' KSSSSLLLLK     ',
      ' KKSSLLLLLCLK   ',
      '  KKLLLLLLCCLK  ',
      '    KKLLLLCCLK  ',
      '      KKLLCCLK  ',
      '        KKCLK   ',
      '          KK    ',
      '                ',
    ],
  },

  'speaker-muted': {
    palette: {
      K: '$ink',
      S: '#475569',
      L: '#94a3b8',
      R: '#e94560',
      W: '#ffffff',
    },
    grid: [
      ' R              ',
      '  RR      KK    ',
      '   RR   KKLLK   ',
      '    RRKKLLLLLK  ',
      '    KKRRLLLLLK  ',
      '  KKLLLRRLLLKK  ',
      ' KKSSLLLRRLK    ',
      ' KSSSSLLLRRK    ',
      ' KSSSSLLLLRKK   ',
      ' KKSSLLLLLLRRK  ',
      '  KKLLLLLLLKRRK ',
      '    KKLLLLLK RR ',
      '      KKLLK   RR',
      '        KK     R',
      '                ',
      '                ',
    ],
  },

  trash: {
    palette: {
      K: '$ink',
      R: '#e94560',
      S: '#64748b',
      L: '#cbd5e1',
      D: '#334155',
    },
    grid: [
      '                ',
      '      KKKK      ',
      '      KRRK      ',
      '  KKKKKKKKKKKK  ',
      '  KRRRRRRRRRRK  ',
      '   KKKKKKKKKK   ',
      '   KLLLLLLLLK   ',
      '   KLSKDSKDSL   ',
      '   KLSKDSKDSL   ',
      '   KLSKDSKDSL   ',
      '   KLSKDSKDSL   ',
      '   KLSKDSKDSL   ',
      '   KLLLLLLLLK   ',
      '    KKKKKKKK    ',
      '                ',
      '                ',
    ],
  },

  pencil: {
    palette: {
      K: '$ink',
      P: '#f43f5e',
      M: '#cbd5e1',
      Y: '#f59e0b',
      H: '#fde68a',
      W: '#fed7aa',
      L: '#1e293b',
    },
    grid: [
      '             KK ',
      '            KPPK',
      '           KPPPK',
      '          KMMMK ',
      '         KYYYK  ',
      '        KHYYK   ',
      '       KHYYK    ',
      '      KHYYK     ',
      '     KHYYK      ',
      '    KHYYK       ',
      '   KWWYK        ',
      '  KWWLK         ',
      ' KLLK           ',
      ' KK             ',
      '                ',
      '                ',
    ],
  },

  mailbox: {
    palette: {
      K: '$ink',
      B: '#0284c7',
      L: '#38bdf8',
      R: '#e94560',
      W: '#ffffff',
      P: '#475569',
      D: '$ink',
    },
    grid: [
      '        KKR     ',
      '        KR      ',
      '   KKKKKKR      ',
      '  KLLLLLLRR     ',
      ' KLLLLLLLLK     ',
      ' KLDWWWWDLK     ',
      ' KLDDWWDDLK     ',
      ' KLDDDDDDLK     ',
      '  KKBBBBKK      ',
      '    KPPK        ',
      '    KPPK        ',
      '    KPPK        ',
      '    KPPK        ',
      '    KPPK        ',
      '   KKKKKK       ',
      '                ',
    ],
  },





  externalLink: {
    palette: {
      K: '$ink',
      W: '#ffffff',
      B: '#64748b',
      G: '#2ed573',
    },
    grid: [
      '   KKKKKKKKKK   ',
      '  KWWWWWWWWWWK  ',
      ' KWWWGCCCCCCCCK ',
      'KWWWGC CCC CCCCK',
      'KWWWGC       CK',
      'KWWWGC  BBB BCCK',
      'KWWWGC BBBB CCCK',
      'KWWWGC BBBB CCCK',
      'KWWWGC CCCCC CCCK',
      ' KWWWGCCCCCCCCK ',
      '  KWWWWWWWWWWK  ',
      '   KKKKKKKKKK   ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },
  menu: {
    palette: {
      K: '$ink',
      W: '#ffffff',
    },
    grid: [
      '                ',
      '                ',
      '                ',
      '  KKKKKKKKKKKK  ',
      '                ',
      '                ',
      '  KKKKKKKKKKKK  ',
      '                ',
      '                ',
      '  KKKKKKKKKKKK  ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
    ],
  },
}

// Aliases
ICONS.tasks = ICONS.clipboard
ICONS.settings = ICONS.gear
ICONS.focus = ICONS.tomato
ICONS.total = ICONS.chart
ICONS.completed = ICONS.check
ICONS.pending = ICONS.hourglass
ICONS.progress = ICONS.target
ICONS.streak = ICONS.flame
ICONS.magnifier = ICONS.search
ICONS.activity = ICONS.scroll
ICONS.category = ICONS.folder
ICONS.kanban = ICONS.board

export interface PixelIconProps extends React.SVGProps<SVGSVGElement> {
  name: PixelIconName
  size?: number | string
  className?: string
}

export default function PixelIcon({
  name,
  size = 16,
  className = '',
  style,
  ...props
}: PixelIconProps) {
  const { mode } = useDesignMode()
  const icon = ICONS[name] || ICONS.clipboard
  // Theme slots (`$ink`, `$dark`, …) resolve against the active skin, so a
  // shared sprite looks the same here as it does in the emoji library.
  const palette = resolveSpritePalette(icon.palette, mode)

  // Pre-process grid rows into horizontal rect runs for optimal SVG performance and rendering
  const rects: Array<{ x: number; y: number; width: number; fill: string; key: string }> = []

  icon.grid.forEach((row, y) => {
    let startX = -1
    let currentColor = ''

    for (let x = 0; x <= row.length; x++) {
      const char = x < row.length ? row[x] : ' '
      const color = char !== ' ' ? palette[char] : ''

      if (color === currentColor && color !== '') {
        // continue run
        continue
      }

      // flush previous run
      if (currentColor !== '' && startX !== -1) {
        rects.push({
          x: startX,
          y,
          width: x - startX,
          fill: currentColor,
          key: `${startX}-${y}`,
        })
      }

      // start new run
      if (color !== '') {
        startX = x
        currentColor = color
      } else {
        startX = -1
        currentColor = ''
      }
    }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      shapeRendering="crispEdges"
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {rects.map(rect => (
        <rect
          key={rect.key}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  )
}
