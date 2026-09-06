# Design notes

How this interface is built and why. Written so a change lands consistently instead of
adding a fourth way to do something that already has three.

## Principles

Three rules that decide most arguments here, in order:

1. **Rows are rows.** A row that can wrap is not a row. Give a line one job, let the flexible
   part ellipsize, and keep the rest at their intrinsic width.
2. **Anchors do not move.** Something aligned to an edge — a badge, a date, an icon — is only
   an anchor if it is on that edge at every width. A `margin-left: auto` inside a wrapping
   line is not an anchor.
3. **Reserve space once.** Anything that changes width on hover or state reflows the text
   around it. Change the paint, not the box.

## Colour

Tokens live in [`packages/ui/src/styles/globals.css`](packages/ui/src/styles/globals.css) as
OKLCH, declared on `:root` and overridden on `.dark`. Both land on `<html>`, so a token
defined in terms of other tokens (like `--scrollbar-thumb`) resolves per theme on its own.

| Token | Light | Dark | For |
| --- | --- | --- | --- |
| `--background` / `--foreground` | 1.0 / 0.145 | 0.145 / 0.985 | Page and body text |
| `--muted` / `--muted-foreground` | 0.97 / 0.556 | 0.269 / 0.708 | Quiet surfaces, secondary text |
| `--border` / `--input` | 0.922 | 0.269 | Hairlines and field edges |
| `--primary` | orange-600 | orange-500 | Filled actions |
| `--primary-text` | orange-700 | orange-500 | Brand colour **on** a light surface |
| `--accent` | 0.97 | 0.269 | Pressed and focused menu rows |
| `--popover` | 1.0 | 0.205 | Menus, tooltips |
| `--destructive` | 0.577 27.3° | — | Danger only |
| `--ring` | = primary | = primary | Focus outline |
| `--scrollbar-thumb` | mix(muted-fg 65%, fg) | same formula | See [Scrollbars](#scrollbars) |

Two rules that are easy to get wrong:

- **`--primary` is a fill, `--primary-text` is ink.** orange-600 on white does not have enough
  contrast for text; that is what `--primary-text` (orange-700) exists for. Filled buttons use
  `--primary` as a background; anything that is coloured *text* uses `--primary-text`.
- **Use a token, not a shade.** No `text-neutral-500`. If a colour has no token it does not
  have a meaning yet, and the fix is to name it.

Motion has tokens too: `--dur-fast: 100ms` (colour, opacity), `--dur-base: 120ms`,
`--dur-move: 160ms` (anything that travels), and `--ease-out-expo` for movement. All
transitions are dropped under `prefers-reduced-motion: reduce`.

## Buttons

[`packages/ui/src/components/button.tsx`](packages/ui/src/components/button.tsx). Every button
already carries `active:scale-[0.97]`, focus rings from `--ring`, `cursor-pointer`, and
auto-sized icons — an `<svg>` with no `size-*` class of its own becomes `size-4`. Do not
re-declare those per instance.

**Variants:** `default` (filled `--primary`), `outline`, `secondary`, `ghost` (transparent
until hover — the header default), `destructive`, `link`.

**Sizes:** `xs` 24px · `sm` 28px · `default` 36px · `lg` 40px, and square `icon-xs` 24 ·
`icon` 28 · `icon-sm` 32 · `icon-lg` 40.

Pick by the row the button sits in, not by importance: the 44px app bar takes `sm` / `icon`,
the 36px pane headers take `sm` / `icon` with `size-3.5` glyphs so they sit against 13px text.

- **A link is an anchor.** `<Button asChild><a href…></Button>` renders a real `<a>` that can
  be middle-clicked and copied. A `<button>` with an `onClick` that navigates is not a link.
- **Label or `aria-label`, always one.** An icon-only button needs `aria-label`; a button with
  visible text must not have one that contradicts it. The X link in the header carries the
  handle as text precisely so the accessible name is the visible name.
- **Responsive shape comes from JS, not classes.** `useIsMobile()` decides `icon` vs `sm` and
  whether the label renders at all. Hiding the label with `lg:inline` leaves the button padded
  for text it is not showing, and puts the breakpoint in two places at once.

## Select and dropdown menu

Both are Radix wrappers with the same visual language:
[`select.tsx`](packages/ui/src/components/select.tsx),
[`dropdown-menu.tsx`](packages/ui/src/components/dropdown-menu.tsx).

- **Trigger:** `data-[size=default]:h-9`, `data-[size=sm]:h-8`, bordered, `--input` edge.
- **Content:** `--popover` surface, 1px border, `rounded-md`, `p-1`, scale+fade in and out.
- **Rows:** `py-1.5`, `rounded-sm`, `focus:bg-accent`. Grouped under a
  `DropdownMenuLabel` in `text-xs text-muted-foreground`, separated by
  `DropdownMenuSeparator`.
- **Indicator on the right.** Menu rows are `pl-2 pr-7` with the check absolutely placed at
  `right-2`. Left-hand ticks push every label off the same edge as the group headings; the
  right edge is otherwise empty, so the tick goes there.

Which control for which shape of choice:

| Shape | Use |
| --- | --- |
| One of a few, inside a menu | `DropdownMenuRadioGroup` + `RadioItem` |
| On or off, inside a menu | `DropdownMenuCheckboxItem` |
| One of a few, standing alone | `Select` |
| On or off, standing alone | `Switch` |

**The `asChild` trap.** `TooltipTrigger asChild` merges its own props onto the child and
overwrites `data-state` and `data-slot`. Wrapping a Radix control in one silently kills
`data-[state=on]` styling — the control still works, it just never looks pressed. Either wrap
in a `<span>` so the control keeps its own attributes, or style from `aria-pressed` /
`aria-checked`, which nothing else touches.

## Hit area

`hit-area`, `hit-area-2`, `hit-area-x-3`, and friends in
[`globals.css`](packages/ui/src/styles/globals.css) — after
[bazza.dev/craft/hit-area](https://bazza.dev/craft/2026/hit-area). Each adds an absolutely
positioned `::before` that extends past the element's own box, so a 24px control can answer to
a 40px target without taking 40px of layout. `hit-area-debug` paints the region while you work.

Reach for it whenever a control is smaller than about 40px: header icons, close buttons, table
row actions. Two conditions: the element needs `position: relative` (the utility sets it) and a
free `::before`. `liquid-glass` deliberately keeps its specular on `background-image` so the
two can be used together.

It cannot be used on a native scrollbar — `::-webkit-scrollbar` is a browser-drawn control,
not an element, and has no pseudo-element to give. The equivalent trick there is a transparent
border, below.

## Scrollbars

The one piece of styling that needs two implementations, because the two engines disagree about
who owns the scrollbar.

**Chrome and Safari** — `::-webkit-scrollbar`, which stops applying the moment `scrollbar-width`
is set on the element, so that branch resets it to `auto` first.

- The bar reserves **14px and never changes**, so text never reflows.
- The thumb is painted **4px** inside it by a 5px transparent border with
  `background-clip: padding-box` — the element still owns those pixels for hit testing, so the
  target is 14px wide while reading as a hairline. This is hit-area, by the one route a
  browser-drawn control allows.
- Hovering or dragging the thumb narrows the border to 3px, thickening the paint to 8px. The
  *gutter* itself does not grow — widening it on `*:hover` reflows the text in every pane the
  pointer crosses, which is rule 3.
- `min-height: 44px` on the vertical thumb (and `min-width` on the horizontal), so a long
  document cannot shrink the target to a sliver.

**Firefox** — `scrollbar-width` and `scrollbar-color`, and nothing else. No pseudo-elements, no
hover state, no per-pixel width.

- `scrollbar-width: auto`, not `thin`: width is the only hit area Firefox offers.
- `scrollbar-color: var(--scrollbar-thumb) transparent` — the transparent track is what keeps
  the reserved width invisible. With `auto` colours you get the grey OS gutter down the side of
  the page.
- Firefox derives its hover and drag colours from the one you give it and washes them toward
  the page, and there is no way to override them. `--scrollbar-thumb` therefore starts with
  more contrast than the resting bar needs: `mix(--muted-foreground 65%, --foreground)`, which
  darkens in light (0.556 → 0.412) and brightens in dark (0.708 → 0.805).

**Telling the engines apart.** Not with `@supports selector(::-webkit-scrollbar)` — Firefox 153
answers **true** to that, and to `-webkit-appearance` and
`@media (-webkit-min-device-pixel-ratio: 0)` as well. Measured against Firefox 153 and Chrome
148, the only query that still separates them is `-moz-appearance`, so the WebKit block is
`@supports not (-moz-appearance: none)`. If a future Chrome ever aliases it, Chrome falls back
to the standard thin bar: narrower styling, nothing broken.

`html { overflow: clip }` belongs to this section too. The app is a shell the height of the
window whose panes scroll inside themselves, so the page itself never scrolls. It is `clip`
rather than `hidden` because `hidden` leaves a scroller the browser can still scroll to reach a
focused node — and because libraries that measure by appending to `<body>` (mermaid) would
otherwise put a scrollbar down the side of the whole site while they work.

## Cards in the document

Document styling lives in [`packages/markdown/prose.css`](packages/markdown/prose.css), shared
by the preview, the HTML the worker prints, and the PDF.

**Reference card** (`a.ref`) — GitHub and GitLab issues, PRs and MRs. Three left-aligned rows,
each locked to one line:

```
GitHub · owner/repo#123                    ● Open     ← source, state anchored right
Release v0.13.11 — Billing wallet floor…              ← title, clamped to 2 lines
Pull request · github-actions[bot]   6 Sept 2026      ← kind, author, date anchored right
```

The repo path and the author ellipsize; the state badge and the date hold the right edge. That
is rule 1 and rule 2 in one component.

**Link card** (`a.embed`) — any other bare URL, built from the page's Open Graph tags. Title,
two-line description and the URL on the left; the image holds the right 30%, absolutely
positioned so its intrinsic height cannot dictate the card's. The card is its own
`container-type: inline-size`, and under 420px the image squares off in the corner — a
container query, not a viewport one, because the card lives in a pane, not a page.

**On paper** both cards drop their ellipsis: print has no hover and no tooltip, so a truncated
repo path is text the reader can never recover. The title unclamps, the source wraps, the date
moves to its own line, and `break-inside: avoid` keeps a card whole.

## House rules

- Tokens over literal colours; if it needs a new colour, name it first.
- One control per job — check the table above before adding a fourth toggle shape.
- A control smaller than ~40px gets `hit-area`.
- Never change the width of something text flows around in response to hover.
- Icon-only means `aria-label`; visible text means no competing label.
- Anything with a `data-state` that lives inside `asChild` needs checking in the DOM, not
  assumed from the source.
