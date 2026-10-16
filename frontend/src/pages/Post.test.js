import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Post from "./Post";
import { loadListingDraft, saveListingDraft } from "../utils/listingDraft";

const LISTING = {
  id: 5,
  livestock_type: "Swine",
  category: "livestock",
  unit: "head",
  breed: "Landrace",
  age: "6 months",
  weight: "90",
  price: "9000",
  quantity: 2,
  health_status: "Healthy",
  location: "Poblacion",
  description: "",
  image_url: "",
  documents: "[]",
  open_deals: 0,
};

const mockServer = (listing = LISTING) => {
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(url.includes("/api/farmer/profile") ? { is_verified: true } : listing),
    })
  );
};

// Renders the page and lets its first requests (profile or listing) finish.
const visit = async (path) => {
  let view;
  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/post" element={<Post />} />
          <Route path="/edit/:id" element={<Post />} />
        </Routes>
      </MemoryRouter>
    );
  });
  return view;
};

const field = (container, name) => container.querySelector(`[name="${name}"]`);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "t");
  localStorage.setItem("user", JSON.stringify({ id: 7, role: "farmer" }));
  mockServer();
});

test("opening the form without typing saves nothing", async () => {
  const { unmount } = await visit("/post");
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  unmount();
  expect(loadListingDraft(undefined)).toBeNull();
});

test("what a farmer types comes back after leaving the page", async () => {
  const first = await visit("/post");
  fireEvent.change(field(first.container, "breed"), { target: { name: "breed", value: "Duroc" } });
  fireEvent.change(field(first.container, "price"), { target: { name: "price", value: "7500" } });
  first.unmount();

  const second = await visit("/post");
  expect(field(second.container, "breed")).toHaveValue("Duroc");
  expect(field(second.container, "price")).toHaveValue(7500);
  expect(screen.getByText(/We restored the details you entered/)).toBeInTheDocument();
});

test("Discard changes empties the form and forgets the draft", async () => {
  saveListingDraft(undefined, { typeChoice: "", customType: "", formData: { breed: "Duroc" } });
  const { container } = await visit("/post");
  expect(field(container, "breed")).toHaveValue("Duroc");

  fireEvent.click(screen.getByText("Discard changes"));

  expect(field(container, "breed")).toHaveValue("");
  expect(screen.queryByText(/We restored/)).not.toBeInTheDocument();
  expect(loadListingDraft(undefined)).toBeNull();
});

test("typing a value back to the original removes the draft", async () => {
  const { container } = await visit("/post");
  fireEvent.change(field(container, "breed"), { target: { name: "breed", value: "D" } });
  expect(loadListingDraft(undefined)).not.toBeNull();
  fireEvent.change(field(container, "breed"), { target: { name: "breed", value: "" } });
  expect(loadListingDraft(undefined)).toBeNull();
});

test("editing: unsaved changes are restored over the saved listing", async () => {
  saveListingDraft("5", { typeChoice: "Swine", customType: "", formData: { breed: "Duroc", price: "8000" } });
  const { container } = await visit("/edit/5");

  await waitFor(() => expect(field(container, "breed")).toHaveValue("Duroc"));
  expect(field(container, "price")).toHaveValue(8000);
  expect(field(container, "location")).toHaveValue("Poblacion");
});

test("editing with an open deal keeps the server's price, unit and weight", async () => {
  mockServer({ ...LISTING, open_deals: 1 });
  saveListingDraft("5", {
    typeChoice: "Goat",
    customType: "",
    formData: { breed: "Duroc", price: "1", weight: "1", unit: "kg_live" },
  });
  const { container } = await visit("/edit/5");

  await waitFor(() => expect(field(container, "breed")).toHaveValue("Duroc"));
  expect(field(container, "price")).toHaveValue(9000);
  expect(field(container, "weight")).toHaveValue(90);
  expect(field(container, "unit")).toHaveValue("head");
});

test("a draft for one listing doesn't appear on another", async () => {
  saveListingDraft("6", { typeChoice: "Swine", customType: "", formData: { breed: "Duroc" } });
  const { container } = await visit("/edit/5");

  await waitFor(() => expect(field(container, "breed")).toHaveValue("Landrace"));
  expect(screen.queryByText(/We restored/)).not.toBeInTheDocument();
});
