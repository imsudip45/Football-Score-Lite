// Graphics customization types for PixiJS broadcast graphics

export type FillType = "solid" | "gradient" | "pattern"

export interface GradientStop {
  color: string
  position: number // 0-1
}

export interface GradientConfig {
  type: "linear" | "radial"
  angle: number // 0-360 degrees
  stops: GradientStop[]
}

export interface PatternConfig {
  url: string
  scale: number
  opacity: number
}

export interface FillConfig {
  type: FillType
  color: string // For solid
  gradient?: GradientConfig
  pattern?: PatternConfig
}

export interface Position {
  x: number
  y: number
  anchor:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
}

export interface FontConfig {
  family: string
  size: number
  weight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"
  style: "normal" | "italic"
  color: string
  letterSpacing: number
  lineHeight: number
}

export type AnimationType =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "scale"
  | "scale-bounce"
  | "wipe-left"
  | "wipe-right"
  | "blur"
  | "flip"

export interface AnimationConfig {
  in: AnimationType
  out: AnimationType
  duration: number // milliseconds
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce"
  delay: number
}

export interface ShadowConfig {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface StrokeConfig {
  enabled: boolean
  color: string
  width: number
}

export interface GraphicElementStyle {
  id: string
  name: string
  fill: FillConfig
  position: Position
  width: number
  height: number
  cornerRadius: number
  opacity: number
  shadow: ShadowConfig
  stroke: StrokeConfig
}

export interface TextElementStyle extends GraphicElementStyle {
  font: FontConfig
  textShadow: ShadowConfig
}

export interface ScoreBugStyle {
  id: string
  name: string
  background: GraphicElementStyle
  homeTeamBg: GraphicElementStyle
  awayTeamBg: GraphicElementStyle
  scoreBg: GraphicElementStyle
  timerBg: GraphicElementStyle
  teamNameFont: FontConfig
  scoreFont: FontConfig
  timerFont: FontConfig
  animation: AnimationConfig
  position: Position
}

export interface LowerThirdStyle {
  id: string
  name: string
  background: GraphicElementStyle
  titleBar: GraphicElementStyle
  titleFont: FontConfig
  subtitleFont: FontConfig
  logoPosition: Position
  animation: AnimationConfig
  position: Position
}

export interface TickerStyle {
  id: string
  name: string
  background: GraphicElementStyle
  primaryFont: FontConfig
  secondaryFont: FontConfig
  scrollSpeed: number
  separatorIcon: string
  animation: AnimationConfig
  position: Position
}

export interface BreakingBannerStyle {
  id: string
  name: string
  background: GraphicElementStyle
  labelBg: GraphicElementStyle
  labelFont: FontConfig
  textFont: FontConfig
  flashEnabled: boolean
  flashColor: string
  animation: AnimationConfig
  position: Position
}

// Goal Celebration Graphic
export interface GoalGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  playerNameFont: FontConfig
  goalTimeFont: FontConfig
  teamBadgePosition: Position
  animation: AnimationConfig
  position: Position
}

// Card (Yellow/Red) Graphic
export interface CardGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  cardIcon: GraphicElementStyle
  playerNameFont: FontConfig
  cardTimeFont: FontConfig
  animation: AnimationConfig
  position: Position
}

// Substitution Graphic
export interface SubstitutionGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  playerInBg: GraphicElementStyle
  playerOutBg: GraphicElementStyle
  playerNameFont: FontConfig
  numberFont: FontConfig
  animation: AnimationConfig
  position: Position
}

// VS/Pre-match Graphic
export interface VSGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  homeTeamBg: GraphicElementStyle
  awayTeamBg: GraphicElementStyle
  vsText: FontConfig
  teamNameFont: FontConfig
  matchInfoFont: FontConfig
  animation: AnimationConfig
  position: Position
}

// Lineup/Playing 11 Graphic
export interface LineupGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  headerBg: GraphicElementStyle
  playerRowBg: GraphicElementStyle
  headerFont: FontConfig
  playerNameFont: FontConfig
  numberFont: FontConfig
  animation: AnimationConfig
  position: Position
}

// Match Officials Graphic
export interface OfficialsGraphicStyle {
  id: string
  name: string
  background: GraphicElementStyle
  headerBg: GraphicElementStyle
  officialRowBg: GraphicElementStyle
  headerFont: FontConfig
  roleFont: FontConfig
  nameFont: FontConfig
  animation: AnimationConfig
  position: Position
}

// Nameplate/Player Info Graphic
export interface NameplateStyle {
  id: string
  name: string
  background: GraphicElementStyle
  accentBar: GraphicElementStyle
  playerNameFont: FontConfig
  positionFont: FontConfig
  numberFont: FontConfig
  animation: AnimationConfig
  position: Position
}

export interface GraphicsPreset {
  id: string
  name: string
  description: string
  scoreBug: ScoreBugStyle
  lowerThird: LowerThirdStyle
  ticker: TickerStyle
  breakingBanner: BreakingBannerStyle
  goal?: GoalGraphicStyle
  card?: CardGraphicStyle
  substitution?: SubstitutionGraphicStyle
  vsGraphic?: VSGraphicStyle
  lineup?: LineupGraphicStyle
  officials?: OfficialsGraphicStyle
  nameplate?: NameplateStyle
  createdAt: Date
  updatedAt: Date
}

// System fonts detection
export const COMMON_SYSTEM_FONTS = [
  "Arial",
  "Arial Black",
  "Helvetica",
  "Helvetica Neue",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Palatino",
  "Bookman",
  "Comic Sans MS",
  "Impact",
  "Lucida Sans Unicode",
  "Lucida Console",
  "Courier New",
  "Monaco",
  "Bradley Hand",
  "Brush Script MT",
  "SF Pro Display",
  "SF Pro Text",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Poppins",
  "Nunito",
  "Ubuntu",
  "Segoe UI",
  "system-ui",
]

// Default styles
export const DEFAULT_FILL: FillConfig = {
  type: "solid",
  color: "#14b8a6",
  gradient: {
    type: "linear",
    angle: 90,
    stops: [
      { color: "#14b8a6", position: 0 },
      { color: "#0d9488", position: 1 },
    ],
  },
}

export const DEFAULT_ANIMATION: AnimationConfig = {
  in: "slide-left",
  out: "slide-right",
  duration: 300,
  easing: "ease-out",
  delay: 0,
}

export const DEFAULT_FONT: FontConfig = {
  family: "Inter",
  size: 24,
  weight: "bold",
  style: "normal",
  color: "#ffffff",
  letterSpacing: 0,
  lineHeight: 1.2,
}

export const DEFAULT_SHADOW: ShadowConfig = {
  enabled: true,
  color: "rgba(0,0,0,0.5)",
  blur: 8,
  offsetX: 2,
  offsetY: 2,
}

export const DEFAULT_STROKE: StrokeConfig = {
  enabled: false,
  color: "#000000",
  width: 2,
}

export const DEFAULT_POSITION: Position = {
  x: 50,
  y: 50,
  anchor: "bottom-left",
}
