// biome-ignore lint/performance/noBarrelFile: intentional barrel for backward-compatible imports
export {
  getBugReports,
  submitBugReport,
} from "./bugs";
export type { PendingProduct, ToolbaseMeta } from "./products";
export {
  addProductToDb,
  approveProduct,
  computeCompleteness,
  getPendingProduct,
  getProduct,
  listPendingProducts,
  proposeProductUpdate,
  rejectProduct,
} from "./products";

export {
  getReviewCount,
  getReviewSummary,
  getReviews,
  submitReview,
} from "./reviews";

export {
  getRelatedProducts,
  listProducts,
  searchProducts,
} from "./search";
