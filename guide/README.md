# The SumiTeX guide

The sources of two LaTeX projects that SumiTeX can hand to every user (set up as in [the deploy guide](../deploy/README.md#8-the-sumitex-guide-optional)):

- **`so-tay/`, the handbook (Sổ tay SumiTeX):** Vietnamese, in plain language, with screenshots, tips and practice boxes. Every user gets it read-only, always the latest; admins can edit it.
- **`san-tap/`, the playground (Sân tập SumiTeX):** six short lessons. Each user gets a copy of their own from the handbook's **Open my playground**. Every task is a `\todo{…}`, so it shows as an orange box in the PDF and in the Outline, where ✎ → **✓ Done** removes it. Lesson 6 is deliberately broken and starts switched off.

Both compile with pdfLaTeX (Vietnamese through `\usepackage[T5]{fontenc}` and `babel`).

## The handbook's versions

```
so-tay/
  main.tex               \newcommand{\PhienBan}{v0.7}  ← the one line that picks the version
  chung/preamble.tex     shared styles: Mẹo / Lưu ý / Thực hành boxes, \phim{Ctrl}, \nut{Button}, code blocks (\begin{ma}…\end{ma}), \anh, \chuthich, the cover
  phien-ban/
    v0.7/                noi-dung.tex (chapter order), one file per chapter, hinh/ (screenshots)
    v0.8/                …
```

To publish a new version, for example with a SumiTeX release:

1. Copy `phien-ban/v0.7` to `phien-ban/v0.8`, inside the handbook project itself, so the old folder stays.
2. Edit the new folder: text, screenshots in `hinh/`, and the "Có gì mới" (what's new) appendix.
3. Change `\newcommand{\PhienBan}{v0.7}` in `main.tex` to `v0.8`.

Everyone sees the new version the next time they open the handbook. Older versions stay in their folders, and in the project's history.

## Updating the exercises

Edit the master playground project, then bump the line `% Phiên bản sân tập: 2026.11` at the top of its `main.tex`. Users whose copy is older see **Get the new exercises**. Their own copy is never changed: a new one is made, and the old one is kept with "(cũ)" (old) in its name.

## Screenshots

The handbook's screenshots are of SumiTeX in the light theme, 1600 × 900, taken on a dev stack with the example project. Retake them when the interface changes visibly.
