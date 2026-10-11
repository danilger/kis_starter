import { describe, expect, test } from "bun:test";
import path from "node:path";
import { ESLint } from "eslint";

const root = path.resolve(import.meta.dirname, "../..");

async function lintVirtual(filePath: string, code: string) {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintText(code, {
    filePath: path.join(root, filePath),
  });
  return results[0]?.messages ?? [];
}

function hasBoundariesError(messages: { ruleId: string | null }[]) {
  return messages.some(
    (m) => m.ruleId === "boundaries/entry-point" || m.ruleId === "boundaries/element-types",
  );
}

describe("eslint module boundaries", () => {
  test("forbids deep import into another module", async () => {
    const messages = await lintVirtual(
      "src/server/modules/probe/forbidden-deep-import.ts",
      `import { users } from "../auth/auth.table";\nexport const x = users;\n`,
    );
    expect(hasBoundariesError(messages)).toBe(true);
  });

  test("allows import through public module index", async () => {
    const messages = await lintVirtual(
      "src/server/modules/probe/allowed-public-import.ts",
      `import { authRoutes } from "../auth";\nexport const routes = authRoutes;\n`,
    );
    const boundaryErrors = messages.filter(
      (m) => m.ruleId === "boundaries/entry-point" || m.ruleId === "boundaries/element-types",
    );
    expect(boundaryErrors).toEqual([]);
  });
});
