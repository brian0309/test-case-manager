import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
	{
		ignores: ["dist", "eslint.config.js"],
	},
	js.configs.recommended,
	react.configs.flat.recommended,
	react.configs.flat["jsx-runtime"],
	{
		settings: {
			react: { version: "19.0" },
		},
	},
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
			},
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: { jsx: true },
			},
		},
		plugins: {
			react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			"@typescript-eslint": tseslint,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			...tseslint.configs.recommended.rules,
			"react/prop-types": "off",
			"react/no-unescaped-entities": "off",
			"react/jsx-no-target-blank": "off",
			"no-undef": "off",
			"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/static-components": "off",
			"react-hooks/incompatible-library": "off",
			"react-hooks/refs": "off",
			"react-hooks/immutability": "off",
			"react-hooks/purity": "off",
		},
	},
];