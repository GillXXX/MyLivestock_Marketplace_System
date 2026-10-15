import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRole from "./RequireRole";

// Renders `path` inside a small app: one guarded admin page, one guarded
// farmer page, and the pages the guard can send people to.
const visit = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin-dashboard"
          element={
            <RequireRole roles={["admin", "mao_staff"]}>
              <p>admin page</p>
            </RequireRole>
          }
        />
        <Route
          path="/farmer-dashboard"
          element={
            <RequireRole roles={["farmer"]}>
              <p>farmer page</p>
            </RequireRole>
          }
        />
        <Route path="/buyer-dashboard" element={<p>buyer dashboard</p>} />
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/onboarding" element={<p>onboarding page</p>} />
      </Routes>
    </MemoryRouter>
  );

const signInAs = (user) => {
  localStorage.setItem("token", "abc");
  localStorage.setItem("user", JSON.stringify(user));
};

beforeEach(() => localStorage.clear());

test("not signed in goes to Login", () => {
  visit("/farmer-dashboard");
  expect(screen.getByText("login page")).toBeInTheDocument();
});

test("a buyer opening an admin page lands on the buyer dashboard", () => {
  signInAs({ role: "buyer", profileCompleted: true });
  visit("/admin-dashboard");
  expect(screen.getByText("buyer dashboard")).toBeInTheDocument();
  expect(screen.queryByText("admin page")).not.toBeInTheDocument();
});

test("a farmer opening an admin page lands on the farmer dashboard", () => {
  signInAs({ role: "farmer", profileCompleted: true });
  visit("/admin-dashboard");
  expect(screen.getByText("farmer page")).toBeInTheDocument();
});

test("MAO staff and admins can open admin pages", () => {
  signInAs({ role: "mao_staff", profileCompleted: true });
  visit("/admin-dashboard");
  expect(screen.getByText("admin page")).toBeInTheDocument();
});

test("the right role sees the page", () => {
  signInAs({ role: "farmer", profileCompleted: true });
  visit("/farmer-dashboard");
  expect(screen.getByText("farmer page")).toBeInTheDocument();
});

test("an unfinished account goes to Onboarding", () => {
  signInAs({ role: "farmer", profileCompleted: false });
  visit("/farmer-dashboard");
  expect(screen.getByText("onboarding page")).toBeInTheDocument();
});

test("a token without a stored user, or a broken one, goes to Login", () => {
  localStorage.setItem("token", "abc");
  localStorage.setItem("user", "{not json");
  visit("/farmer-dashboard");
  expect(screen.getByText("login page")).toBeInTheDocument();
});
