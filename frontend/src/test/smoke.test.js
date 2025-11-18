import { describe, it, expect } from "vitest";

describe("Smoke Tests - Frontend", () => {
  it("debe importar App sin errores", async () => {
    await expect(
      import("../App.jsx")
    ).resolves.toBeDefined();
  });

  it("debe importar main sin errores", async () => {
    await expect(
      import("../main.jsx")
    ).resolves.toBeDefined();
  });

  it("debe tener estructura de App válida", async () => {
    const module = await import("../App.jsx");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });
});


