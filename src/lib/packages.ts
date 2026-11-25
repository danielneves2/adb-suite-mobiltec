// Pacotes do aparelho: busca e sugestões. Sem I/O.

export function filterPackages(list: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  return q ? list.filter((p) => p.toLowerCase().includes(q)) : list
}

/** Sugeridos do catálogo que estão mesmo instalados neste aparelho, na ordem do catálogo. */
export function suggestedInstalled(suggested: string[], installed: string[]): string[] {
  const set = new Set(installed)
  return suggested.filter((p) => set.has(p))
}
