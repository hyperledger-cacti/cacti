# Cacti Design System

The Cacti design system is a small, token-driven visual language derived from
the Hyperledger Cacti brand mark: near-black ink, layered cactus greens, and a
single warm bloom accent. This documentation site uses it, and it is the
foundation for other UIs built on top of Cacti.

This page is for contributors who change the look of the docs or build a Cacti
UI. It lists the tokens, explains when to use each one, and sets the rules that
keep pages consistent.

## Where it lives

| File | Purpose |
|------|---------|
| `docs/docs/stylesheets/cacti-tokens.css` | Framework-agnostic tokens: color, type, spacing, radius, shadow, dark theme. Reusable by any Cacti UI. |
| `docs/docs/stylesheets/cacti-mkdocs.css` | Maps the tokens onto MkDocs Material and re-skins its components. |
| `docs/overrides/main.html` | Loads the Barlow display face. |
| `docs/overrides/partials/logo.html` | Shows the full-color logo on the light header and the color-reverse logo on the dark one. |

## Rules

1. **Never write raw literals.** Use the CSS custom properties for color,
   spacing, radius, shadow, and font (`var(--primary)`, `var(--space-3)`,
   `var(--radius-md)`). If a value is missing, add a token instead of
   hard-coding it.
2. **Prefer semantic tokens.** Components use `--primary`, `--surface`,
   `--border`, and so on. Reach for a raw ramp step (`--cacti-green-700`) only
   when no semantic token fits, because only semantic tokens switch with the
   dark theme.
3. **Use the bloom accent for at most one element per view.** `--accent` is a
   highlight, never a surface or background fill. On this site it marks the
   code copy button on hover and focus only.
4. **No inline styles.** Use a class from the system. If a look is missing,
   add a variant to `cacti-mkdocs.css` instead of one-off styling.
5. **Keep focus visible.** Interactive elements keep the 2px `--focus-ring`
   outline with a 2px offset.

## Color

### Brand ramps

| Swatch | Token | Value | Role |
|--------|-------|-------|------|
| <span class="cacti-swatch cacti-swatch--green-100"></span> | `--cacti-green-100` | `#e6f2e7` | Tint surface |
| <span class="cacti-swatch cacti-swatch--green-300"></span> | `--cacti-green-300` | `#b9d96b` | Pad highlight |
| <span class="cacti-swatch cacti-swatch--green-500"></span> | `--cacti-green-500` | `#7fbf8a` | Focus ring, success, dark-theme primary |
| <span class="cacti-swatch cacti-swatch--green-700"></span> | `--cacti-green-700` | `#4e8c5e` | Primary action and links |
| <span class="cacti-swatch cacti-swatch--green-900"></span> | `--cacti-green-900` | `#2c5238` | Primary pressed |
| <span class="cacti-swatch cacti-swatch--bloom-300"></span> | `--cacti-bloom-300` | `#f7c395` | Accent tint |
| <span class="cacti-swatch cacti-swatch--bloom-500"></span> | `--cacti-bloom-500` | `#ef9a4f` | Bloom accent (sparingly) |
| <span class="cacti-swatch cacti-swatch--bloom-700"></span> | `--cacti-bloom-700` | `#c2762f` | Warning, accent pressed |

### Neutrals

| Swatch | Token | Value | Role |
|--------|-------|-------|------|
| <span class="cacti-swatch cacti-swatch--ink-900"></span> | `--cacti-ink-900` | `#101314` | Page ink, dark canvas |
| <span class="cacti-swatch cacti-swatch--ink-700"></span> | `--cacti-ink-700` | `#1c2224` | Dark surface |
| <span class="cacti-swatch cacti-swatch--ink-500"></span> | `--cacti-ink-500` | `#3b4548` | Muted text |
| <span class="cacti-swatch cacti-swatch--ink-300"></span> | `--cacti-ink-300` | `#8d9a9d` | Disabled text |
| <span class="cacti-swatch cacti-swatch--ink-100"></span> | `--cacti-ink-100` | `#dfe5e3` | Border |
| <span class="cacti-swatch cacti-swatch--paper"></span> | `--cacti-paper` | `#f7f9f6` | Light page background |

### Semantic tokens

These swatches follow the active theme. Switch between light and dark mode
in the header to see them change.

