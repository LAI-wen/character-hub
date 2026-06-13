// ============================================================================
// OCTOOL data model — ported 1:1 from the original single-file DC.
// ============================================================================

export type FieldType =
  | 'text'
  | 'longtext'
  | 'tags'
  | 'check'
  | 'avoid'
  | 'attr'
  | 'object'

export interface Field {
  id: string
  label: string
  type: FieldType
  value: string
}

export type SectionGroup = 'text' | 'image'

export interface Section {
  id: string
  title: string
  group: SectionGroup
  fields: Field[]
}

export type AnnotationKind = 'pin' | 'rect'

export interface Annotation {
  id: string
  kind: AnnotationKind
  x: number
  y: number
  w?: number
  h?: number
  label: string
  note: string
}

export interface AlbumImage {
  id: string
  url: string
  caption: string
  annotations: Annotation[]
}

export type AlbumKind = 'gallery' | 'ref'

export interface Album {
  id: string
  name: string
  kind: AlbumKind
  linkRef?: string
  images: AlbumImage[]
}

export interface Swatch {
  id: string
  label: string
  hex: string
}

export type BlockType =
  | 'heading'
  | 'tagline'
  | 'avatar'
  | 'cover'
  | 'section'
  | 'palette'
  | 'album'
  | 'badges'
  | 'popup'
  | 'text'
  | 'marquee'
  | 'button'
  | 'columns'
  | 'divider'
  | 'spacer'
  | 'pagebreak'
  | 'nav'

export interface BlockStyle {
  align?: 'left' | 'center' | 'right'
  padding?: number
  opacity?: number
  radius?: number
  bgColor?: string
  custom?: boolean
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  [k: string]: unknown
}

export interface Tag {
  id: string
  label: string
  color: string
}

export interface Block {
  id: string
  type: BlockType
  style?: BlockStyle
  // content references
  sourceId?: string
  // visual sizing
  size?: 'sm' | 'md' | 'lg'
  // text-like
  text?: string
  title?: string
  body?: string
  popupImg?: string
  trigger?: 'button' | 'thumb'
  hideTitle?: boolean
  titleOverride?: string
  speed?: 'slow' | 'normal' | 'fast'
  // badges
  tags?: Tag[]
  tagStyle?: 'solid' | 'outline'
  // album
  mode?: 'grid' | 'carousel'
  ratio?: 'square' | 'portrait' | 'landscape'
  cols?: number
  // palette
  pvar?: 'dots' | 'swatch'
  // section variant
  variant?: 'plain' | 'cards'
  // columns
  widths?: number[]
  valign?: 'start' | 'center' | 'end'
  children?: Block[][]
}

export interface Design {
  bg?: string
  bgImage?: string
  bgImageTablet?: string
  bgImagePhone?: string
  bgRepeat?: string
  bgSize?: string
  bgAttach?: string
  maskBright?: number
  maskBlur?: number
  maskSat?: number
  primary?: string
  font?: string
  fontImport?: string
  align?: 'left' | 'center' | 'right'
  width?: 'narrow' | 'normal' | 'wide'
  library?: string[]
  pageFit?: string
  autoNav?: boolean
}

export interface Template {
  id: string
  name: string
  design: Design
  blocks: Block[]
}

export interface Character {
  name: string
  nickname: string
  tagline: string
  avatarUrl: string
  mainVisualUrl: string
  palette: Swatch[]
  sections: Section[]
  albums: Album[]
  templates: Template[]
}

// ----------------------------------------------------------------------------
// App-level UI state that is persisted alongside the character.
// ----------------------------------------------------------------------------
export type ViewKey = 'form' | 'design' | 'help'
export type DesignMode = 'edit' | 'preview'
export type ThemeKey = 'cream' | 'cocoa' | 'mist'
export type FormTab = 'basic' | 'image' | 'text' | 'gallery'
export type AnnotateMode = 'list' | 'tooltip'
export type DeviceKey = 'desktop' | 'tablet' | 'phone'

export interface Visibility {
  sections: Record<string, boolean>
  palette: boolean
  albums: boolean
}

export interface PersistedState {
  view: ViewKey
  designMode: DesignMode
  character: Character
  template: string
  annotateMode: AnnotateMode
  theme: ThemeKey
  visibility: Visibility
  activeTpl: string | null
  device: DeviceKey
}
