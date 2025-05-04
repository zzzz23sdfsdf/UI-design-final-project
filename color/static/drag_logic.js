document.addEventListener("DOMContentLoaded", function () {
  const blocks = document.querySelectorAll(".color-block");
  const dropZone = document.querySelector(".drop-zone");
  const dropZones = document.querySelectorAll(".q8-drop");
  const feedback = document.getElementById("drop-feedback") || document.getElementById("q8-feedback");
  const hint = document.getElementById("hint-text");

  // Get URL to determine question number
  const qnum = parseInt(window.location.pathname.split("/quiz/")[1]);

  // Check if the question is already completed
  const isCompleted = document.querySelector(".disabled-color") !== null;
  
  // Function to add a label to a color box
  function addLabelToColorBox(element, labelText) {
    // Create a label div
    const label = document.createElement("div");
    label.className = "selection-number";
    label.textContent = labelText;
    label.style.position = "absolute";
    label.style.top = "-10px";
    label.style.right = "-10px";
    label.style.backgroundColor = "black";
    label.style.color = "white";
    label.style.borderRadius = "50%";
    label.style.width = "25px";
    label.style.height = "25px";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "center";
    label.style.fontSize = "14px";
    label.style.fontWeight = "bold";
    label.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    
    // Make the element position relative if it's not already
    if (element.style.position !== "relative") {
      element.style.position = "relative";
    }
    
    // Add the label to the element
    element.appendChild(label);
  }
  
  // If completed, update the display to show correct/incorrect status
  if (isCompleted && (qnum === 6 || qnum === 7)) {
    // Try to find the alert message
    const alertElement = document.querySelector(".alert");
    if (alertElement) {
      if (alertElement.classList.contains("alert-success")) {
        feedback.textContent = "Correct!";
        feedback.style.color = "green";
      } else if (alertElement.classList.contains("alert-danger")) {
        feedback.textContent = "Incorrect.";
        feedback.style.color = "red";
      }
    }
    
    // Show hint if it exists
    if (hint && hint.style.display === "none") {
      hint.style.display = "block";
    }
    
    // Add label to the selection area (Your selection section)
    const selectionArea = document.querySelector(".drop-zone");
    if (selectionArea && selectionArea.style.backgroundColor) {
      // Get index of the selected color
      let selectedIndex = -1;
      blocks.forEach((block, index) => {
        if (block.style.backgroundColor === selectionArea.style.backgroundColor ||
            block.dataset.color === selectionArea.style.backgroundColor) {
          selectedIndex = index;
        }
      });
      
      if (selectedIndex >= 0) {
        addLabelToColorBox(selectionArea, `#${selectedIndex + 1}`);
      }
    }
    
    return;
  }
  
  // For question 8 review - store selected colors in localStorage for review
  if (qnum === 8) {
    // If question is completed
    if (isCompleted) {
      // Display the feedback message
      if (feedback) {
        feedback.textContent = "Wonderful! Your color combination looks great!";
        feedback.style.color = "green";
      }
      
      // Try to retrieve selected colors from localStorage
      try {
        const savedColors = localStorage.getItem('q8_colors');
        const savedIndexes = localStorage.getItem('q8_indexes');
        
        if (savedColors) {
          const colors = JSON.parse(savedColors);
          const indexes = savedIndexes ? JSON.parse(savedIndexes) : [];
          
          // Apply saved colors to drop zones
          dropZones.forEach((zone, i) => {
            if (colors[i]) {
              zone.style.backgroundColor = colors[i];
              zone.classList.add("filled");
              zone.style.border = "3px solid #28a745"; // Green border to show it's completed
              
              // Add selection number label
              if (indexes[i] !== undefined) {
                addLabelToColorBox(zone, `#${indexes[i]}`);
              }
            }
          });
        } else {
          // If no saved colors, just show green borders
          dropZones.forEach(zone => {
            zone.style.border = "3px solid #28a745";
          });
        }
      } catch (err) {
        console.error("Error retrieving saved colors:", err);
      }
      
      return; // Exit early for completed questions
    }
  }

  // Get current attempts from server-side data
  let attempts = 0; // This will be set by the server response
  let dropLocked = false;

  // Q6 / Q7 logic
  if ((qnum === 6 || qnum === 7) && dropZone) {
    const correctIndex = parseInt(dropZone.dataset.correctIndex || "0");

    blocks.forEach((block) => {
      block.addEventListener("dragstart", function (e) {
        if (!dropLocked) {
          e.dataTransfer.setData("color", block.dataset.color);
          e.dataTransfer.setData("index", block.dataset.index); // Use data-index attribute
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

      // Submit answer to server
      fetch("/submit_answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qnum: qnum, answer: droppedIndex })
      })
      .then(res => res.json())
      .then(data => {
        attempts = data.attempts;
        
        if (data.correct) {
          feedback.textContent = "Correct!";
          feedback.style.color = "green";
          dropLocked = true;
          
          // Update navigation
          updateNavigation(qnum);
          
          // Reload the page to show completed state (no auto-navigation)
          window.location.reload();
        } else {
          feedback.textContent = data.attempts === 1 ? "Oops! One more try!" : "Sorry, you've used all your attempts.";
          feedback.style.color = data.attempts === 1 ? "red" : "gray";
          
          if (data.attempts === 1 && hint) {
            hint.style.display = "block";
          }
          
          if (data.attempts > 1) {
            dropLocked = true;
            
            // Update navigation
            updateNavigation(qnum);
            
            // Reload the page to show completed state (no auto-navigation)
            window.location.reload();
          }
        }
      })
      .catch(err => {
        console.error("Error submitting answer:", err);
      });
    });
  }

  // Q8 logic - this needs special handling
  if (qnum === 8 && dropZones.length > 0 && !isCompleted) {
    blocks.forEach(block => {
      block.addEventListener("dragstart", function (e) {
        if (!dropLocked) {
          e.dataTransfer.setData("color", block.dataset.color);
          // Also store the index number from the color block
          if (block.dataset.index) {
            e.dataTransfer.setData("index", block.dataset.index);
          } else {
            // Find the index by position in the DOM
            const allBlocks = Array.from(blocks);
            const index = allBlocks.indexOf(block) + 1;
            e.dataTransfer.setData("index", index.toString());
          }
        }
      });
    });

    dropZones.forEach(zone => {
      zone.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        if (zone.classList.contains("filled") || dropLocked) return;

        const color = e.dataTransfer.getData("color");
        const index = e.dataTransfer.getData("index");
        
        zone.style.backgroundColor = color;
        zone.classList.add("filled");
        zone.dataset.color = color;
        zone.dataset.index = index;

        const allFilled = Array.from(dropZones).every(z => z.classList.contains("filled"));
        if (allFilled) {
          feedback.textContent = "Wonderful! Looks really nice!";
          feedback.style.color = "green";
          dropLocked = true;
          
          // Save colors and indexes to localStorage
          const selectedColors = [];
          const selectedIndexes = [];
          dropZones.forEach(z => {
            selectedColors.push(z.style.backgroundColor);
            selectedIndexes.push(z.dataset.index);
          });
          
          // Store in local storage
          localStorage.setItem('q8_colors', JSON.stringify(selectedColors));
          localStorage.setItem('q8_indexes', JSON.stringify(selectedIndexes));
          
          // Submit answer
          fetch("/submit_answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              qnum: qnum, 
              answer: "any"
            })
          })
          .then(res => res.json())
          .then(data => {
            // Update navigation
            updateNavigation(qnum);
            
            // Reload to show the completed state
            window.location.reload();
          })
          .catch(err => {
            console.error("Error submitting answer:", err);
          });
        }
      });
    });
  }

  function updateNavigation(qnum) {
    const nextButton = document.getElementById("next-locked");
    if (nextButton) {
      nextButton.classList.remove("btn-outline-secondary");
      nextButton.classList.add("btn-primary");
      nextButton.disabled = false;
      nextButton.innerHTML = `<a href="/quiz/${qnum + 1}" style="color: inherit; text-decoration: none;">Next <i class="bi bi-arrow-right"></i></a>`;
    }
  }
});