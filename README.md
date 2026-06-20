This project allows a user to upload an image (or provide a URL to a web based image), set the size of an embroidery hoop and the Aida count of your embroidery fabric, and it will generate the cross stitch pattern. 

Shoutout to Leeoniya for their work with RGB Quantization. https://github.com/leeoniya/RgbQuant.js/tree/master

UPDATE:
After discovering that embroidery thread has its own special color set, I needed a way to map RGB or HEX values into thread colors. I found https://threadcolors.com/, which provided a nice mapping of thread colors to the closest RGB value. Then using a conversion to LAB (https://en.wikipedia.org/wiki/CIELAB_color_space) the colors can be matched in a way that would resemble human vision. 

Do I understand much about color spaces? 
No. 

Am I a little bit color blind?
Yes.

Can I promise those calculated matches will look good? 
No. 

So, I decided to not rely fully on this calculation, and also present an option to select alterante colors for each generated/mapped color. 

UPDATE:
New features added:
1. Image processing sliders (saturation and contrast) to allow more fine tuning over the initally generated pattern.
2. Quarter Stitch support (togglebale) for greater image fidelity (at the cost of pattern complexity)
3. Individual cell recoloring. If you like MOST of the generated pattern, but a few cells look off you can select those cells in the pattern, then choose a color from your pallete to swap them too.

Feature Alterations
1. For the alternate color selections on the initially mapped colors, these were intially restricted to colors that were close to the originally selecetd color. This has been changes to allow for any color to be selected.
2. The image processing algorithm has been adjusted to utilize palette deduplication to avoid redundant color palette selections.
3. The color mapping has been broken into two phases. Phase 1 is color assignemnt using rgbquant against the full size image to build a DMC thread color mapping. Then the image is scaled to the size for the pattern, and the pixels of the downsampled image are mapped to the closet therad color in the finalized DMC palette using CIELAB distance. 

Built using Gemini
