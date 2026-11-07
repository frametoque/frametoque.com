const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "src/**",
    ],
  },
  {
    files: ["*.{js,mjs,cjs}", "scripts/**/*.{js,mjs}"],
    rules: {
      "no-unused-vars": "warn",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
