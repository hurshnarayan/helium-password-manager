export const DEFAULT_AUTOTYPE_SEQUENCE = '{USERNAME}{TAB}{PASSWORD}{ENTER}'
export const AUTOTYPE_RETYPE_WINDOW_MS = 10000

export function normalizeAutotypeText(value = '') {
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getAutotypeSequence(entry) {
  return entry?.autotype || entry?.autotypeSequence || DEFAULT_AUTOTYPE_SEQUENCE
}

export function getAutotypeEnabled(entry) {
  return entry?.autoTypeEnabled !== false
}

export function getAutotypeWindowRules(entry) {
  const raw = entry?.autotypeWindows || entry?.autotypeWindowTitles || entry?.windowTitles || entry?.autotypeWindowTitle || ''
  const text = Array.isArray(raw) ? raw.join('\n') : raw
  return text
    .split(/\r?\n|[;,]/)
    .map((rule) => rule.trim())
    .filter(Boolean)
}

export function getAutotypeAssociations(entry) {
  const source = entry?.autotypeAssociations ?? entry?.autoTypeAssociations
  if (Array.isArray(source)) {
    return source
      .map((assoc) => {
        const window = String(assoc?.window ?? assoc?.title ?? assoc?.pattern ?? '').trim()
        const sequence = String(assoc?.sequence ?? assoc?.autotypeSequence ?? assoc?.autotype ?? '').trim()
        const useSpecificSequence = assoc?.useSpecificSequence ?? assoc?.specificSequence ?? sequence.length > 0
        return { window, sequence: useSpecificSequence ? sequence : '', useSpecificSequence: Boolean(useSpecificSequence) }
      })
      .filter((assoc) => assoc.window || assoc.sequence || assoc.useSpecificSequence)
  }

  return getAutotypeWindowRules(entry).map((window) => ({ window, sequence: '', useSpecificSequence: false }))
}

export function extractHostname(url = '') {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function matchesWindowPattern(pattern, windowTitle) {
  const rule = String(pattern ?? '').trim()
  const title = String(windowTitle ?? '')
  if (!rule || !title) return false
  if (rule === '*') return true

  if (rule.startsWith('//') && rule.endsWith('//') && rule.length >= 4) {
    try {
      return new RegExp(rule.slice(2, -2), 'i').test(title)
    } catch {
      return false
    }
  }

  const escaped = escapeRegex(rule).replace(/\\\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i').test(title)
}

export function entryMatchesWindow(entry, windowTitle) {
  const title = String(windowTitle ?? '')
  if (!title) return false

  const signals = [entry?.name, entry?.username, extractHostname(entry?.url), entry?.url].filter(Boolean)
  return signals.some((signal) => title.toLowerCase().includes(String(signal).toLowerCase()))
}

export function buildAutotypeCandidates(vault, windowTitle) {
  const entries = Array.isArray(vault) ? vault : []
  const candidates = []

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!getAutotypeEnabled(entry)) {
      continue
    }

    const defaultSequence = getAutotypeSequence(entry)
    const associations = getAutotypeAssociations(entry)
    const directMatches = []
    const blankAssociations = []

    for (let assocIndex = 0; assocIndex < associations.length; assocIndex += 1) {
      const assoc = associations[assocIndex]
      if (!assoc.window) {
        blankAssociations.push({ ...assoc, assocIndex })
        continue
      }

      if (matchesWindowPattern(assoc.window, windowTitle)) {
        const specific = Boolean(assoc.useSpecificSequence && assoc.sequence)
        directMatches.push({
          entry,
          sequence: specific ? assoc.sequence : defaultSequence,
          reason: `Window rule: ${assoc.window}${specific ? '' : ' (default sequence)'}`,
          score: assoc.window === '*' ? 320 : assoc.window.startsWith('//') && assoc.window.endsWith('//') ? 360 : 400,
          kind: 'window',
          matchedWindow: assoc.window,
          associationIndex: assocIndex,
          entryIndex: index
        })
      }
    }

    if (entryMatchesWindow(entry, windowTitle)) {
      directMatches.push({
        entry,
        sequence: defaultSequence,
        reason: 'Title/URL match',
        score: 260,
        kind: 'identity',
        entryIndex: index
      })
    }

    if (directMatches.length > 0) {
      candidates.push(...directMatches)
      for (const assoc of blankAssociations) {
        candidates.push({
          entry,
          sequence: assoc.useSpecificSequence && assoc.sequence ? assoc.sequence : defaultSequence,
          reason: assoc.useSpecificSequence && assoc.sequence
            ? 'Blank window association'
            : 'Blank window association (default sequence)',
          score: 120,
          kind: 'blank',
          matchedWindow: '',
          associationIndex: assoc.assocIndex,
          entryIndex: index
        })
      }
    }
  }

  const seen = new Set()
  return candidates
    .filter((candidate) => {
      const key = `${candidate.entry.id}::${candidate.sequence}::${candidate.reason}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.score - a.score || a.entryIndex - b.entryIndex || a.associationIndex - b.associationIndex)
}

export function buildAutotypeSearchCandidates(vault) {
  return (Array.isArray(vault) ? vault : [])
    .filter((entry) => getAutotypeEnabled(entry))
    .map((entry, index) => ({
      entry,
      sequence: getAutotypeSequence(entry),
      reason: 'Search database',
      score: 0,
      kind: 'search',
      entryIndex: index
    }))
}

export function isRecentAutotypeMatch(match) {
  return Boolean(match && Date.now() - match.timestamp <= AUTOTYPE_RETYPE_WINDOW_MS)
}
