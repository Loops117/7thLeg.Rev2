/** Max curated products per section on a product page (related / you may also want). */
export const MAX_PRODUCT_RECOMMENDATIONS_PER_SECTION = 12;

export type ProductRecommendationLists = {
  relatedProductIds: string[];
  youMayAlsoWantProductIds: string[];
};
