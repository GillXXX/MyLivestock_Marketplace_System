import { loadListingDraft, saveListingDraft, clearListingDraft, clearAllListingDrafts } from "./listingDraft";

const signIn = (id) => localStorage.setItem("user", JSON.stringify({ id }));
const draft = { typeChoice: "Pig", customType: "", formData: { price: "8000", breed: "Landrace" } };

beforeEach(() => localStorage.clear());

test("keeps a draft per farmer and per listing", () => {
  signIn(7);
  saveListingDraft(undefined, draft);
  saveListingDraft("12", { ...draft, formData: { price: "500" } });

  expect(loadListingDraft(undefined).formData.breed).toBe("Landrace");
  expect(loadListingDraft("12").formData.price).toBe("500");
  expect(loadListingDraft(undefined).savedAt).toEqual(expect.any(Number));

  signIn(8);
  expect(loadListingDraft(undefined)).toBeNull();
});

test("clearing removes only that draft", () => {
  signIn(7);
  saveListingDraft(undefined, draft);
  saveListingDraft("12", draft);
  clearListingDraft("12");

  expect(loadListingDraft("12")).toBeNull();
  expect(loadListingDraft(undefined)).not.toBeNull();
});

test("logout cleanup removes every draft but nothing else", () => {
  signIn(7);
  saveListingDraft(undefined, draft);
  saveListingDraft("12", draft);
  localStorage.setItem("buyerManualLocation", "x");
  clearAllListingDrafts();

  expect(loadListingDraft(undefined)).toBeNull();
  expect(loadListingDraft("12")).toBeNull();
  expect(localStorage.getItem("buyerManualLocation")).toBe("x");
});

test("does nothing without a signed-in user or with a corrupt draft", () => {
  saveListingDraft(undefined, draft);
  expect(loadListingDraft(undefined)).toBeNull();

  signIn(7);
  localStorage.setItem("listingDraft:7:new", "{not json");
  expect(loadListingDraft(undefined)).toBeNull();
});
