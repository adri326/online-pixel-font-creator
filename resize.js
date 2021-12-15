const resizer = document.getElementById("resizer");

function attach_resizer(resizer, min = 0, max = 1, horizontal = true, callback = () => {}) {
    const parent_elem = resizer.parentNode;
    const left_elem = resizer.previousElementSibling;
    const right_elem = resizer.nextElementSibling;

    const size_property = horizontal ? "width" : "height";

    let x = 0;
    let y = 0;
    let initial_size = 0;

    function mousemove(event) {
        let dx = event.clientX - x;
        let dy = event.clientY - y;

        let new_size = (initial_size + (horizontal ? dx : dy)) / parent_elem.getBoundingClientRect()[size_property];
        new_size = Math.max(Math.min(new_size, max), min);
        left_elem.style[size_property] = `calc(${new_size * 100}% - 0.5em)`;
        right_elem.style[size_property] = `calc(${(1 - new_size) * 100}% - 0.5em)`;
        callback();
    }

    function mouseup(event) {
        document.body.classList.remove(horizontal ? "resize-horizontal" : "resize-vertical");
        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseup);
    }

    resizer.addEventListener("mousedown", (event) => {
        x = event.clientX;
        y = event.clientY;
        initial_size = left_elem.getBoundingClientRect()[size_property];

        document.body.classList.add(horizontal ? "resize-horizontal" : "resize-vertical");
        document.addEventListener("mousemove", mousemove);
        document.addEventListener("mouseup", mouseup);
    });
}

attach_resizer(resizer, 0.25, 0.75, true, () => {
    resize();
});
