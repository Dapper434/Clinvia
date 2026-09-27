---
name: Clinvia
description: Hospital management and TB care
colors:
  teal: "#0E7C70"
  teal-deep: "#0A6259"
  teal-wash: "#E3F1EE"
  indigo: "#3E53A6"
  indigo-wash: "#E8EBF7"
  red: "#B83A26"
  red-wash: "#FBEAE6"
  amber: "#A26612"
  amber-wash: "#FBF1DF"
  facility-blue: "#2F6FB5"
  ink: "#16302B"
  ink-2: "#4D625D"
  ink-3: "#7F918C"
  paper: "#F4F6F5"
  surface: "#FFFFFF"
  line: "#DCE4E1"
  line-2: "#EAF0EE"
  field-muted: "#A8BDB8"
  field-text: "#DDE8E5"
  field-soft: "#C9D8D4"
  field-faint: "#7F9A94"
  field-raised: "#20403A"
  placeholder: "#5E736E"
  cell-taken: "#3FB2A2"
  cell-patient: "#93A2EA"
  cell-missed: "#F07A62"
  band-good: "#7FD6C8"
  band-fair: "#F3C173"
  band-poor: "#F7A08E"
typography:
  display:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 2.4vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.6rem, 1.3rem + 1vw, 2.1rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  section:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  choice:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  micro:
    fontFamily: "Instrument Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11.5px"
    fontWeight: 400
rounded:
  swatch: "2px"
  cell: "3px"
  control: "8px"
  panel: "10px"
  feature: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  page-x: "32px"
  page-x-narrow: "16px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
    typography: "{typography.label}"
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-primary-hover:
    backgroundColor: "{colors.teal-deep}"
  button-small:
    padding: "4px 10px"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal-deep}"
  pill-next:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.teal-deep}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-patient:
    backgroundColor: "{colors.indigo-wash}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-missed:
    backgroundColor: "{colors.red-wash}"
    textColor: "{colors.red}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-watch:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "18px 20px"
  attention-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.feature}"
    padding: "22px 24px"
  segmented-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  entry-field:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  entry-choice-title:
    textColor: "{colors.ink}"
    typography: "{typography.choice}"
  entry-choice-hover:
    backgroundColor: "rgba(227,241,238,0.45)"
    textColor: "{colors.teal-deep}"
  entry-date:
    backgroundColor: "rgba(255,255,255,0.028)"
    textColor: "{colors.field-text}"
    rounded: "{rounded.control}"
  entry-date-selected:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.field-text}"
    rounded: "{rounded.control}"
  entry-date-today:
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "26px"
  entry-dose-dot:
    backgroundColor: "{colors.cell-taken}"
    rounded: "{rounded.pill}"
    size: "6px"
  entry-streak:
    backgroundColor: "rgba(240,122,98,0.12)"
    rounded: "{rounded.control}"
  entry-patient-step:
    textColor: "{colors.field-soft}"
    rounded: "{rounded.pill}"
    size: "28px"
  entry-progress-mark:
    backgroundColor: "rgba(255,255,255,0.18)"
    rounded: "{rounded.pill}"
    size: "6px"
  entry-progress-mark-active:
    backgroundColor: "{colors.cell-taken}"
    rounded: "{rounded.pill}"
    width: "22px"
    height: "6px"
  entry-grid-surface:
    backgroundColor: "rgba(255,255,255,0.01)"
    rounded: "{rounded.feature}"
  entry-event:
    backgroundColor: "{colors.field-raised}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.panel}"
    padding: "11px 14px"
  entry-signal:
    textColor: "{colors.teal}"
    height: "24px"
    width: "420px"
  entry-signal-alert:
    textColor: "{colors.red}"
---

# Design System: Clinvia

## Overview

**Creative North Star: "The Dose Ledger"**

Clinvia is a working ledger for a clinic: pale green-grey paper, white cards drawn with hairline rules, deep ink-green text, and one clinical teal for the thing you should do next. Everything is set in a single sans (Instrument Sans) with tabular numerals, because most of what the screen says is a count, a time, a code or a percentage. Density is office-grade: 14px body, 13px secondary text, tables with 9px cell padding, panels with 18 to 20px of padding and a 22px rhythm between blocks.

The world's one recurring picture is the dose calendar: a row of small rounded cells per patient, each one a day, coloured by what happened (observed by staff, checked in by the patient, missed, not logged yet). It appears light, as a strip in tables and a month grid on the patient record, and dark, inside the ink-coloured needs-attention panel on the dashboard. The public entry pages (landing and sign-in) stand on a large version of the dark form: four sample patients in rotation, each shown as their last 30 days on a real Monday-first calendar of the current month, each date carrying its number and one small dot for what happened with the dose. A patient's month plays in day by day, the adherence figure recalculates as it goes, and when the clinic rule catches a missed streak a coral band runs through those dates; below the calendar that patient's event for today arrives in a feed, with the detection above it when the patient is flagged. The month then holds for 7 seconds, fades, and the next patient follows; the rotation loops, and holds still while the visitor is reading it. Motion in this world is the data arriving, never ornament laid over it. Out of the brand mark runs a faint live signal line, drawn left to right and drifting slowly, mostly flat, that changes pattern with the field's story (a busier monitoring stream while each month plays, a double pattern for a missed dose, a red attention pattern for the flag, then a settle back to calm). Its idle stream, continuous travel but mostly flat baseline with designed pauses, is not data, and the brief asked for it: a live signal, not a heart monitor. While a finished month holds, two more quiet movements keep the field alive, also asked for: the surface under the calendar breathes very slowly and the fine teal ring around today's date pulses. The line and the calendar are linked: when the idle line draws a small pattern, the calendar answers at most once every 12 seconds by lighting the last week's dose dots in turn, today last, so the page reads as signal, then detection, then event.

