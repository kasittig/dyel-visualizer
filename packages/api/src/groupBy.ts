/** Groups values into a Map without relying on the ES2024 Map.groupBy runtime API. */
export function groupBy<T, K>(
  items: Iterable<T>,
  keySelector: (item: T, index: number) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  let index = 0;

  for (const item of items) {
    const key = keySelector(item, index++);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}
