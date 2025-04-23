document.addEventListener("DOMContentLoaded", function () {
    const blocks = document.querySelectorAll(".color-block");
    const dropZone = document.querySelector(".drop-zone");
    const dropZones = document.querySelectorAll(".q8-drop");
    const feedback = document.getElementById("drop-feedback") || document.getElementById("q8-feedback");
    const hint = document.getElementById("hint") || document.getElementById("hint-text");
  
    let attempts = 0;
    let dropLocked = false;
  
    // Q6 / Q7 logic
    if (dropZone && dropZone.dataset.correctIndex) {
      const correctIndex = parseInt(dropZone.dataset.correctIndex);
  
      blocks.forEach((block, index) => {
        block.addEventListener("dragstart", function (e) {
          if (!dropLocked) {
            e.dataTransfer.setData("color", block.dataset.color);
            e.dataTransfer.setData("index", index + 1); // 1-based index
          }
        });
      });
  
      dropZone.addEventListener("dragover", function (e) {
        if (!dropLocked) e.preventDefault();
      });
  
      dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        if (dropLocked) return;
  
        const droppedColor = e.dataTransfer.getData("color");
        const droppedIndex = parseInt(e.dataTransfer.getData("index"));
  
        dropZone.style.backgroundColor = droppedColor;
        dropZone.textContent = "";
  
        if (droppedIndex === correctIndex) {
          feedback.textContent = "Correct!";
          feedback.style.color = "green";
          dropLocked = true;
          postAndNext(droppedIndex);
        } else {
          attempts++;
          feedback.textContent = attempts === 1 ? "Oops! One more try!" : "Sorry, moving to the next question.";
          feedback.style.color = attempts === 1 ? "red" : "gray";
          if (attempts === 1 && hint) hint.style.display = "block";
          if (attempts > 1) {
            dropLocked = true;
            postAndNext(droppedIndex);
          }
        }
      });
    }
  
    // Q8 logic
    if (dropZones.length === 4) {
      blocks.forEach(block => {
        block.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("color", block.dataset.color);
        });
      });
  
      dropZones.forEach(zone => {
        zone.addEventListener("dragover", function (e) {
          e.preventDefault();
        });
  
        zone.addEventListener("drop", function (e) {
          e.preventDefault();
          if (zone.classList.contains("filled")) return;
  
          const color = e.dataTransfer.getData("color");
          zone.style.backgroundColor = color;
          zone.classList.add("filled");
  
          const allFilled = [...dropZones].every(z => z.classList.contains("filled"));
          if (allFilled) {
            feedback.textContent = "Wonderful! Looks really nice!";
            feedback.style.color = "green";
            postAndNext("any");
          }
        });
      });
    }
  
    function postAndNext(answer) {
      const qnum = parseInt(document.URL.split("/quiz/")[1]);
      fetch("/submit_answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qnum: qnum, answer: answer })
      })
      .then(() => {
        setTimeout(() => {
          window.location.href = `/quiz/${qnum + 1}`;
        }, 1200);
      })
      .catch(err => console.error("Error submitting answer:", err));
    }
  });
  