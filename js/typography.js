// typography.js
// UI helpers for typography controls (placeholders)
function getTypographySettings(){
  return {
    fontFamily: Array.from(document.querySelectorAll('.font-option:checked')).map(el=>el.dataset.value),
    weight: +document.getElementById('weight').value,
    letter: +document.getElementById('letter').value,
    rotation: +document.getElementById('rotation').value
  }
}
