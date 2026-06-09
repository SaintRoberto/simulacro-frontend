export const getRequerimientoEstadoTagColor = (estado: string): string => {
  const normalized = (estado || '').toLowerCase();
  if (normalized.includes('rechaz')) return 'red';
  if (normalized.includes('final') || normalized.includes('complet')) return 'green';
  if (normalized.includes('proceso') || normalized.includes('seguim')) return 'gold';
  if (normalized.includes('reasign') || normalized.includes('escal')) return 'purple';
  if (normalized.includes('inici') || normalized.includes('solicit')) return 'blue';
  return 'default';
};
