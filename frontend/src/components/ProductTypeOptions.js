import { LIVESTOCK_TYPES, FARM_PRODUCT_TYPES, ALL_KNOWN_TYPES } from "../utils/productCatalog";

// The grouped <option>s for a product-type filter <select>. Render it right
// after the select's own "All ..." option. "Other" matches custom types a
// farmer typed in themselves — see matchesTypeFilter. Pass
// includeOther={false} where the filter is applied server-side as an exact
// match (e.g. Admin Reports), since "Other" isn't a real stored type.
function ProductTypeOptions({ includeOther = true }) {
  return (
    <>
      <optgroup label="Livestock">
        {LIVESTOCK_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </optgroup>
      <optgroup label="Farm Products">
        {FARM_PRODUCT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </optgroup>
      {includeOther && <option value="Other">Other</option>}
    </>
  );
}

export function matchesTypeFilter(type, filter) {
  if (filter === "Other") return !ALL_KNOWN_TYPES.includes(type);
  return type === filter;
}

export default ProductTypeOptions;
