/**
 * OpenVideo Studio Framer-inspired Color Tokens
 * Derived from Framer Fresco design system tokens.
 */
export const framerColors = {
  // Brand / Primary Blue
  brand: "#0099ff",
  brandHover: "#0088ff",
  brandActive: "#0077ff",
  brandDimmed: "#009cf914",
  brandForeground: "#ffffff",
  brandGlow: "rgba(0, 153, 255, 0.85)",

  // Destructive / Error
  destructive: "#f24a58",
  destructiveBg: "#f24a5826",
  destructiveHover: "#f24a581a",
  destructiveBorder: "#ff3366",

  // Surfaces & Inputs
  inputBackground: "#1f1f1f",
  cellBackground: "#262626",
  cellBackgroundHover: "#222222",
  tabBarText: "#777777",
} as const;

export type FramerColors = typeof framerColors;
