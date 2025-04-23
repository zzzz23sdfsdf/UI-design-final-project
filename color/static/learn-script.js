const colorPicker = new iro.ColorPicker("#colorWheel", {
    width: 200,
    color: savedColor ? `hsl(${savedColor.h}, ${savedColor.s}%, ${savedColor.l}%)` : "#f00"
});

function updateColorBoxes(color){
    const hsl = color.hsl;
    const hue = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    const base = `hsl(${hue}, ${s}%, ${l}%)`;

    const colorBoxes = [];
    for (let i = 0; i < numBoxes; i++) {
        const box = document.getElementById(`colorBox${i}`);
        if (box) colorBoxes.push(box);
    }

    // Clear all
    colorBoxes.forEach(box => box.style.backgroundColor = "#eee");

    // Color scheme logic
    if (lessonNumber === 0) {
        // Monochromatic: vary lightness
        colorBoxes[0].style.backgroundColor = `hsl(${hue}, ${s}%, ${Math.max(l - 20, 0)}%)`;
        colorBoxes[1].style.backgroundColor = base;
        colorBoxes[2].style.backgroundColor = `hsl(${hue}, ${s}%, ${Math.min(l + 20, 100)}%)`;
    }

    else if (lessonNumber === 1) {
        // Complementary
        colorBoxes[0].style.backgroundColor = base;
        colorBoxes[1].style.backgroundColor = `hsl(${(hue + 180) % 360}, ${s}%, ${l}%)`;
    }

    else if (lessonNumber === 2) {
        // Analogous
        colorBoxes[0].style.backgroundColor = base;
        colorBoxes[1].style.backgroundColor = `hsl(${(hue + 30) % 360}, ${s}%, ${l}%)`;
        colorBoxes[2].style.backgroundColor = `hsl(${(hue + 330) % 360}, ${s}%, ${l}%)`; // hue - 30
    }

    else if (lessonNumber === 3) {
        // Triadic: 3 colors evenly spaced (120° apart)
        colorBoxes[0].style.backgroundColor = base;
        colorBoxes[1].style.backgroundColor = `hsl(${(hue + 120) % 360}, ${s}%, ${l}%)`;
        colorBoxes[2].style.backgroundColor = `hsl(${(hue + 240) % 360}, ${s}%, ${l}%)`;
    }

    else if (lessonNumber === 4) {
        // Tetradic: two complementary pairs (e.g., 0°, 60°, 180°, 240°)
        colorBoxes[0].style.backgroundColor = base;
        colorBoxes[1].style.backgroundColor = `hsl(${(hue + 60) % 360}, ${s}%, ${l}%)`;
        colorBoxes[2].style.backgroundColor = `hsl(${(hue + 180) % 360}, ${s}%, ${l}%)`;
        colorBoxes[3].style.backgroundColor = `hsl(${(hue + 240) % 360}, ${s}%, ${l}%)`;
    }
}

if (savedColor) {
    updateColorBoxes({ hsl: savedColor });
}

colorPicker.on("color:change", function (color) {
    updateColorBoxes(color);

    const hsl = color.hsl;
    const hue = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    fetch('/save_color', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            lesson_number: lessonNumber,
            hsl: { h: hue, s: s, l: l }
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Color saved:", data);
    })
    .catch(error => {
        console.error("Error saving color:", error);
    });
});