export const TAGS = [
  { id: 'draft',     label: 'Черновик',         color: '#78909C', bg: 'rgba(120,144,156,0.13)' },
  { id: 'wip',       label: 'В работе',          color: '#1E88E5', bg: 'rgba(30,136,229,0.12)' },
  { id: 'review',    label: 'Нужна редактура',   color: '#FB8C00', bg: 'rgba(251,140,0,0.12)' },
  { id: 'done',      label: 'Закончено',         color: '#43A047', bg: 'rgba(67,160,71,0.12)' },
  { id: 'idea',      label: 'Идея',              color: '#8E24AA', bg: 'rgba(142,36,170,0.12)' },
  { id: 'important', label: 'Важно',             color: '#E53935', bg: 'rgba(229,57,53,0.12)' },
]

export const TAGS_MAP = Object.fromEntries(TAGS.map(t => [t.id, t]))
