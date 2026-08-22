# Goal celebration visual direction

The production mascot art was generated with ImageGen and remains unchanged:

- `assets/celebration/goal-complete-hero.webp`
- transparent background, no embedded text, symbols, UI, or device chrome

The screen mockups are deterministic SVG compositions built from the app's real design tokens rather than AI-generated UI. This prevents invented icons, distorted typography, and palette drift.

## Screen rules

- Default presentation is the current light theme: `#F5F6F8` ground, `#FFFFFF` surfaces, `#202129` text, `#626774` muted copy.
- Card and story surfaces use the app's 16 px radius; the primary action uses its 10 px control radius.
- Savings green is semantic and limited to verified progress and the seven-day bars.
- No gold UI, decorative glyphs, emoji, custom journey icons, glass, gradients, or separate cinematic background.
- The only event decoration is transient rectangular confetti; reduced-motion users receive the static layout.
- Dark and PRO variants inherit their real theme roles from `themeConfig.js`; they are not forced onto light-theme users.
- The first state is a genuine full-screen celebration: large mascot, a naturally wrapped headline, and an uncontained 54 px amount. No summary content is visible yet.
- After a two-second reading hold, a 640 ms shared-element transition shrinks the mascot into the left side of the compact summary header while the scrollable journey rises from below.
- Reduced Motion preserves the full-screen-first sequence and switches to the summary without spatial travel.

## ImageGen production-art prompt

```text
Use case: stylized-concept
Asset type: production in-app hero artwork for a React Native goal-completion celebration screen, isolated transparent image
Primary request: create a spectacular celebratory illustration showing the same recognizable blue-and-cream Almost cat mascot from the supplied mascot reference springing joyfully upward from a refined translucent savings jar that has just filled to the top; luminous emerald and warm-gold coin tokens rise around the cat in one elegant spiral
Input image: mascot identity and rendering-style reference; preserve the cat's blue gradient fur, cream face/body, big round eyes, simple rounded proportions, and soft painterly 3D finish
Scene/backdrop: no scene and no rectangular backdrop; genuinely transparent alpha background
Style/medium: premium soft 3D editorial illustration, tactile glass, subtle pearlescent highlights, app-store-feature-quality polish
Composition/framing: centered portrait cutout, readable at 220–300 px tall, strong clean silhouette, main subject fills the canvas, outer edges free for UI confetti
Lighting/mood: uplifting glow from inside the completed jar, celebratory and emotionally resonant, crisp rim light, controlled sparkle, not neon
Color palette: mascot blue and cream, Almost savings emerald, restrained warm coin color, pearl white highlights
Constraints: preserve mascot identity; transparent background with clean alpha edges; one mascot only; no words, letters, numbers, currency symbols, logos, watermark, UI, frame, border, humans, fireworks background, clutter, or emoji
```
