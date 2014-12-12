PygmyMarmoset.js
====


Easily crop images in JS
-------------------

```avascript
// Initialize
PygmyMarmoset.init("test_canvas", "selector", 100, 100);
function callback(img) {
    document.getElementById("result").src = img.src;
}
function click_crop() {
    PygmyMarmoset.get_data(callback);
}
```

```html
<canvas id="test_canvas">Browser doesn't support canvas.</canvas>
<br />
<input id="selector" type="file" />
<a href="#" onclick="click_crop();return false;">Crop</a>
<p>Result Image</p>
<img id="result" />
```
