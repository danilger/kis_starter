import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "data/**", "src/server/db/migrations/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    plugins: {
      boundaries,
      import: importPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      "boundaries/include": ["src/**/*.*"],
      "boundaries/elements": [
        { type: "server-lib", pattern: "src/server/lib/*", mode: "file" },
        { type: "server-db", pattern: "src/server/db/*", mode: "file" },
        {
          type: "server-module",
          pattern: "src/server/modules/*",
          mode: "folder",
          capture: ["module"],
        },
        { type: "server-app", pattern: "src/server/{app,index}.ts", mode: "file" },
        { type: "client-app", pattern: "src/client/app/*", mode: "file" },
        { type: "client-pages", pattern: "src/client/pages/*", mode: "file" },
        {
          type: "client-features",
          pattern: "src/client/features/*",
          mode: "folder",
          capture: ["feature"],
        },
        { type: "client-shared", pattern: "src/client/shared/*", mode: "folder" },
        { type: "client-entry", pattern: "src/client/main.tsx", mode: "file" },
      ],
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.server.json", "./tsconfig.client.json"],
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
    },
    rules: {
      "boundaries/no-unknown": "off",
      "boundaries/no-unknown-files": "off",
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              target: ["server-module"],
              allow: "index.ts",
              message: "Import other modules only through their public index.ts",
            },
            {
              target: [
                "server-lib",
                "server-db",
                "server-app",
                "client-app",
                "client-pages",
                "client-features",
                "client-shared",
                "client-entry",
              ],
              allow: "*",
            },
          ],
        },
      ],
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: ["client-shared"],
              disallow: ["client-features", "client-pages", "client-app"],
            },
            {
              from: ["client-features"],
              disallow: ["client-pages", "client-app"],
            },
            {
              from: ["client-pages", "client-features", "client-shared", "client-app", "client-entry"],
              disallow: ["server-lib", "server-db", "server-module"],
              message: "Client must not import server runtime modules",
            },
          ],
        },
      ],
      "import/no-cycle": ["error", { maxDepth: 10 }],
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["src/server/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        Bun: "readonly",
      },
    },
  },
);
