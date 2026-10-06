const saveButton = document.querySelector(".save-btn");

saveButton.addEventListener("click", () => {
  saveButton.classList.toggle("saved");

  saveButton.querySelector(".save-text").textContent =
    saveButton.classList.contains("saved") ? "Saved" : "Save";
});
