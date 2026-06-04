/** Admin product search result (catalog / kit / hotspot pickers). */
export type ProductPickerOption = {
  id: string;
  name: string;
  slug: string;
  variants: { id: string; label: string; active: boolean }[];
};
