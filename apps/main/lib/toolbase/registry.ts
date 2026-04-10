// Barrel re-export — all consumers can keep importing from "@/lib/toolbase/registry"
export {
  submitBugReport,
  getBugReports,
} from "./bugs";

export {
  getProduct,
  computeCompleteness,
  addProductToDb,
  proposeProductUpdate,
  approveProduct,
  rejectProduct,
  listPendingProducts,
  getPendingProduct,
} from "./products";
export type { ToolbaseMeta, PendingProduct } from "./products";

export {
  submitReview,
  getReviews,
  getReviewSummary,
  getReviewCount,
} from "./reviews";

export {
  listProducts,
  searchProducts,
  getRelatedProducts,
} from "./search";