| Swatch | Token | Light | Dark | Role |
|--------|-------|-------|------|------|
| <span class="cacti-swatch cacti-swatch--background"></span> | `--background` | `paper` | `ink-900` | Page background |
| <span class="cacti-swatch cacti-swatch--foreground"></span> | `--foreground` | `ink-900` | `paper` | Page ink |
| <span class="cacti-swatch cacti-swatch--surface"></span> | `--surface` | `#ffffff` | `ink-700` | Cards, header, panels |
| <span class="cacti-swatch cacti-swatch--surface-muted"></span> | `--surface-muted` | `green-100` | `#232b2d` | Subtle fill |
| <span class="cacti-swatch cacti-swatch--border"></span> | `--border` | `ink-100` | `#303a3c` | Hairline borders |
| <span class="cacti-swatch cacti-swatch--primary"></span> | `--primary` | `green-700` | `green-500` | Primary action, links, active state |
| <span class="cacti-swatch cacti-swatch--accent"></span> | `--accent` | `bloom-500` | `bloom-500` | The single highlight per view |
| <span class="cacti-swatch cacti-swatch--muted-foreground"></span> | `--muted-foreground` | `ink-500` | `ink-300` | Secondary text |
| <span class="cacti-swatch cacti-swatch--success"></span> | `--success` | `green-700` | `green-700` | Positive status |
| <span class="cacti-swatch cacti-swatch--warning"></span> | `--warning` | `bloom-700` | `bloom-700` | Caution status |
| <span class="cacti-swatch cacti-swatch--danger"></span> | `--danger` | `#c04a3d` | `#c04a3d` | Destructive status |
| <span class="cacti-swatch cacti-swatch--focus-ring"></span> | `--focus-ring` | `green-500` | `green-500` | Focus outline |

`--primary-foreground` and `--accent-foreground` hold the text color to use on
top of `--primary` and `--accent`.

## Typography

| Token | Family | Use |
|-------|--------|-----|
| `--font-display` | Barlow 600, 700, 800 | Headings and the wordmark voice |
| `--font-body` | System sans stack | Running text and UI labels |
| `--font-mono` | System monospace stack | Code, hashes, addresses |

On this site, `h1` and `h2` use Barlow 700, `h3` and `h4` use Barlow 600, and
the site title in the header uses Barlow 800. Barlow is the only web font the
site loads.

The tokens also define a type scale (`--text-display` to `--text-caption`)
based on a 16px root. MkDocs Material uses a larger root font size, so this
site keeps Material's own heading sizes and maps only the font families and
weights. Use the type scale in other Cacti UIs.

## Spacing and radius

Spacing follows an 8pt rhythm:

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 16px |
| `--space-4` | 24px |
| `--space-5` | 32px |
| `--space-6` | 48px |
| `--space-7` | 64px |

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Small chips, swatches |
| `--radius-md` | 8px | Admonitions, code blocks, inputs |
| `--radius-lg` | 16px | Cards |
| `--radius-pill` | 999px | Badges |

Shadows come in three steps: `--shadow-sm` (cards), `--shadow-md` (raised
cards), and `--shadow-lg` (dialogs).

## Dark theme

The dark theme only re-maps the semantic tokens, so components need no
dark-specific overrides. The re-mapping applies under any of these:

- `data-md-color-scheme="slate"`: the MkDocs Material dark palette.
- `data-theme="dark"` on the root element.
- `class="cacti-dark"` on a wrapper element.

## Components

### Admonitions

Admonitions use the status colors with a 4px left border:

| Admonition types | Color token |
|------------------|-------------|
| `note` | `--primary` |
| `tip`, `hint`, `important`, `success`, `check`, `done` | `--success` |
| `warning`, `caution`, `attention` | `--warning` |
| `danger`, `error`, `failure`, `fail`, `missing`, `bug` | `--danger` |
| Others (`info`, `abstract`, `question`, `example`, `quote`) | `--muted-foreground` |

!!! note
    A note uses the primary color.

!!! tip
    A tip uses the success color.

!!! warning
    A warning uses the warning color.

!!! danger
    A danger admonition uses the danger color.

### Code blocks

Code blocks use the `ink-900` canvas and the mono stack in both themes. The
copy button turns bloom on hover and focus.

```typescript
const gateway = new SATPGateway(options);
await gateway.startup(); // starts the SATP gateway
```

### Badges

Badges use the pill style with an uppercase caption. Write them as HTML or
with the `attr_list` syntax:

```markdown
<span class="cacti-badge cacti-badge--success">Stable</span>
**Beta**{ .cacti-badge .cacti-badge--warning }
```

<span class="cacti-badge">Neutral</span>
<span class="cacti-badge cacti-badge--success">Stable</span>
<span class="cacti-badge cacti-badge--warning">Beta</span>
<span class="cacti-badge cacti-badge--danger">Deprecated</span>

### Header and tabs

The header and navigation tabs sit on `--surface`. The active tab uses
`--primary` with an underline, and every focusable element shows the
`--focus-ring` outline.

## Extending the system

1. Check whether an existing semantic token or component class already fits.
2. If not, add a token to `cacti-tokens.css`, with a dark-theme value when
   it is a semantic token, and document it on this page.
3. Add component styles to `cacti-mkdocs.css`, built only from tokens.
