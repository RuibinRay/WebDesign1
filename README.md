# Hola Ola · sparkling beach soda

Concept brand and homepage. "Hola Ola" means "hello, wave". The idea: **a whole beach day, one can at a time**. Each of the six flavors belongs to an hour, and the homepage is driven by scroll: each feature has its own short film, cut into frames, that plays as you scroll through its section.

| Hour | Flavor | What is in it |
|---|---|---|
| 6 AM | Dawn Patrol | Cold brew + cacao |
| 9 AM | Low Tide Lime | Mandarin lime + sea salt |
| Noon | Piña Colada | Pineapple + coconut |
| 4 PM | Golden Set | Mango + passion fruit |
| 6 PM | Sunset Sandía | Watermelon + hibiscus |
| 9 PM | Midnight Mora | Blackberry + ginger |

Palette: sand `#FFF3DC`, ocean ink `#0A3A44`, turquoise `#19C2B8`, coral `#FF6B4A`, mango `#FFB627`, night `#0D1233`, glow `#3DE0FF`. Type: Shrikhand (display) and Bricolage Grotesque (everything else).

## Files

- `index.html`, `css/style.css`, `js/main.js`: the site. Plain HTML, CSS and JS, no build step.
- `assets/`: everything the page loads. Cans, fruit cutouts, postcards and film frames were generated on Higgsfield.
- `higgsfield/`: how the assets were made.
  - `prompts.json`: every image prompt (six cans, video keyframes, fruit cutouts, postcards, lineup, end card).
  - `film-day.txt`, `film-burst.txt`, `film-crack.txt`: the video prompts, one per scroll film.
  - `hf-lib.ps1`, `gen-images.ps1`, `gen-loops.ps1`: scripts that run the prompts through the Higgsfield CLI.
- `tools/make-frames.ps1`: splits a film into frame images and records it in `assets/frames/frames.json`.
- `tools/make-ad.ps1`: edits the commercial (`assets/ad/hola-ola-ad.mp4`) from the films, the end card and the music.
- `tools/make-ad-vertical.ps1`: edits the 9:16 cut of the commercial for Reels, TikTok and Shorts (`assets/ad/hola-ola-ad-vertical.mp4`), reusing the wide ad's soundtrack.
- `tools/serve.ps1`: local preview server.

Images were made with GPT Image 2.6 and video with Kling 4.0 at 1080p, both through Higgsfield. Music is Sonilo.

## How the scroll films work

Each `<section class="film" data-film="NAME">` is pinned while you scroll through it. `js/main.js` reads `assets/frames/frames.json`, preloads that film's frames (coarse first, then the rest) and draws the frame that matches the scroll position on a canvas. Phones get a separate 9:16 set cropped around the can.

| Film | Section | What it shows |
|---|---|---|
| `day` | hero | One dolly-in on the can while a whole day passes, dawn to glowing night. Phones get their own film shot vertically (9:16), retimed so its dawn, sunset and night land under the same captions |
| `burst` | "Real fruit. Real fizz." | A wave and fruit erupting around the can in slow motion |
| `crack` | "Crack one open." | Macro of the lid cracking open (the section hides itself if this film has no frames) |

Three more videos play as ordinary video rather than frame sequences:

- `assets/loops/<flavor-id>.mp4`: a looping clip of each flavor's fruit, shown behind the can in the flavor picker.
- `assets/loops/glow.mp4`: the night beach behind the closing section.
- `assets/ad/hola-ola-ad.mp4`: the commercial in the "The ad" section.

Each of these is optional: the page checks that the file exists and falls back to a still image if it does not.

To add or replace a scroll film:

```
powershell -ExecutionPolicy Bypass -File tools\make-frames.ps1 -Name day -Video path\to\film.mp4 -FirstStill path\to\start-image.png
```

Frames keep the film's own resolution, get a light sharpening pass and are saved at WebP quality 80 to 84. `-FirstStill` and `-LastStill` swap in the sharp original image a film was generated from as its first or last frame, which is where the page rests, so the can is crisp whenever nothing is moving. The exact commands used for this site are at the top of the script.

## Motion setting

On Mac and Windows every animation runs at full by default, even if the operating system's "reduce motion" switch is on. Other devices (phones, tablets) follow their system setting. A visitor can change it with the button at the far right of the nav: it is invisible until hovered or reached with the Tab key, and it stays faintly visible while motion is reduced. The choice is remembered in the browser (`localStorage`, key `holaola.motion`). The logic is at the top of `js/main.js`; the styles are under "MOTION SETTING" in `css/style.css`.

## Preview locally

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Then open http://localhost:4173/.

## Publish on GitHub Pages

Push this folder to a repository, then in the repository settings choose Pages, source "Deploy from a branch", branch `main`, folder `/ (root)`. All paths are relative, so it works at `username.github.io/repo-name/`. The large source renders in `higgsfield/renders/` are not needed by the site and are excluded by `.gitignore`.

## Before a real launch

- The nutrition numbers (calories, sugar, caffeine) are invented for the concept. Replace them with lab values.
- The email form is front-end only. Connect it to a mailing-list provider.
