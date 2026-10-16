import { render, screen } from "@testing-library/react";
import ListingReviewBadge, { isMaoApproved } from "./ListingReviewBadge";

const reviewed = { status: "Available", reviewed_at: "2026-10-10T08:00:00Z", livestock_type: "Swine", category: "livestock" };

test("only an Available listing MAO reviewed counts as approved", () => {
  expect(isMaoApproved(reviewed)).toBe(true);
  expect(isMaoApproved({ ...reviewed, reviewed_at: null })).toBe(false);
  expect(isMaoApproved({ ...reviewed, status: "Pending" })).toBe(false);
  expect(isMaoApproved({ ...reviewed, status: "Sold" })).toBe(false);
  expect(isMaoApproved(undefined)).toBe(false);
});

test("shows nothing for a listing MAO hasn't approved", () => {
  const { container } = render(<ListingReviewBadge listing={{ ...reviewed, reviewed_at: null }} variant="full" />);
  expect(container).toBeEmptyDOMElement();
});

test("cards get a short label", () => {
  render(<ListingReviewBadge listing={reviewed} />);
  expect(screen.getByText("MAO verified")).toBeInTheDocument();
});

test("the details view says what MAO checked for animals and for products", () => {
  const { rerender } = render(<ListingReviewBadge listing={reviewed} variant="full" />);
  expect(screen.getByText("Health certificate verified by MAO")).toBeInTheDocument();
  expect(screen.getByText(/Reviewed on/)).toBeInTheDocument();

  rerender(<ListingReviewBadge listing={{ ...reviewed, livestock_type: "Eggs", category: "product" }} variant="full" />);
  expect(screen.getByText("Approved by MAO")).toBeInTheDocument();
});
