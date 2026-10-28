import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("junta as classes e ignora valores vazios", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("resolve conflitos do Tailwind mantendo a última classe", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
