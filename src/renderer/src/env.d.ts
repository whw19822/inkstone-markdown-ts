import type { InkstoneAPI } from '../../shared/types'

declare global {
  interface Window {
    inkstone: InkstoneAPI
  }
}

export {}
