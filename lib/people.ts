import type { PlannerItem, PlannerNotification } from '@/lib/types';

// Convert old ownership and notification data whenever records are read or written.
export function migrateLegacyText(value: string): string {
  return value.replace(/jhall@nce\.com\.au/gi, 'jpace@nce.com.au').replace(/\bJenna\b/gi, 'John');
}

export function migratePlannerItem(item: PlannerItem): PlannerItem {
  const optional = (value?: string) => value === undefined ? undefined : migrateLegacyText(value);
  return {
    ...item,
    title: migrateLegacyText(item.title),
    description: migrateLegacyText(item.description),
    owner: migrateLegacyText(item.owner),
    briefOwner: optional(item.briefOwner),
    assetCreator: optional(item.assetCreator),
    accountable: optional(item.accountable),
    approver: optional(item.approver),
    publisher: optional(item.publisher),
    performance: item.performance?.notes ? {...item.performance, notes: migrateLegacyText(item.performance.notes)} : item.performance,
  };
}

export function migratePlannerNotification(notification: PlannerNotification): PlannerNotification {
  return {
    ...notification,
    person: migrateLegacyText(notification.person),
    title: migrateLegacyText(notification.title),
    message: migrateLegacyText(notification.message),
  };
}
