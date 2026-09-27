// Supporting document requirements, matching the capstone manuscript's
// "Trading Process Per Livestock Type" section: every live animal listing
// needs the barangay health certificate for MAO review. Backyard farm
// products (eggs, fruits, vegetables, ...) have no required document.
// "single" means exactly the one listed document is required; "either"
// means one of the listed documents is enough; "both" means the farmer
// must attach documents covering both. Since uploaded documents aren't
// individually tagged by type, minDocuments is enforced as a count.
// Mirrors backend/utils/livestockDocRequirements.js — keep both in sync.
import { getCategory } from "./productCatalog";

export const LIVESTOCK_DOCUMENT_REQUIREMENT = {
  logic: "single",
  minDocuments: 1,
  documents: ["Barangay health certificate"],
};

export function getDocumentRequirement(type, category) {
  return getCategory(type, category) === "livestock" ? LIVESTOCK_DOCUMENT_REQUIREMENT : null;
}

export function formatRequirementMessage(type, category) {
  const req = getDocumentRequirement(type, category);
  if (!req) return null;

  if (req.logic === "single") {
    return `Requires the ${req.documents[0]} (1 document minimum).`;
  }

  const joiner = req.logic === "both" ? " and " : " or ";
  const lead = req.logic === "both" ? "Requires both" : "Requires at least one of";

  return `${lead} ${req.documents.join(joiner)} (${req.minDocuments} document${
    req.minDocuments > 1 ? "s" : ""
  } minimum).`;
}
