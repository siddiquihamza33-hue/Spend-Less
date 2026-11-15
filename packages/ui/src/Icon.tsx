import {
  AirplaneTilt, ArrowLeft, ArrowRight, ArrowUUpLeft, ArrowUpRight, CalendarBlank, CarSimple, ChartBar, ChartPieSlice,
  CheckCircle, Coins, CreditCard, DotsThreeCircle, DownloadSimple, Eye, EyeSlash, FileArrowUp, FileText, FilmStrip,
  ForkKnife, GraduationCap, HandHeart, Heartbeat, Key, Lightbulb, Lightning, ListBullets, LockSimple, MagnifyingGlass,
  MegaphoneSimple, PlayCircle, Receipt, Repeat, ShieldCheck, ShoppingBag, ShoppingCartSimple, Sparkle, SquaresFour,
  Storefront, Tag, Trash, TrendDown, TrendUp, UploadSimple, Wallet, WarningCircle, X, type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** App icon names → Phosphor Regular icons (bundled as SVG, no icon font or CDN). */
const ICONS: Record<string, PhosphorIcon> = {
  lens: CreditCard, layout: SquaresFour, pie: ChartPieSlice, bars: ChartBar, store: Storefront, sparkles: Sparkle,
  list: ListBullets, calendar: CalendarBlank, coins: Coins, download: DownloadSimple, upload: UploadSimple, trash: Trash,
  play: PlayCircle, fileUp: FileArrowUp, file: FileText, tag: Tag, trend: TrendUp, trendDown: TrendDown, shield: ShieldCheck,
  search: MagnifyingGlass, left: ArrowLeft, right: ArrowRight, x: X, lightbulb: Lightbulb, arrowUpRight: ArrowUpRight,
  repeat: Repeat, wallet: Wallet, check: CheckCircle, alert: WarningCircle, eye: Eye, eyeOff: EyeSlash, lock: LockSimple,
  key: Key, megaphone: MegaphoneSimple, refund: ArrowUUpLeft,
  // category icon keys (from packages/core CAT_ICON)
  food: ForkKnife, cart: ShoppingCartSimple, car: CarSimple, bag: ShoppingBag, zap: Lightning, plane: AirplaneTilt,
  film: FilmStrip, health: Heartbeat, edu: GraduationCap, receipt: Receipt, heart: HandHeart, other: DotsThreeCircle,
};

export const iconNames = Object.keys(ICONS);

/** Decorative icon sized by the `.i` / `.i.sm` / `.i.lg` styles (18 / 15 / 22 px). */
export function Icon({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  const C = ICONS[name] || ICONS.other;
  return <C className={'i' + (size ? ' ' + size : '')} size="1em" weight="regular" aria-hidden="true" focusable="false" />;
}
