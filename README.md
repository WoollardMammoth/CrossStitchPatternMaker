Another Gemini Jive Session.

This project allows a user to upload an image (or provide a URL to a web based image), set the size of an embroidery hoop and the Aida count of your embroidery fabric, and it will generate the cross stitch pattern. 

Shoutout to Leeoniya for their work with RGB Quantization. https://github.com/leeoniya/RgbQuant.js/tree/master

UPDATE:
After discovering that embroidery thread has its own special color set, I needed a way to map RGB or HEX values into thread colors. I found https://threadcolors.com/, which provided a nice mapping of thread coleres to the closest RGB value. Then using a conversion to LAB (https://en.wikipedia.org/wiki/CIELAB_color_space) the colors can be matched in a way that owuld resemble human vision. 

Do I understand much about color psaces? No. Can I promise those calculated matches will look good? No. Am I a little bit color blind? Yes. So, I decided to not rely fully on this, and also present an option to select alterante colors for each generated/mapped color. 
