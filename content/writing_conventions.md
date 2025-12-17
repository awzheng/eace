# How to Write for eace

Welcome to **eace** (Easy ECE). We use **Markdown**, a lightweight way to format text.

## The Basics
**Bold Text** -> `**Bold Text**` \
*Italic Text* -> `*Italic Text*` \
`Code Snippet` -> `` `Code Snippet` ``

## Headings
Structure your article like a pyramid.
# Main Title (H1) -> Use once at the top
## Section Title (H2) -> Major topics
### Sub-section (H3) -> Details
- `# H1`
- `## H2`
- `### H3`

## Lists
**Bullet Points:**
* Use an asterisk `*`
- Or a dash `-`
    * Indent in text editor for sub-points

**Numbered Lists:**
1. Step one
2. Step two
3. Step three

## Writing Math (LaTeX)
Since this is an electronics wiki, we use standard LaTeX formatting for equations.

**Inline Math:**
The voltage is $V(t) = V_m \sin(\omega t)$.
-> Written as: `$V(t) = V_m \sin(\omega t)$`

**Block Math (Centered Equations):**
$$Z = \sqrt{R^2 + (X_L - X_C)^2}$$
-> Written as: `$$Z = \sqrt{R^2 + (X_L - X_C)^2}$$`


## Adding Images
`![Alt Text Here](Paste Image Address Here)` \
*Always add "Alt Text" describing the image for accessibility.*

## Special Features: "eace Explain"
Any text you write here can be highlighted by the user to trigger the AI explanation.
* **Tip:** Write clear, concise definitions.
* **Tip:** Leave complex "textbook" definitions in blockquotes (`>`) so the user is encouraged to highlight them for a simpler explanation.

> "Thevenin's Theorem states that any linear, bilateral network can be replaced by a single voltage source and a single series resistor."
> *(Try highlighting the text above!)*