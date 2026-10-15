// Supporting document requirements, matching the capstone manuscript's
// "Trading Process Per Livestock Type" section: every live animal listing
// needs the barangay health certificate for MAO review. Backyard farm
// products (eggs, fruits, vegetables, ...) have no required document.
// "single" means exactly the one listed document is required; "either"
// means one of the listed documents is enough; "both" means the farmer
// must attach documents covering both. Since uploaded documents aren't
// individually tagged by type, minDocuments is enforced as a count.
// Mirrors frontend/src/utils/livestockDocRequirements.js — keep both in sync.
const { getCategory } = require("./productCatalog");

const LIVESTOCK_DOCUMENT_REQUIREMENT = {
  logic: "single",
  minDocuments: 1,
  documents: ["Barangay health certificate"],
};

function getDocumentRequirement(type, category) {
  return getCategory(type, category) === "livestock" ? LIVESTOCK_DOCUMENT_REQUIREMENT : null;
}

function formatRequirementMessage(type, category) {
  const req = getDocumentRequirement(type, category);
  if (!req) return null;

  if (req.logic === "single") {
    return `${type} listings require the ${req.documents[0]} — please attach 1 supporting document.`;
  }

  const joiner = req.logic === "both" ? " and " : " or ";
  const lead = req.logic === "both" ? "require both" : "require at least one of";

  return `${type} listings ${lead} ${req.documents.join(joiner)} — please attach at least ${
    req.minDocuments
  } supporting document${req.minDocuments > 1 ? "s" : ""}.`;
}

module.exports = {
  LIVESTOCK_DOCUMENT_REQUIREMENT,
  getDocumentRequirement,
  formatRequirementMessage,
};