Darkness is reserved, not decorative. The staff app is light; ink-filled surfaces mark the one place that demands attention (the needs-attention panel), the selected state of a segmented control or week-day, the toast, and the entry field. Colour otherwise carries meaning only: teal for taken and next, indigo for anything the patient reported, red for missed and overdue, amber for watch and reserved.

**Key Characteristics:**
- One sans family, weights 400/500/600, tabular numerals throughout.
- Hairline borders (1px, `line`) on white cards over `paper`; almost no shadows.
- Semantic colour pairs: a strong hue for text and fills, a pale wash for backgrounds.
- The dose calendar as the signature data form: strips and month grids, in light and dark variants.
- Ink-dark panels for attention, never for ornament.

## Colors

A cool, desaturated green-grey neutral base with one teal action colour and three semantic signal hues, each paired with a wash.

### Primary
- **Clinical Teal** (teal): primary buttons, active links, focus rings, taken-dose cells in light contexts, the "next" pill, today's marker, and the entry signal line (30% opacity when idle). **Deep Teal** (teal-deep) is its hover and its text colour on teal-wash. **Teal Wash** (teal-wash) backs the active nav item, the current table row, occupied beds, the brand mark and avatars.

### Secondary
- **Patient Indigo** (indigo, indigo-wash): reserved for data that came from the patient: patient check-in days on the calendar, the patient pill. On the dark field it lightens to **Check-in Periwinkle** (cell-patient).

### Tertiary (signals)
- **Missed Red** (red, red-wash): missed doses, overdue, danger buttons, required-field asterisks, nav count badges, alerts, and the entry signal line's attention pattern at the flag (`--ls-alert`). On dark it becomes **Missed Coral** (cell-missed).
- **Watch Amber** (amber, amber-wash): reserved beds, amber alerts, the watch pill.
- **Facility Blue** (facility-blue): health-facility markers and their legend on the case map only.

### Neutral
- **Ledger Ink** (ink): primary text; also the fill of every dark surface (attention panel, entry field, selected segment, toast).
- **Ink 2** (ink-2): secondary text, leads, nav items at rest.
- **Ink 3** (ink-3): muted metadata, table headers, sub-labels, chart text.
- **Paper** (paper): app background, hover fill for rows and nav, weekend days.
- **Surface** (surface): cards, panels, inputs, sidebar, top bar.
- **Line** (line) and **Line 2** (line-2): hairline borders and inner dividers; line-2 is also the empty track colour for bars and light strips.
- **Field Muted** (field-muted) and **Field Text** (field-text): secondary and body text on ink surfaces. **Field Soft** (field-soft) is the one step between them: the dose field's patient arrows, and the bolded code of a pending event (today's dose not in yet). **Field Faint** (field-faint) is the "no data yet" adherence figure (the em dash before the first day is logged).
- **Field Raised** (field-raised): the one lifted tone on ink, the fill of the dose field's event cards; a lighter ink rather than a white alpha, so the card reads as a solid object arriving on the field.
- **Placeholder** (placeholder): input placeholder text in the entry frame. It sits darker than ink-3 on purpose: ink-3 on white is about 3.3:1, placeholder about 4.9:1, so hint text stays legible at 15px.

