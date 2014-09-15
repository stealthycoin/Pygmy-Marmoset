
var crop = (function () {
    // Basic variables
    var canvas, ctx, img;

    // Defines the max size of the image to crop
    var max_width, max_height;

    // Variables to handle dragging
    var x_offset, y_offset;
    var last_x, last_y;
    var dragging;

    return {
        init: function(canvas_id, max_w, max_h) {
            // Set the canvas element
            canvas = document.getElementById(canvas_id);
            ctx = canvas.getContext('2d');
            
            // Register handlers to update dragging features
            canvas.addEventListener("mousedown", function(event) {
                crop.mouse_down(event);
            });
            canvas.addEventListener("mousemoved", function(event) {
                crop.mouse_move(event);
            });
            canvas.addEventListener("mouseup", function(event) {
                crop.mouse_up(event);
            });

            // Initialize dragging managment variables
            max_width = max_w;
            max_height = max_h;
            x_offset = 0;
            y_offset = 0;
            dragging = false;
        },

        mouse_down: function(event) {
            last_x = event.clientX;
            last_y = event.clientY;
            dragging = true;
        },

        mouse_up: function(event) {
            last_x = undefined;
            last_y = undefined;
            dragging = false;
        },

        mouse_move: function() {
            last_x = event.clientX;
            last_y = event.clientY;
            
            
            crop.render();
        },

        set_img: function(new_img) {
            img = new_img;
        },
        
        change_zoom: function(level) {
            
        },

        render: function() {
            if (img === undefined) {
                ctx.drawImage(img, 0, 0);
            }
        }
    };
});
