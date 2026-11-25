// All of papr's icons in one place (Lucide, an open-source line icon set). Use names, not emojis.
import {
  Presentation, ScanSearch, BookCheck, LayoutTemplate, Mic, Flame, Trophy, Lightbulb, GraduationCap, FlaskConical,
  Coins, FileText, PenLine, Tags, UserCheck, BookOpen, Sparkles, Check, X, TriangleAlert, CircleCheck, OctagonX,
  Pause, KeyRound, PartyPopper, Wrench, MonitorPlay, Clock, Volume2, VolumeX, RotateCcw, Square, Hand, Mail, Inbox,
  Pencil, Library, BadgeCheck, Bell, Briefcase, Flag, Landmark, Code, Pin, Droplet, Eye, Download, Plus, Info, Pencil as Edit,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  slides: Presentation, precheck: ScanSearch, references: BookCheck, poster: LayoutTemplate, defence: Mic, mic: Mic,
  flame: Flame, trophy: Trophy, idea: Lightbulb, graduate: GraduationCap, lab: FlaskConical, money: Coins, file: FileText,
  write: PenLine, tags: Tags, supervisor: UserCheck, book: BookOpen, sparkles: Sparkles, check: Check, x: X,
  warn: TriangleAlert, ok: CircleCheck, bad: OctagonX, pause: Pause, key: KeyRound, party: PartyPopper, tool: Wrench,
  monitor: MonitorPlay, clock: Clock, volume: Volume2, mute: VolumeX, again: RotateCcw, stop: Square, wave: Hand,
  mail: Mail, inbox: Inbox, pencil: Pencil, edit: Edit, library: Library, verified: BadgeCheck, bell: Bell,
  briefcase: Briefcase, flag: Flag, building: Landmark, code: Code, pin: Pin, drop: Droplet, eye: Eye, download: Download,
  plus: Plus, info: Info,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 18, className, strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  const C = ICONS[name] || Info;
  return <C size={size} strokeWidth={strokeWidth} className={`ic${className ? " " + className : ""}`} aria-hidden="true" focusable="false" />;
}
