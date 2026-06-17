export const WORLDVIEW_TYPE_LABELS: Record<string, string> = {
  faction: "勢力", location: "地點", concept: "概念", lore: "世界觀",
  item: "道具", event: "事件", other: "其他",
  nation: "國家", place: "地點", org: "組織", race: "種族", character: "角色",
}

export const WORLDVIEW_TYPE_COLORS: Record<string, string> = {
  faction: "#4A7B8C", location: "#5E7E55", concept: "#7B5EA7", lore: "#6B4A1E",
  item: "#C9A24B", event: "#9E332B", other: "#8A857C",
  nation: "#3B5E6B", place: "#5E7E55", org: "#B5654A", race: "#8A6FA0",
}

export function typeLabel(t: string): string { return WORLDVIEW_TYPE_LABELS[t] ?? t }
export function typeColor(t: string): string { return WORLDVIEW_TYPE_COLORS[t] ?? "#8A857C" }
