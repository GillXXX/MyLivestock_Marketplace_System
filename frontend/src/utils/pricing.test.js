import {
  formatPrice,
  formatQuantity,
  formatWeight,
  getPricePerQuantityUnit,
  isValidUnitFor,
} from "./productCatalog";
import { computeDealAmount, priceBasis } from "./dealTerms";
import { getDocumentLabel } from "./livestockDocRequirements";

describe("live-weight pricing", () => {
  const pigs = { unit: "kg_live", price: "180.00", weight: "100" };

  test("prices per kg but counts by head", () => {
    expect(formatPrice(pigs.price, pigs.unit)).toBe("₱180 / kg");
    expect(formatQuantity(3, pigs.unit)).toBe("3 head");
    expect(formatQuantity(1, pigs.unit)).toBe("1 head");
  });

  test("estimates one head from the average weight", () => {
    expect(getPricePerQuantityUnit(pigs)).toBe(18000);
    expect(getPricePerQuantityUnit({ unit: "head", price: "6500.00" })).toBe(6500);
  });

  test("live animals can only be sold per head or per kg of live weight", () => {
    expect(isValidUnitFor("head", "livestock")).toBe(true);
    expect(isValidUnitFor("kg_live", "livestock")).toBe(true);
    expect(isValidUnitFor("tray", "livestock")).toBe(false);
    expect(isValidUnitFor("kg_live", "product")).toBe(false);
    expect(isValidUnitFor("kg", "product")).toBe(true);
  });

  test("shows a numeric live weight as kg per head and older text as typed", () => {
    expect(formatWeight("100", "Swine")).toBe("~100 kg / head");
    expect(formatWeight("70kg -80kg", "Swine")).toBe("70kg -80kg");
    expect(formatWeight("Large, 60g per egg", "Eggs")).toBe("Large, 60g per egg");
    expect(formatWeight("", "Swine")).toBe("");
  });
});

describe("deal amounts", () => {
  test("per kg: estimate from the listing weight until weighed", () => {
    const deal = { unit: "kg_live", unitPrice: 175, quantity: 3, listingWeight: "100" };
    expect(computeDealAmount(deal)).toBe(52500);
  });

  test("per kg: the actual weight at pickup sets the final amount", () => {
    const deal = { unit: "kg_live", unitPrice: 175, quantity: 3, listingWeight: "100", actualWeightKg: "312.00" };
    expect(computeDealAmount(deal)).toBe(54600);
  });

  test("per head: price times head", () => {
    expect(computeDealAmount({ unit: "head", unitPrice: "6500.00", quantity: 2 })).toBe(13000);
  });

  test("rounds to centavos", () => {
    expect(computeDealAmount({ unit: "kg_live", unitPrice: 180.5, actualWeightKg: 10.333 })).toBe(1865.11);
  });

  test("says what the price is per", () => {
    expect(priceBasis("kg_live")).toBe("kg");
    expect(priceBasis("tray")).toBe("tray");
    expect(priceBasis(undefined)).toBe("head");
  });
});

describe("document labels", () => {
  test("a live animal's document is its barangay health certificate", () => {
    expect(getDocumentLabel("Swine")).toBe("Barangay health certificate");
    expect(getDocumentLabel("Eggs")).toBe("Supporting document");
    expect(getDocumentLabel("Goat", "livestock", 1, 2)).toBe("Barangay health certificate 2");
  });
});
