// PygmyMarmoset module
var PygmyMarmoset = (function () {
    // Globals
    var MARGIN = 10;

    // Basic variables
    var canvas, ctx, img, selector;

    // Defines the max size of the image to crop
    var max_width, max_height;

    // Variables to handle dragging
    var x_center, y_center;
    var last_x, last_y;
    var dragging;

    // Zoom bar variables
    var zoom = 1.0;
    var max_zoom = 3.0;
    var min_zoom = 0.25;
    var base_min_zoom = 0.25;
    var showing_zoom = false;
    var sliding = false;

    function distance(a,b,c,d) {
        // Finds distance from (a,b) to (c,d)
        return Math.sqrt((a-c)*(a-c)+(b-d)*(b-d));
    }

    function stay_in_bounds() {
        // Set extrema for offsets trivially
        x_center = Math.max(x_center, max_width/2);
        y_center = Math.max(y_center, max_height/2);
        x_center = Math.min(x_center, get_width() - max_width/2);
        y_center = Math.min(y_center, get_height() - max_height/2);
    }

    function get_zoom_coordinate() {
        var min = MARGIN;
        var max = canvas.width - MARGIN;
        var coord_diff = max - min;
        var coord_unit = coord_diff / 100.0;
        var zooms_diff = max_zoom - min_zoom;
        var zooms_unit = zooms_diff / 100.0;
        var units = (zoom - min_zoom) / zooms_unit;
        var coord = units * coord_unit + min;
        return coord;
    }

    function get_zoom_level(coord) {
        var min = MARGIN;
        var max = canvas.width - MARGIN;
        var coord_diff = max - min;
        var coord_unit = coord_diff / 100.0;
        var zooms_diff = max_zoom - min_zoom;
        var zooms_unit = zooms_diff / 100.0;
        var units = (coord - min) / coord_unit;
        var zoom = units * zooms_unit + min_zoom;
        return zoom;
    }

    function get_width() {
        return img.width * zoom;
    }

    function get_height() {
        return img.height * zoom;
    }

    return {
        init: function(canvas_id, selector_id, max_w, max_h) {
            // Setup the canvas element
            canvas = document.getElementById(canvas_id);
            canvas.style.width = max_w * 2;
            canvas.style.height = max_h * 2;
            canvas.width = max_w * 2;
            canvas.height = max_h * 2;
            ctx = canvas.getContext('2d');
            selector = document.getElementById(selector_id);

            // Register handlers to update dragging features
            canvas.addEventListener("mousedown", PygmyMarmoset.mouse_down);
            canvas.addEventListener("mousemove", PygmyMarmoset.mouse_move);
            canvas.addEventListener("mouseup", PygmyMarmoset.mouse_up);

            // Register event handler for changing file
            selector.addEventListener("change", function (event) {
                var files = event.target.files;

                // Go through files attached
                for (var i = 0, f ; f = files[i] ; i++) {
                    if (!f.type.match("image.*")) {
                        continue;
                    }

                    // If its an image read it and set it to the current image
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var image = new Image();
                        image.onload = function () {
                            PygmyMarmoset.set_img(image);
                        };
                        image.src = e.target.result;
                    };
                    reader.readAsDataURL(f);
                }
            });

            // Initialize dragging managment variables
            max_width = max_w;
            max_height = max_h;
            x_center = 0;
            y_center = 0;
            dragging = false;
            sliding = false;

            // Draw once at the beginning
            PygmyMarmoset.render();
        },

        mouse_down: function(event) {
            // Set dragging variables
            last_x = event.clientX;
            last_y = event.clientY;

            // Are we dragging the image or sliding the slider?
            // Fix coordinates
            var x = last_x - canvas.getBoundingClientRect().left;
            var y = last_y - canvas.getBoundingClientRect().top;

            if (distance(x, y, get_zoom_coordinate(), canvas.height - MARGIN) < MARGIN / 2) {
                sliding = true;
            }
            else {
                dragging = true;
            }

            // Register events for the body as well so you can drag off the picture
            document.body.addEventListener("mousemove", PygmyMarmoset.mouse_move);
            document.body.addEventListener("mouseup", PygmyMarmoset.mouse_up);

            // Disable text selection
            if (event.stopPropogation) event.stopPropogation();
            if (event.preventDefault) event.preventDefault();
            event.cancelBubble = false;
            event.returnValue = false;
            return false;
        },

        mouse_up: function(event) {
            // Reset dragging variables
            last_x = undefined;
            last_y = undefined;
            dragging = false;
            sliding = false;

            // Remove the mousemove events after we let go so that we don't degrade performance
            document.body.removeEventListener("mousemove", PygmyMarmoset.mouse_move);
            document.body.removeEventListener("mouseup", PygmyMarmoset.mouse_up);
        },

        mouse_move: function(event) {
            // If we are dragging move the offset and rerender
            if (dragging) {
                PygmyMarmoset.toggle_zoom(false);
                x_center += last_x - event.clientX;
                y_center += last_y - event.clientY;
                last_x = event.clientX;
                last_y = event.clientY;

                // Stay in bounds and redraw
                stay_in_bounds();
                PygmyMarmoset.render();
            }
            else if (sliding) {
                // Find x value of mouse and adjust the zoom level
                var x = event.clientX - canvas.getBoundingClientRect().left;
                var before_zoom = zoom;
                zoom = get_zoom_level(x);

                // Zoom extrema
                zoom = Math.max(zoom, min_zoom);
                zoom = Math.min(zoom, max_zoom);

                // Adjust image then draw
                PygmyMarmoset.change_zoom(before_zoom, zoom);
                stay_in_bounds();
                PygmyMarmoset.render();
            }
            else {
                var y = event.clientY;
                // Check if we can reveal the drag bar
                if (event.clientY > canvas.getBoundingClientRect().top + canvas.height - 2 * MARGIN) {
                    PygmyMarmoset.toggle_zoom(true);
                }
                else {
                    PygmyMarmoset.toggle_zoom(false);
                }
            }

            // Disable text selection
            if (event.stopPropogation) event.stopPropogation();
            if (event.preventDefault) event.preventDefault();
            event.cancelBubble = false;
            event.returnValue = false;
            return false;
        },

        get_data: function(callback, encoding) {
            // Make a png (or something else) out of the selected region
            var encoding = encoding || "image/png";

            // Create elements to hold the new image
            var new_canvas = document.createElement('canvas');
            new_canvas.width = max_width;
            new_canvas.height = max_height;
            var new_ctx = new_canvas.getContext('2d');

            // Get data from one canvas and draw it to the other
            var data = ctx.getImageData(canvas.width/4, canvas.height/4, max_width, max_height);
            new_ctx.putImageData(data, 0, 0);

            // Create image and set callback function trigger when it loads
            var result_image = new Image();
            result_image.onload = function() {
                callback(result_image);
            };

            // Start loading image
            result_image.src = new_canvas.toDataURL(encoding);
        },

        toggle_zoom: function(value) {
            if (showing_zoom !== value) {
                showing_zoom = value;
                PygmyMarmoset.render();
            }
        },

        set_img: function(new_img) {
            // Center new image
            x_center = new_img.width / 2;
            y_center = new_img.height / 2;

            // Reset zoom level
            zoom = 1;

            // Set a new image
            img = new_img;

            // Find a new minimum zoom so that it fits in crop zone
            var zoom_candidate_w = Math.max(base_min_zoom, max_width / img.width);
            var zoom_candidate_h = Math.max(base_min_zoom, max_height / img.height);
            min_zoom = Math.max(zoom_candidate_w, zoom_candidate_h);
            PygmyMarmoset.render();
        },

        change_zoom: function(before, after) {
            // Move picture to accomadate scaling
            var pre_width = img.width * before;
            var pre_height = img.height * before;
            var post_width = img.width * after;
            var post_height = img.height * after;

            x_center = post_width / pre_width * x_center;
            y_center = post_height / pre_height * y_center;
        },

        render: function() {
            // Draw background
            ctx.fillStyle = "lightgray";
            ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
            if (img !== undefined) {
                // Draw image if one exists
                // Find width and height for scaling
                var scaled_width = zoom * img.width;
                var scaled_height = zoom * img.height;
                ctx.drawImage(img, -(x_center-max_width), -(y_center-max_height), scaled_width, scaled_height);

                // Then draw the selection rectangle
                ctx.strokeStyle = "black";
                ctx.strokeRect(max_width/2, max_height/2, max_width, max_height);

                if (showing_zoom) {
                    // Draw slider bar line
                    var min = MARGIN;
                    var max = canvas.width - MARGIN;
                    ctx.beginPath();
                    ctx.moveTo(min, canvas.height - MARGIN);
                    ctx.lineTo(max, canvas.height - MARGIN);
                    ctx.stroke();

                    // Draw slider bar button
                    // Find coordinate to draw circle
                    var coord_diff = max - min;
                    var coord_unit = coord_diff / 100.0;
                    var zooms_diff = max_zoom - min_zoom;
                    var zooms_unit = zooms_diff / 100.0;
                    var units = (zoom - min_zoom) / zooms_unit;
                    var coord = units * coord_unit + min;
                    ctx.beginPath();
                    ctx.arc(coord, canvas.height - MARGIN, MARGIN / 2, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.fill();

                    // Draw zoom level
                    ctx.font = "10px Georgia";
                    ctx.fillStyle = "black";
                    ctx.fillText(zoom.toFixed(2) + " x", MARGIN / 2, MARGIN);
                }
            }
        }
    };
})();