### Dark-field data colours
On ink surfaces the calendar uses brighter tints so cells read against the dark: cell-taken, cell-patient, cell-missed, and an empty cell at 9 to 14% white (9% is the dose field's not-yet-arrived dot). Adherence bands on dark are band-good (≥80%), band-fair (60 to 79%) and band-poor (<60%). In the dose field's event cards the patient code is bolded in the colour of what happened: band-poor for a flag, cell-patient for a check-in, cell-taken for a staff-observed dose, field-soft for a pending one.

### Named Rules
**The Meaning-Only Colour Rule.** Teal, indigo, red and amber each mean one thing (taken or next; patient-reported; missed or overdue; watch or reserved). Never use them decoratively, and never swap one for another.

**The Indigo Belongs to the Patient Rule.** Indigo appears only on data the patient reported themselves. Staff-observed data is teal.

**The Wash Pair Rule.** A signal colour on a light surface appears as text on its own wash (red on red-wash), never as a saturated block with white text, except primary buttons and the toggle's selected state.

## Typography

**Display Font:** Instrument Sans (with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Instrument Sans
**Label/Mono Font:** none distinct; numerals are tabular via `font-variant-numeric: tabular-nums` on the `.cv` scope.

**Character:** One grotesque-leaning sans doing every job, tightened with negative tracking as size rises. Plain and factual, like the product's voice.

### Hierarchy
- **Display** (600, clamp 2rem to 3.25rem, 1.04, -0.035em): the landing page headline only; balanced wrap.
- **Headline** (600, clamp 1.6rem to 2.1rem, 1.1, -0.025em): sign-in page titles.
- **Count** (600, 44px, line-height 1, -0.02em): the needs-attention count. **Metric** (600, 28px, -0.02em): stat-strip figures, with a 15px ink-3 unit, and the dose field's adherence figure in its band colour.
- **Title** (600, 20 to 24px, -0.015 to -0.02em): top-bar page title (20px), patient header name (24px), attention panel heading (22px), drawer title (17px).
- **Section** (600, 15px, -0.01em): panel and fieldset headings.
- **Body** (400, 14px, 1.5): default; leads cap at 70ch in the app and 42ch on entry pages (15.5px, 1.55).
- **Label** (500, 12 to 13px): nav, buttons (13px), field labels (13px), table headers (12.5px, ink-3), pills (12px), legends (12px).
- **Micro** (11.5px): the smallest step, for count badges in the nav (500, white on red), bed sub-labels (ink-3), the dose field's weekday row (500), its Today pill (500, band-good) and its sample-data disclaimer. Nothing that must be acted on sits at this size.
- **Entry choice title** (600, 16px, -0.01em): the one step between section and title, used for the landing page's entry rows.

### Named Rules
**The Tabular Rule.** Numbers line up. Tabular numerals are on for the whole scope; do not turn them off for counts, times, codes or percentages.

**The Sentence-Case Rule.** Labels, headings and table headers are sentence case at normal tracking. The staff system has no uppercase tracked labels.

## Layout

The staff app is a two-column grid: a 232px sticky white sidebar and a main column with a sticky white top bar (16px 32px padding) over a `page` column (24px 32px 56px padding, max-width 1360px) that stacks blocks with a 22px gap. Content grids use 2:1, 1:1 and 1:2 splits at 22px gaps; the stat strip is a single bordered card divided into 5 (or 4) cells.

Breakpoints: at 1180px content grids collapse to one column, the stat strip goes to 3 (or 2) columns and the attention panel stacks. At 860px the sidebar becomes an off-canvas drawer (260px, slide transform 0.2s), side padding drops to 16px, forms go single-column, and the calendar tightens to 4px gaps with markers hidden.

Entry pages (landing and sign-in) use their own frame: on desktop the ink dose field takes the left column (1.3fr) and content sits right (1fr) on paper, with the content body vertically centred at max 440px and padding clamp(24px, 5vw, 72px). Under 900px the frame goes content first, field below; the calendar header restacks (title, then the patient nav, then the figure with the progress marks beside it), weekday and date gaps tighten from 6px to 4px, dates go to a 1/.92 aspect, and the feed drops its reserved height. The calendar keeps all seven columns at every width.

Spacing rhythm, as used: 6px (cell and pill gaps), 10px (nav and control gaps), 14px (field gaps, panel header margin), 18 to 22px (panel padding and block gap), 32px (page side padding, entry form offset).

## Elevation & Depth

Flat by default. Depth comes from tonal layering (white surface on paper, ink panels on light) and 1px hairlines, not shadows. Shadows exist only on things that float above the page or arrive on it: the drawer, the open mobile sidebar, the toast, and the event cards that drop into the dose field. Focus is an outline, not a glow, except in the entry frame's inputs.

### Shadow Vocabulary
- **Overlay edge** (`box-shadow: -12px 0 40px rgba(22,48,43,.18)`): the right-hand drawer; mirrored (`12px 0 40px`) on the open mobile sidebar. Pairs with a scrim of `rgba(22,48,43,.35)`.
- **Toast lift** (`box-shadow: 0 8px 24px rgba(22,48,43,.25)`): the bottom-centred ink toast.
- **Event lift** (`box-shadow: 0 6px 18px -10px rgba(0,0,0,.55)`): the dose field's event cards, a tight negative-spread shadow in pure black because it sits on ink, where an ink-tinted shadow would vanish.
- **Entry focus halo** (`box-shadow: 0 0 0 3px rgba(14,124,112,.16)`): entry-frame inputs on focus, with a teal border.

### Named Rules
**The Hairline Rule.** Cards, panels, inputs and tables are separated by 1px `line` borders. If something needs to stand apart, change its fill (paper, wash, ink) before reaching for a shadow.

**The Floating-Only Shadow Rule.** A shadow means the element sits above the page or has just arrived on it as an event (drawer, off-canvas nav, toast, dose-field event card). Resting cards never carry one.

## Shapes

Gently rounded throughout. Controls (buttons, inputs, selects, nav items, calendar days, beds, time slots) use 8px. Cards, panels, fieldsets, alerts and the map use the 10px `--r`. The ink attention panel is the one 14px surface; the dose field's breathing grid surface borrows that radius, since it is the same attention family on the same ink. Pills, count badges, adherence tracks and the entry choice arrows are fully round. Dose cells in strips use 3px, as does the headline highlight mark (2px `swatch` in legends and bed bars), keeping them tile-like rather than dot-like; the dose field's dates are 8px calendar days like the month grid's, and its streak band rounds its ends to match. The brand mark is an 8px tile; its flash is a box-shadow ring that follows that 8px radius. The signal line is a hairline: 1.2px butt-capped, round-joined strokes (1.35px for event patterns). Avatars, status dots and the dose field's single-fact marks are circles: the 26px date number, the 6px dose dot, the 8px legend dots, the 28px patient arrows and the 6px progress marks (the current patient's a 22px capsule).

Dashed borders are part of the language: a dashed cell or day means "not logged yet"; a dashed bed means available; a dashed box is the empty state. Diagonal hatching (repeating 45deg stripes) marks beds being cleaned.

## Components

### Buttons
Quiet, compact and bordered; the primary is the only filled one.
- **Shape:** 8px radius, 8px 13px padding, 13px weight-500 label, 7px icon gap, no wrapping.
- **Default:** white surface, 1px line border, ink text; hover darkens the border to ink-3.
- **Primary:** teal fill and border, white text; hover to deep teal. In the entry frame it grows to 11px 18px at 14px.
- **Danger:** red text with a light red border.
- **Small:** 4px 10px at 12.5px. **Disabled:** 45% opacity, not-allowed cursor.
- **Link:** deep-teal, weight 500, underlined 3px below with a 35% teal underline that goes solid on hover.

### Chips (pills)
- **Style:** fully round, 2px 9px, 12px weight 500, text on its own wash (done: ink-2 on line-2; next: teal; patient: indigo; missed: red; watch: amber). The staff variant drops the background and uses ink-3.
- **Dark tag:** on ink surfaces, a transparent pill with a 25% white border and field-text.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** surface on paper.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px line.
- **Internal Padding:** 18px 20px; headings at 15px with a right-aligned ink-3 meta line, 14px below.
- **Alerts:** same shape on red-wash or amber-wash with a matching tinted border, the key fact bolded in the signal colour, action buttons on white.

### Inputs / Fields
- **Style:** white, 1px line border, 8px radius, 9px 11px padding; labels 13px weight 500 above with a 5px gap; hints 12px ink-3; required asterisk in red. Selects carry an inline chevron in ink-3.
- **Focus:** 2px teal outline at 0 offset plus a teal border. In the entry frame: no outline, teal border and a 3px 16% teal halo, 15px text, placeholder `#5E736E`.
- **Error:** a red message line beneath the form (`warn`).
- **Global focus:** everything else gets a 2px teal outline, 2px offset, 4px radius.

### Navigation
- **Sidebar:** white, hairline right border, 20px 14px padding. Group labels 12px ink-3 weight 500 (sentence case). Items 8px 10px, 8px radius, ink-2 weight 500; hover to paper fill and ink; active on teal-wash with deep-teal text. Counts sit right as a red round badge (11.5px, white).
- **Top bar:** sticky, white, hairline bottom border; 20px weight-600 title with a 14px ink-3 suffix; actions right. Under 860px a menu button appears and only primary actions remain.
- **Segmented control:** one bordered 8px group; the selected segment fills ink with white text.

### Tables
13px text, 12.5px ink-3 weight-500 headers over a line rule, 9px 10px cells divided by line-2, no wrapping, horizontal scroll in a wrapper. Clickable rows fill paper on hover; the current row fills teal-wash; done rows drop to ink-3.

### Drawer
Right-hand sheet, min(460px, 100%) wide, white, overlay-edge shadow over an ink scrim. Header, scrolling body (20px 22px, 16px gap) and a right-aligned footer, each divided by hairlines. Fields go single-column inside.

### Dose Calendar (signature)
The system's own data form, in four forms that share one cell vocabulary (taken, patient check-in, missed, not logged yet):
- **Light strip:** 9x16px cells, 3px radius, 4px gap; teal, red, line-2 empty, dashed ink-3 for not logged.
- **Month grid:** 7-column calendar of 8px-radius day tiles (min 50px) on washes: teal-wash taken, indigo-wash patient check-in, red-wash missed, dashed line for not logged; a summary row of 18px figures below.
- **Dark strip:** 12x22px cells on ink with the dark-field tints; empty cells at 14% white, not-logged as a dashed 35% white outline.
- **Dark month grid:** the entry dose field (below): a Monday-first 7-column month of 8px-radius dates, each a number over a 6px round dose dot in the dark-field tints.

### Needs-Attention Panel (signature)
The one ink surface in the staff app: 14px radius, 22px 24px padding, a 230px head column (44px count, 22px heading, field-muted note) beside rows split by 10% white rules. Each row: patient name as an underlined white link, a field-text reason with the key fact bolded white, a dark dose strip, and a dark tag.

### Entry Frame and Dose Field (entry surface extension)
Landing and sign-in only. The content column carries a brand row (`.entry-top`: the brand lockup, then the signal line, 16px apart), a display or headline title, a lead, then either a list of entry rows or the sign-in form, and a small ink-2 footer. Entry rows are full-width links between hairlines (16px weight-600 title, 13px ink-2 description) with a 32px round arrow button; the primary row's title is deep teal. On hover the row takes a 45% teal-wash tint and a 28% teal bottom border, its title turns deep teal (all 0.2s), and the arrow fills teal and moves 5px right (0.25s ease-out). Hover styles sit inside `@media (hover: hover)` so touch devices never keep a sticky hover; keyboard `:focus-visible` keeps the arrow state (teal fill, 5px move).

Press states: the entry arrow keeps its 5px move and shrinks to 90% while pressed (0.1s); the entry frame's primary button scales to 97% on press (0.12s). Placeholders use `placeholder`.

The dose field is the dark month grid at scale, rotating through four sample patients (`PATIENTS` in `doseCalendar.js`, in order: P-0219, flagged at 57%; P-0142, 97% on track, staff-observed; P-0187, 97%, patient check-ins; P-0203, 79% watch, today not logged), each over the last 30 days ending today: an ink panel with a faint teal radial glow from the top-right corner holding a `figure` at most 560px wide, its parts 16px apart (14px under 900px). Calendar CSS lives in `dose-calendar.css` (`entry.css` is the frame only); dates and sample data come from `doseCalendar.js` (date-fns); the clock is `usePatientRotation.js`.
- **Header** (a 2x2 grid, 12px 16px gaps): the title (15px weight 600, "TB dose calendar") with a 12.5px field-muted "September 2026 · last 30 days" (the current month); at right the patient nav, two 28px round icon buttons (1px 10% white border, field-soft, the shared `Left`/`Right` icons, labelled "Previous patient" and "Next patient") around the patient code in 13.5px weight-600 white (min 64px, centred, `aria-live="polite"`). The arrows wrap around the four patients and are never disabled. Below the title, the adherence figure in Metric (28px, NumberFlow) in its band colour, then 12.5px field-muted "adherence · " and the band word in its band colour at weight 500 (on track, watch, follow up; nothing while there is no data). At right, the progress marks (`aria-hidden`), one per patient, 5px apart: 6px round dots in 18% white; the current patient's is a 22px capsule in 14% white holding a cell-taken fill that scales across it, left to right, over the 7s hold (see Motion). The width change is not transitioned; only the mark's background eases (0.3s).
- **Weekday row:** Mon to Sun, 11.5px weight 500 in #8FA8A2, centred over the columns 8px above the dates, sentence case, hidden from assistive tech.
- **Dates:** a Monday-first 7-column grid with 6px gaps that opens on the week the 30-day window begins, so every day that counts is on screen; days from the previous month show as "29 Aug" in a smaller 11.5px #8FA8A2 number, with a 1.8% fill when inside the window. Each date is a button, aspect 1/.8, 8px radius, 1px transparent border, holding a 26px round number (13px weight 500, tabular) over a 6px round dose dot, 5px apart. Dates inside the 30 days take a faint 2.8% white fill and field-text numbers; dates outside it have no fill, a dim #6F8A84 number and no dot. The dot is the day's code: `t` staff-observed (cell-taken), `p` patient check-in (cell-patient), `m` missed (cell-missed), `.` not logged yet (a 1px 50% white ring, no fill); before its day arrives it waits at 60% size in 9% white. Dates after today sit outside the window. Selected: 26% white border and 5% white fill. On hover-capable devices (`@media (hover: hover)`) any date takes a 7% white fill, a 14% white border and scales to 103%.
- **Today:** a 1px cell-taken ring around the number, which turns white. There is no column marker and no "Today" label on the grid; the word appears only in the detail line.
- **Missed streak:** once the rule flags (`.has-flag`), a coral band runs through the streak's dates behind their numbers and dots: 12% coral fill between 45% coral top and bottom rules, reaching 3px into the gaps (2px under 900px) so the dates read as one band. The streak's first and last dates close it with a 45% coral side rule and 8px rounded ends, and it breaks and re-rounds at the week edges (Monday and Sunday columns).
- **Grid surface:** `.df-grid::before`, a barely-there panel behind the calendar reaching 12px above and below and 14px to either side, 14px radius, 1% white fill with a 1px 2.2% white inset line. At rest it is nearly invisible; it exists to breathe while a finished month holds (see Motion). The dates sit above it and never scale with it.
- **Selected-date detail:** one 13px field-text line under the calendar (min-height 20px): the date in white 600 ("27 Sep"), a Today pill when it is today (11.5px weight 500, band-good text, 45% teal border, fully round, 1px 8px padding), a 7px dose dot, and the status in words ("Dose observed by clinic staff", "Checked in from their phone", "Missed · no dose logged", "Not logged yet", or "Outside this 30-day view"). It opens on today.
- **Keyboard and semantics:** the month's dates are one roving tab stop (the selected date, or the 1st when the selection is outside the shown month); arrow keys move a day or a week and stop at the month's edges; Enter or Space selects. The selection persists across patients, and the detail line re-enters for each patient. Each date carries `aria-pressed` for selection, `aria-current="date"` for today and a full label ("Sunday 27 September, today: Missed · no dose logged"). The figure is labelled "Sample TB dose calendars, rotating through patients"; the dates group is labelled with the patient code and month. Focus is a 2px cell-taken outline at 2px offset on dates and arrows.
- **API:** `DoseField` takes `onFlagChange(isFlagged)` and `onStory(event)`; its ref exposes `sync()`, which plays the signal-sync response once and returns `true` only during a patient's hold, and otherwise (filling, fading, under reduced motion, before mount) does nothing and returns `false`. The caller records a sync time only on `true`, so a refused sync doesn't use up the 12s window.
- **Event feed:** the current patient's clinic events, in two slots and never more: the detection first, only for a flagged patient ("P-0219 missed 4 doses in a row. They're on today's needs-attention list."), then that patient's own event for today, which arrives once the fill ends and stays through the hold and fade. Each patient carries one event and a tone: pending (P-0219, "dose reminder sent · 07:00 · no check-in yet"; P-0203, "today's dose not logged yet · reminder sent 07:00"), observed (P-0142, "dose observed by clinic staff · 07:34"), checkin (P-0187, "checked in today's dose from their phone · 07:12"). The vocabulary stays clinic dose events: observed, check-in, pending, missed, flagged. Cards are `entry-event`: field-raised, 1px 10% white border, the lift shadow, 13.5px field-text, the code bolded in its tone colour (band-poor flag, cell-taken observed, cell-patient checkin, field-soft pending), a time after a middle dot. The feed is `aria-live="polite"` and reserves 96px so nothing below it jumps.
- **Close:** a legend of three 8px round dots (observed by staff, patient check-in, missed; 12px field-muted, 7px dot gap, 18px between items) and an 11.5px sample-data disclaimer in #8FA8A2.

The headline and the field are linked: the landing title wraps its key word in `<mark class="entry-mark">`, and when the field flags a streak the frame takes `.is-flagged` and the mark sweeps a red-wash highlight under the word (left to right, 80% height, 3px radius, a slight overshoot at the end) as the text turns red. It fires only while a flagged patient is on show and clears when the rotation moves on. This is the Meaning-Only Colour Rule applied to type: the word goes red because something was missed.

### Entry Signal (`LiveSignal`, `.entry-signal`)
A reusable live-signal line (`src/components/auth/LiveSignal.jsx`, `liveSignalEngine.js`, `live-signal.css`): a visual metaphor for continuous monitoring, not a cardiac trace. It is the lowest layer in the entry frame's hierarchy and decorative to assistive tech (`aria-hidden`).
- **Anatomy:** a 24px-tall `.ls` strip (overflow hidden) holding a `.ls-track` of SVG pattern segments laid edge to edge. Segments are emitted at the left, at the brand mark (the pen), and the track drifts right at 56px/s; segments past the right edge are pruned, so only about 2 to 6 segment nodes exist at once. Each segment is 24px tall with its baseline at y=12, starts and ends on the baseline, and overlaps its neighbours by 0.6px so joins never show; strokes are `currentColor`, 1.2px (1.35px for event tone), butt caps, round joins, non-scaling. The right 38% fades out through a mask (solid to 62%), so the line trails off rather than stopping. The first frame is prefilled with baseline so the line is present immediately.
- **Pattern library (`PATTERNS`):** baseline 40px, single 72, double 92, rhythmic 132, rapid 100, long 120, attention 176, each spanning its full width baseline to baseline. `rapid` is in the library but no cycle or event uses it yet.
- **States:** `idle` (the calm-heavy default cycle: single, double and long among long runs of baseline), `monitoring` (baseline, single, rhythmic and double, still mostly flat), `anomaly`, `attention` and `settling` (baseline only, so the event pattern stands alone). State sets presence through opacity (see the Lowest-Voice Rule) and is written to `data-state`.
- **Story events (`story(event)` on the ref):** `start` puts idle or settling into monitoring; `missed` (only while monitoring, throttled to one per 1.8s) queues a `double` in event tone, enters anomaly and returns to monitoring 0.9s after it starts drawing; `flag` queues the `attention` pattern in alert tone (`--ls-alert`, red), enters attention, moves to settling 1.6s after it starts, then draws 5 calm baseline segments and returns to idle; `reset` (sent at each patient's fade) clears the queue and goes to idle. When an event arrives while a flat baseline is being drawn, that baseline is cut at the pen so the event starts drawing immediately.
- **Engine:** plain DOM and one `requestAnimationFrame` loop that writes only the track's `transform` (frame delta capped at 50ms); an IntersectionObserver stops it offscreen, and the browser suspends it in a hidden tab.
- **Props and API:** `state` (optional, sets the state directly), `onEmit(pattern, tone)` (called when any non-baseline pattern starts drawing, calm ones included; tone is `calm`, `event` or `alert`), `className`; the ref exposes `story(event)` and `setState(state)`.
- **CSS variables:** `--ls-color` (default `--teal`), `--ls-alert` (default `--red`), `--ls-amp` (vertical amplitude, 1; 0.7 under 900px). No ground colour is needed; segments draw only strokes.
- **Placement:** in `.entry-top` it starts at the brand mark (the mark is the line's origin), grows to fill the row (`flex: 1`, min 48px, max 420px), is about 97px wide at a 390px viewport, and is hidden under 360px.
- **Wiring on the entry surface:** for each patient, DoseField calls `onStory('start')` on day 1 of the fill, `onStory('missed')` on each filled day that is a missed dose (the engine throttles these to one per 1.8s), `onStory('flag')` only when the patient is flagged (P-0219), and `onStory('reset')` at each fade; none fire under reduced motion. EntryLayout forwards them to `story()` and routes `onEmit`: event and alert tones flash the brand mark; calm patterns call the field's `sync()`, at most once every 12s (`SYNC_MIN_GAP_MS`).

### Motion (entry surface)
The entry field is the one place with orchestrated motion, and every movement in it is a state change in the sample data, driven by the same rules the product uses (30-day adherence, missed streak of 2 or more). One hook (`usePatientRotation`) owns the timeline: a single 60ms interval drives fill and fade, and the hold counts down in a ref so it doesn't re-render.
- **The rotation:** P-0219, P-0142, P-0187, P-0203, then back to P-0219, forever. Each patient runs fill (300ms start, then one day every 60ms, about 2.1s in all), hold (7s), fade (300ms: calendar, detail line and feed to opacity 0 over 0.28s), then the next patient's fill begins. The hold counts down only while the visitor isn't hovering over the calendar or focused inside it; fill, hold and fade all stop while the tab is hidden or the calendar is offscreen (IntersectionObserver plus `visibilitychange`). There is no pause button: that was the user's explicit choice, and hover or focus stands in for it. This is honest about its limit: an auto-advancing carousel lasting more than 5 seconds needs an explicit pause, stop or hide control under WCAG 2.2.2, and hover/focus pausing falls short of that.
- **Patient arrows:** Previous and Next wrap around and cut straight to the chosen patient's fill (no fade); the code between them is announced politely.
- **Progress marks:** the current mark's teal fill scales from 0 to full, left to right, linearly over the 7s hold (`df-hold`, `--hold`), pauses with the rotation (`.is-paused` sets `animation-play-state: paused` when held, hidden or offscreen), sits full during the fade and empty during the fill. No width transition between the 6px dot and the 22px capsule.
- **A patient's month:** each date's dot waits at 60% size in 9% white and on its day takes its colour (0.35s) and full size (0.45s, `cubic-bezier(.16,1,.3,1)`, the frame's expo-out). While the month fills, the newest date (the fill head) carries a 30% white border. A missed dot sends a single coral ripple outward as it lands (0 to 6px, 0.7s). The adherence figure recomputes each day and rolls to its new value with NumberFlow (750ms, the same expo-out); the band colour follows (0.4s).
- **The flag:** not scheduled; it appears the moment the live missed-streak rule (2 or more in a row) trips, which in the rotation is only P-0219. The streak band draws with it, left to right: a `df-band` keyframe on the band's pseudo-element (clip-path, 0.45s expo-out, each date 90ms after the one before via `--si`), so each date joining the streak draws its own piece. The flag card rises into the feed after a 0.55s delay (0.7s), and the headline mark sweeps in: background 0.8s on `cubic-bezier(.34,1.35,.64,1)`, a deliberate slight overshoot the brief asked for and used nowhere else; colour 0.35s. Both clear when the next patient begins.
- **Today's event:** when the fill ends, the patient's own event card rises into the feed.
- **Resting life:** while a finished month holds (`.is-done`, day 30 and not filling), the grid surface breathes: scale 1 to 1.015 and back, fill 1% to 2.2% white, inset line 2.2% to 4.5%, and a faint teal glow (0 0 28px -6px at 12%) at the peak; 3.6s ease-in-out, infinite. On the same 3.6s cycle today's number pulses: its ring goes from 50% to full teal with a 10px 22% teal glow, and the 26px circle scales to 101.5% at the peak. Both stop when the next fill starts. Only the surface and today's number move; dots, other dates and figures never scale. Both run only under `no-preference`.
- **Signal sync:** when the idle line starts drawing a calm pattern, EntryLayout calls `sync()` (at most once every 12s), and the field answers once, only during a patient's hold: after 220ms the last seven revealed dose dots (the last week, today last) light in turn, 70ms apart, each 900ms ease-out: brightness 1.5 and a 3px 14% white ring at 35% of the run, then back (WAAPI). No colour changes and nothing persists. It never fires during a fill or fade, or under reduced motion.
- **Direct manipulation:** date hover and selection ease fill and border over 0.2s and the hover scale on the expo-out; the detail line re-enters rising 3px (0.25s ease-out) when the selection or the patient changes. The patient arrows ease background and colour over 0.15s.
- **Events** rise into the feed from 10px below with a 3px blur clearing, 0.55s expo-out.
- **Signal line:** continuous drift at 56px/s, transform only. Opacity changes with state over 1.2s (ease). The idle cycle carries the ambient behaviour: of every 16 segments, 13 are flat baseline and three are small patterns (single, double, long), so about one pattern every 5s with 2 to 3s of flat line between them. While each month fills the line is in monitoring (a rhythmic pattern joins the cycle); a missed dose draws a teal double at 1.35px, a flagged patient draws the red attention pattern, then the line settles over five flat segments and returns to idle; each fade resets it to idle.
- **Brand mark flash:** when the signal emits a non-calm pattern, the brand mark sends out one box-shadow ring (0.9s ease-out): 35% teal expanding to 6px for the missed-dose double (event tone), 35% red to 7px for the attention pattern (alert tone). Calm patterns never flash it; they go to the calendar as a signal sync instead.
- **Page changes** between landing and sign-in use view transitions: the dose field is named and held still, only the content column crossfades (out 0.16s ease-in rising 4px, in 0.34s ease-out from 8px below with a 3px blur).
- **Press feedback** stays under 0.15s; hover on entry rows runs at 0.2 to 0.25s (see Entry Frame above).

### Named Rules
**The Data-Is-The-Motion Rule.** Nothing on the entry surface moves for its own sake. A dose dot moves because its day arrived, a percentage because it was recalculated, a streak band because the rule flagged it, a card because an event happened, a progress mark because a patient's hold is running out; hover, selection and the patient arrows answer the visitor's own hand and nothing else. New motion must correspond to a data event. The signal line's changes obey this: it switches to monitoring when a month starts filling, draws a double pattern when a missed dose lands, the attention pattern when a streak is flagged, and returns to idle at each fade. Four movements are exceptions, all asked for so the page reads as a running system, none a precedent for more: the patient rotation, the signal's idle stream, the grid surface's breathing and today's ring pulse. The signal sync sits between the two: it answers a real signal event (a pattern starting to draw), but that pattern comes from the idle stream, so it is choreography rather than sample data, and it is bounded (only during a patient's hold, at most once every 12s, never under reduced motion, brightness only, no colour change).

**The Finite-Motion Rule.** Nothing on the entry surface loops, with four sanctioned exceptions. A signal sync and a date hover each run once and end. The exceptions: (1) the patient rotation, a continuous loop the user asked for (fill, 7s hold, fade, next patient, forever), bounded by pauses: the hold counts down only while the visitor is neither hovering over the calendar nor focused inside it, and fill, hold and fade all stop while the tab is hidden or the calendar is offscreen. It has no pause button, by the user's explicit choice; hover and focus stand in for one, which falls short of WCAG 2.2.2's requirement for an explicit pause, stop or hide control on auto-advancing content, and this document records that gap rather than hiding it. (2) The signal line, continuous whenever it is visible, drifting right at 56px/s; what keeps it quiet is its content, not its timing: the idle cycle is 13 flat 40px baseline segments to three small patterns (single, double, long), about one pattern every 5s separated by 2 to 3s of flat line, at 30% opacity; it pauses while the tab is hidden or the line is offscreen and is still under reduced motion. (3) The grid surface's breathing, a 3.6s cycle that peaks at 1.5% scale on a surface of 1 to 2% white. (4) Today's ring pulse, a 3.6s cycle on the 26px number circle (ring 50% to full teal, 1.5% scale at the peak). (3) and (4) are CSS loops that run only while a finished month holds (`.is-done`), only under `prefers-reduced-motion: no-preference`, and never touch the dose dots or any other date, so they never compete with a filling month. These four are the only recurring motions; a fifth needs the same explicit ask.

**The Lowest-Voice Rule.** The signal line is the lowest layer, the quietest thing on the entry surface: below the headline, the lead, the entry rows and the dose field. Its opacity is set by state (idle 30%, monitoring 40%, anomaly 55%, attention 70%, settling 42%, 1.2s transitions) and never exceeds 70%. It is a 1.2px hairline (1.35px for event patterns), carries no text, numbers, grid or beat, and only turns red for the attention pattern at the flag, the one event the field already shows in red. It reacts to the field; it never announces anything the field doesn't.

**The Still-Field Rule.** The dose field never moves between entry pages; navigation swaps only the content beside it.

**The Finished-State Rule.** Under `prefers-reduced-motion: reduce` nothing rotates on its own: the field opens on P-0219's finished month (flag, streak band, event card and headline mark present at rest), and the patient arrows step instantly to the next or previous patient's finished month with no fill or fade. The current progress mark sits full and still. No story events reach the signal line, which is still (a 40px baseline lead, one held calm double pattern, flat baseline to the end; no rAF loop, no state changes, no brand-mark flash); the grid surface does not breathe, today's ring sits still at full teal, `sync()` refuses so the calendar never answers the line, date hover and selection apply without a transition, the detail line changes without a fade, the missed-cell ripple and every entry transition and view-transition animation are off, and every piece of information is present at rest. Arrival keyframes and the two resting loops only run under `no-preference`.

## Do's and Don'ts

### Do:
- **Do** set every surface inside the `.cv` scope so the tokens, Instrument Sans and tabular numerals apply.
- **Do** put new content in white 10px cards with a 1px line border on paper, stacked at 22px.
- **Do** show adherence and dose history with the dose-cell vocabulary (taken, patient check-in, missed, not logged yet) in the light or dark variant, never a new encoding.
- **Do** use the 30-day bands exactly as built: ≥80% on track, 60 to 79% watch, <60% follow up.
- **Do** pair every signal colour with its wash on light surfaces, and switch to the dark-field tints on ink.
- **Do** gate any entrance motion behind `prefers-reduced-motion: no-preference`, and make the reduced state the finished state, not a blank one; the app already zeroes transitions and animations under reduce.
- **Do** tie any new entry-surface motion to a data event and give it an end; the patient rotation, the signal line's idle stream, the grid breathing and today's ring pulse are the only recurring exceptions, and anything that advances on its own must stop while the visitor hovers or focuses inside it, while the tab is hidden and while it is offscreen.
- **Do** reuse `LiveSignal` for a live-signal line elsewhere: drive it with `story()` events from real detections, keep its idle cycle calm-heavy, and set `--ls-color` / `--ls-alert` for the surface it sits on.
- **Do** label sample data as sample data wherever the dose field is shown.
- **Do** keep the entry calendar's activity vocabulary to clinic dose events: observed, check-in, pending, missed, flagged; one event per patient, and a flag card only for a flagged patient.

### Don't:
- **Don't** use teal, indigo, red or amber for decoration or emphasis that carries no status.
- **Don't** colour staff-observed data indigo, or patient-reported data teal.
- **Don't** put a shadow on a resting card, panel or table; shadows are for drawers, off-canvas nav, toasts and arriving event cards.
- **Don't** let the rotation's hold count down while the visitor is hovering or focused inside the calendar, run any part of it while hidden or offscreen, auto-rotate under reduced motion, add events outside a patient's own feed slots, or animate the field during page changes.
- **Don't** add a fifth recurring motion, run the resting loops while a month fills, scale the dose dots, or any text beyond today's 1.5% pulse, speed up the drift, add patterns to the idle cycle, run the loop while hidden or offscreen, or dress the line up as a heart monitor (a regular beat, a sweep-and-erase trace, readouts, a grid, louder colour). Flat is its default; a pattern means the system saw something.
- **Don't** let the calendar answer the signal more than once every 12s, outside a patient's hold, under reduced motion, or with anything louder than a brightness lift; non-calm patterns flash the brand mark, calm ones go to the calendar, never both.
- **Don't** add uppercase, letter-spaced kicker labels above headings; labels here are sentence case.
- **Don't** introduce a second typeface or the Tailwind default gray and teal ramps into `.cv` surfaces; use the named tokens.
- **Don't** use ink surfaces as decoration; dark marks attention, selection or the entry field.
