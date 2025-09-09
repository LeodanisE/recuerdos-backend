// /lib/store.ts
import { kvGetJSON, kvSetJSON } from "./kv";

export interface LinkItem {
  code: string;
  key: string;
  url: string;
  createdAt: number;
  valid: boolean;
}

export async function getUserItems(email: string): Promise<LinkItem[]> {
  return (await kvGetJSON<LinkItem[]>(`u:${email}:items`)) ?? [];
}

export async function saveUserItems(email: string, items: LinkItem[]) {
  // guarda 5 años
  await kvSetJSON(`u:${email}:items`, items, 60 * 60 * 24 * 365 * 5);
}

export async function addUserItem(email: string, item: LinkItem) {
  const list = await getUserItems(email);
  list.unshift(item);
  await saveUserItems(email, list);
}