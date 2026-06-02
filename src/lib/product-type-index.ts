export type ProductTypeFlat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  storefrontVisible: boolean;
};

export type ProductTypeTreeRow = ProductTypeFlat & {
  depth: number;
  pathLabel: string;
};

/** In-memory index for hierarchy lookups (safe for client components). */
export class ProductTypeIndex {
  private readonly byId = new Map<string, ProductTypeFlat>();
  private readonly childrenOf = new Map<string | null, ProductTypeFlat[]>();

  constructor(rows: ProductTypeFlat[]) {
    for (const row of rows) {
      this.byId.set(row.id, row);
    }
    for (const row of rows) {
      const key = row.parentId;
      const list = this.childrenOf.get(key) ?? [];
      list.push(row);
      this.childrenOf.set(key, list);
    }
    for (const list of this.childrenOf.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
  }

  get(id: string): ProductTypeFlat | undefined {
    return this.byId.get(id);
  }

  getBySlug(slug: string): ProductTypeFlat | undefined {
    for (const row of this.byId.values()) {
      if (row.slug === slug) return row;
    }
    return undefined;
  }

  children(parentId: string | null): ProductTypeFlat[] {
    return this.childrenOf.get(parentId) ?? [];
  }

  /** Includes `id`. */
  descendantsOf(id: string): string[] {
    const out: string[] = [];
    const walk = (nodeId: string) => {
      out.push(nodeId);
      for (const c of this.children(nodeId)) walk(c.id);
    };
    if (this.byId.has(id)) walk(id);
    return out;
  }

  /** Includes `id`, root-first. */
  ancestorsOf(id: string): string[] {
    const chain: string[] = [];
    let cur = this.byId.get(id);
    while (cur) {
      chain.push(cur.id);
      cur = cur.parentId ? this.byId.get(cur.parentId) : undefined;
    }
    return chain.reverse();
  }

  expandWithDescendants(ids: readonly string[]): string[] {
    const set = new Set<string>();
    for (const id of ids) {
      for (const d of this.descendantsOf(id)) set.add(d);
    }
    return [...set];
  }

  expandWithAncestors(ids: readonly string[]): string[] {
    const set = new Set<string>();
    for (const id of ids) {
      for (const a of this.ancestorsOf(id)) set.add(a);
    }
    return [...set];
  }

  isLeaf(id: string): boolean {
    return this.children(id).length === 0;
  }

  leaves(): ProductTypeFlat[] {
    return [...this.byId.values()].filter((t) => this.isLeaf(t.id));
  }

  flattenTree(): ProductTypeTreeRow[] {
    const out: ProductTypeTreeRow[] = [];
    const walk = (parentId: string | null, depth: number, prefix: string) => {
      for (const node of this.children(parentId)) {
        const pathLabel = prefix ? `${prefix} › ${node.name}` : node.name;
        out.push({ ...node, depth, pathLabel });
        walk(node.id, depth + 1, pathLabel);
      }
    };
    walk(null, 0, "");
    return out;
  }

  breadcrumbNames(id: string, visibleOnly = false): string[] {
    return this.ancestorsOf(id)
      .map((aid) => this.byId.get(aid))
      .filter((t): t is ProductTypeFlat => Boolean(t))
      .filter((t) => !visibleOnly || t.storefrontVisible)
      .map((t) => t.name);
  }

  wouldCreateCycle(typeId: string, newParentId: string | null): boolean {
    if (!newParentId) return false;
    if (newParentId === typeId) return true;
    const desc = new Set(this.descendantsOf(typeId));
    return desc.has(newParentId);
  }
}

export function formatTypeBreadcrumb(index: ProductTypeIndex, typeIds: string[]): string | null {
  const lines: string[] = [];
  for (const typeId of typeIds) {
    const parts = index.breadcrumbNames(typeId, true);
    if (parts.length > 0) lines.push(parts.join(" › "));
  }
  return lines.length > 0 ? lines.join(" · ") : null;
}

export type ProductTypePickerOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  pathLabel: string;
  isLeaf: boolean;
};

export type ProductTypePickerGroup = {
  key: string;
  label: string;
  options: ProductTypePickerOption[];
};

function leafOptionFromRow(row: ProductTypeTreeRow): ProductTypePickerOption {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    pathLabel: row.pathLabel,
    isLeaf: true,
  };
}

/** Leaf types grouped by parent branch, in the same order as Settings → Product types. */
export function buildProductTypePickerGroups(rows: ProductTypeFlat[]): ProductTypePickerGroup[] {
  const index = new ProductTypeIndex(rows);
  const order: string[] = [];
  const groups = new Map<string, ProductTypePickerGroup>();

  for (const row of index.flattenTree()) {
    if (!index.isLeaf(row.id)) continue;

    const groupKey = row.parentId ?? `_root_${row.id}`;
    const groupLabel =
      row.depth === 0 ? row.name : row.pathLabel.slice(0, row.pathLabel.lastIndexOf(" › "));

    if (!groups.has(groupKey)) {
      order.push(groupKey);
      groups.set(groupKey, { key: groupKey, label: groupLabel, options: [] });
    }
    groups.get(groupKey)!.options.push(leafOptionFromRow(row));
  }

  return order.map((k) => groups.get(k)!);
}

/** Flat leaf list in tree order (for filters and legacy callers). */
export function buildProductTypePickerOptions(rows: ProductTypeFlat[]): ProductTypePickerOption[] {
  return buildProductTypePickerGroups(rows).flatMap((g) => g.options);
}
