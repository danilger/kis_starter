import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const root = path.resolve(import.meta.dirname, "../..");
const cycleDir = path.join(root, "src/server/modules/_cycle_fixture");

async function lintVirtual(filePath: string, code: string) {
  // Virtual paths break import/no-cycle SCC analysis; boundaries rules still apply.
  const eslint = new ESLint({
    cwd: root,
    overrideConfig: [
      {
        rules: {
          "import/no-cycle": "off",
        },
      },
    ],
  });
  const results = await eslint.lintText(code, {
    filePath: path.join(root, filePath),
  });
  return results[0]?.messages ?? [];
}

function hasRule(messages: { ruleId: string | null }[], ruleId: string) {
  return messages.some((m) => m.ruleId === ruleId);
}

describe("eslint module boundaries", () => {
  test("forbids deep import into another module", async () => {
    const messages = await lintVirtual(
      "src/server/modules/probe/forbidden-deep-import.ts",
      `import { users } from "../auth/auth.table";\nexport const x = users;\n`,
    );
    expect(hasRule(messages, "boundaries/entry-point")).toBe(true);
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

  test("forbids client importing server runtime modules", async () => {
    const messages = await lintVirtual(
      "src/client/features/probe/bad-server-import.ts",
      `import { hashPassword } from "../../../server/lib/password";\nexport const x = hashPassword;\n`,
    );
    expect(hasRule(messages, "boundaries/element-types")).toBe(true);
  });

  test("forbids shared importing features", async () => {
    const messages = await lintVirtual(
      "src/client/shared/probe/bad-feature-import.ts",
      `import { useAuth } from "../../features/auth/AuthProvider";\nexport const x = useAuth;\n`,
    );
    expect(hasRule(messages, "boundaries/element-types")).toBe(true);
  });

  test("forbids features importing pages", async () => {
    const messages = await lintVirtual(
      "src/client/features/probe/bad-page-import.ts",
      `import { HomePage } from "../../pages/HomePage";\nexport const x = HomePage;\n`,
    );
    expect(hasRule(messages, "boundaries/element-types")).toBe(true);
  });

  test("detects circular imports without maxDepth limit", async () => {
    mkdirSync(cycleDir, { recursive: true });
    writeFileSync(
      path.join(cycleDir, "a.ts"),
      `import { b } from "./b";\nexport const a = () => b;\n`,
    );
    writeFileSync(
      path.join(cycleDir, "b.ts"),
      `import { a } from "./a";\nexport const b = () => a;\n`,
    );

    try {
      const eslint = new ESLint({ cwd: root });
      const results = await eslint.lintFiles([
        path.join(cycleDir, "a.ts"),
        path.join(cycleDir, "b.ts"),
      ]);
      const messages = results.flatMap((r) => r.messages);
      expect(hasRule(messages, "import/no-cycle")).toBe(true);
    } finally {
      rmSync(cycleDir, { recursive: true, force: true });
    }
  });
});

afterAll(() => {
  rmSync(cycleDir, { recursive: true, force: true });
});
