import { ShieldCheck } from "lucide-react";
import { isLivestock } from "../utils/productCatalog";
import "./ListingReviewBadge.css";

// A listing on the marketplace that MAO reviewed and approved. reviewed_at
// is cleared when a farmer edits a listing that stays on the marketplace
// without going back to MAO, and listings published by the "Auto Approved"
// setting never have one, so neither gets the badge.
export const isMaoApproved = (listing) => listing?.status === "Available" && Boolean(listing?.reviewed_at);

// variant "chip": a short label for cards. "full": what MAO checked, and when.
function ListingReviewBadge({ listing, variant = "chip" }) {
  if (!isMaoApproved(listing)) return null;

  const livestock = isLivestock(listing.livestock_type, listing.category);

  if (variant === "chip") {
    return (
      <span className="listing-review-badge chip" title={livestock ? "Health certificate verified by MAO" : "Approved by MAO"}>
        <ShieldCheck size={12} />
        MAO verified
      </span>
    );
  }

  const date = new Date(listing.reviewed_at).toLocaleDateString([], { dateStyle: "medium" });

  return (
    <p className="listing-review-badge full">
      <ShieldCheck size={16} />
      <span>
        <strong>{livestock ? "Health certificate verified by MAO" : "Approved by MAO"}</strong>
        Reviewed on {date}
      </span>
    </p>
  );
}

export default ListingReviewBadge;
