// Keeps what a farmer has typed into the listing form in this browser, so a
// dropped connection, an expired session or a closed tab doesn't lose it.
// One draft per farmer per listing ("new" for a listing not posted yet).
// Only the text fields are kept: a browser can't store chosen files, so the
// photo and certificate have to be attached again.

const PREFIX = "listingDraft:";

const currentUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.id ?? null;
  } catch (error) {
    return null;
  }
};

const draftKey = (listingId) => {
  const userId = currentUserId();
  return userId == null ? null : `${PREFIX}${userId}:${listingId || "new"}`;
};

export const loadListingDraft = (listingId) => {
  const key = draftKey(listingId);
  if (!key) return null;

  try {
    const draft = JSON.parse(localStorage.getItem(key) || "null");
    return draft && draft.formData ? draft : null;
  } catch (error) {
    return null;
  }
};

export const saveListingDraft = (listingId, draft) => {
  const key = draftKey(listingId);
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch (error) {
    // Storage full or blocked (private window): the form still works, it
    // just isn't kept.
  }
};

export const clearListingDraft = (listingId) => {
  const key = draftKey(listingId);
  if (!key) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Nothing to clean up if storage is blocked.
  }
};

// On logout, so the next person on a shared device doesn't find them.
export const clearAllListingDrafts = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Nothing to clean up if storage is blocked.
  }
};
