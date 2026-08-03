import type { PageTab } from './appTabs';

export const PRIMARY_TABPANEL_ID = 'primary-tabpanel';

export function primaryTabId(id: PageTab) {
  return `primary-tab-${id}`;
}
