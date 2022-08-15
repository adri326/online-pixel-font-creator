# Online Pixel Font Creator

A tool for creating, editing and exporting pixel fonts within the browser.
[You can try it out here!](https://adri326.github.io/online-pixel-font-creator/index.html)

Simply import one of the [included example fonts](https://github.com/adri326/online-pixel-font-creator/tree/main/examples) by pasting it into the text area in the "Upload" menu, and then selecting "Import as pixel font string (.pfs)".

## Inspiration

This tool is inspired by [YellowAfterLife's](https://yal.cc) [excellent tool for converting images into pixel fonts](https://yellowafterlife.itch.io/pixelfont).
The font creation process using YellowAfterLife's tool has some downsides, which resolve around the need to put all of the glyphs into one growing image:

- Growing the image horizontally is tricky, as the new characters added on the right will end up being unrelated to the previous ones (eg. having `Ы` placed next to `G`), which makes further organization harder.
- Growing the image vertically has the consequence of ending up with an image that is hard to navigate around in an image editor.
- You need to think about where each glyph will be in the image; if you sporadically add glyphs that you need, then you might forget where you put them (and you end up with messy indices like [unicode's double-struck characters](https://altcodeunicode.com/alt-codes-math-symbols-double-struck-letters/))
- The have to alternate between editing the font in an image editor and the converter to preview the font

This tool was thus created to remove the need to lay out glyphs in a 2D image and to alternate between two programs.
It features:

- controls close to [Krita](https://krita.org)'s
- visual guides for the different spacing options
- saving in the browser using `localStorage` and locally using a simple file format
- exporting to `OTF` (`TTF` to come), with an efficient path generation algorithm
- built-in preview of the glyphs
- tools for resizing glyphs, copying glyphs to other glyphs, etc.

![Screenshot of the application](examples/screenshot.png)

*Note: The source code is still quite messy, sorry for that.*

## TODO

- rectangle mode
- tooltips everywhere
- re-do the controls of the preview canvas
- more upload options and more export options
- support ligatures
- document the UI
