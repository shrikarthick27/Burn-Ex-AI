---
name: Burn-Ex Core
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9caca'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#849495'
  outline-variant: '#3a494a'
  surface-tint: '#00dce5'
  primary: '#e9feff'
  on-primary: '#003739'
  primary-container: '#00f5ff'
  on-primary-container: '#006c71'
  inverse-primary: '#00696e'
  secondary: '#ffb59e'
  on-secondary: '#5e1700'
  secondary-container: '#ff571a'
  on-secondary-container: '#521300'
  tertiary: '#fff9f0'
  on-tertiary: '#3a3000'
  tertiary-container: '#ffdb3f'
  on-tertiary-container: '#736000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#63f7ff'
  primary-fixed-dim: '#00dce5'
  on-primary-fixed: '#002021'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#3a0b00'
  on-secondary-fixed-variant: '#852400'
  tertiary-fixed: '#ffe16c'
  tertiary-fixed-dim: '#e7c427'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  hero-metric:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style
The design system embodies a "Smart Coach" persona: energetic, futuristic, and deeply trustworthy. It moves away from the cold, spreadsheet-like nature of traditional fitness trackers toward an evocative, AI-driven experience that feels like a premium digital mentor.

The aesthetic blends **Modern Corporate** precision with **Glassmorphism** and **High-Contrast** energy. It utilizes deep charcoal foundations to create a "void" where data and performance metrics can glow, emphasizing the futuristic and technical nature of AI-driven coaching. The interface should feel like a high-end sports car dashboard—performant, legible, and inspiring.

## Colors
This design system uses a high-energy palette designed to motivate.
- **Primary (Electric Teal):** Used for primary actions, progress indicators, and AI-driven insights. It represents "smart energy."
- **Secondary (Warm Orange-Red):** Used sparingly for high-intensity zones, alerts, or "burn" milestones.
- **Surface Strategy:** 
  - In **Dark Mode**, surfaces use semi-transparent overlays on the charcoal background to create depth.
  - In **Light Mode**, the primary teal is slightly darkened for legibility against the off-white background.
- **Status Colors:** Use semantic colors for "Confidence" levels (e.g., High: Teal, Medium: Amber, Low: Slate) accompanied by text labels to ensure WCAG AA compliance.

## Typography
The typography system relies on a dramatic scale contrast between "Hero Metrics" and supporting coaching text.
- **Headlines & Numbers:** Use Montserrat Bold. Calorie counts and workout durations are the visual anchors of every screen.
- **Body & Coaching:** Use Inter Regular. This ensures that long-form AI coaching advice remains highly readable and approachable.
- **Functional Labels:** Use Inter Semi-Bold in all-caps for metadata, such as heart rate zones or timestamps, to maintain a technical, "instrument-panel" feel.

## Layout & Spacing
The design system follows a strict **8px base grid** to ensure mathematical harmony.
- **Grid:** A 12-column fluid grid is used for desktop/tablet, collapsing to a 4-column grid for mobile.
- **Margins:** Standard mobile screen margins are set to 20px to allow the glassmorphic card edges to breathe.
- **Rhythm:** Vertical rhythm is driven by the 8px scale. Hero components (like the daily calorie ring) are separated by `xl` (48px) spacing, while grouped list items use `sm` (8px).

## Elevation & Depth
Depth is the primary differentiator between the two modes:
- **Dark Mode (Glassmorphism):** Elements use "Glass Panels"—semi-transparent background blurs (15-20px blur) with a subtle 1px border (#FFFFFF10) to define edges. A soft, inner glow in the primary color is applied to "active" or "high-priority" cards.
- **Light Mode (Tonal Layers):** Depth is created through soft, diffused shadows (Y: 4, Blur: 20, Opacity: 0.05) rather than blurs. Surfaces use a slightly brighter white (#FFFFFF) than the background (#F4F4F7) to create a subtle tiered effect.

## Shapes
The shape language is modern and approachable, utilizing significant rounding to offset the "technical" feel of the typography.
- **Cards & Panels:** 16px to 20px corner radius.
- **Buttons:** Fully pill-shaped (rounded-xl) to distinguish interactive elements from informational cards.
- **Icons:** Use a 2px stroke weight with rounded joins and caps to match the UI's roundedness.

## Components
- **Buttons:** Primary buttons are solid Electric Teal with dark text. Secondary buttons use the "Glass" style in dark mode or a subtle gray stroke in light mode.
- **Progress Rings:** Large, thick-stroked circular gauges for "Hero Metrics." Use a glow effect (Bloom) on the stroke in dark mode.
- **AI Coaching Cards:** These should have a distinct visual treatment—perhaps a subtle gradient border—to signal that the content is "generated" by the smart coach.
- **Input Fields:** Minimalist under-line or subtle-box style with 16px corner radius. Focus states must use the primary teal glow.
- **Chips/Confidence Labels:** Small, high-contrast pills. For example: "High Confidence" (Teal bg, Dark text), "Medium Confidence" (Amber bg, Dark text).
- **List Items:** Interactive rows with chevron-right indicators. In dark mode, rows are separated by a 1px #FFFFFF05 line.