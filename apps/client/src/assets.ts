const assets = import.meta.glob('../../../{UnitArt,SpellIcon,CoreBase}/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const art = (path: string): string => assets[`../../../${path}`] ?? '';
