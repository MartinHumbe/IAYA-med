const MASCOT_SVG = `
<svg viewBox="0 0 160 130" aria-label="Tlacuache de IAYA" role="img" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="44" cy="46" rx="20" ry="22" transform="rotate(-15 44 46)" fill="#E7E5E4" stroke="#D6D3D1"/>
  <ellipse cx="45" cy="47" rx="13" ry="15" transform="rotate(-15 45 47)" fill="#F4B8B8" fill-opacity=".85"/>
  <ellipse cx="116" cy="46" rx="20" ry="22" transform="rotate(15 116 46)" fill="#E7E5E4" stroke="#D6D3D1"/>
  <ellipse cx="115" cy="47" rx="13" ry="15" transform="rotate(15 115 47)" fill="#F4B8B8" fill-opacity=".85"/>
  <ellipse cx="80" cy="74" rx="46" ry="42" fill="#FFF" stroke="#E7E5E4" stroke-width="1.2"/>
  <path d="M52 64c10-3 18 1 20 8-4 4-16 3-22-1zM108 64c-10-3-18 1-20 8 4 4 16 3 22-1z" fill="#F5F5F4"/>
  <circle cx="51" cy="85" r="7.5" fill="#F4B8B8" fill-opacity=".55"/>
  <circle cx="109" cy="85" r="7.5" fill="#F4B8B8" fill-opacity=".55"/>
  <g class="mascot-eye">
    <ellipse class="eye-anchor" cx="61" cy="73" rx="8" ry="9" fill="transparent"/>
    <g class="mascot-pupil">
      <ellipse cx="61" cy="73" rx="8" ry="9" fill="#1C1917"/>
      <circle cx="59" cy="70.5" r="2.2" fill="#FFF"/>
      <circle cx="63" cy="75" r="1" fill="#FFF"/>
    </g>
  </g>
  <g class="mascot-eye">
    <ellipse class="eye-anchor" cx="99" cy="73" rx="8" ry="9" fill="transparent"/>
    <g class="mascot-pupil">
      <ellipse cx="99" cy="73" rx="8" ry="9" fill="#1C1917"/>
      <circle cx="97" cy="70.5" r="2.2" fill="#FFF"/>
      <circle cx="101" cy="75" r="1" fill="#FFF"/>
    </g>
  </g>
  <path d="M77 82q3-1.5 6 0c-2 4-3 4-3 4s-1 0-3-4z" fill="#F4B8B8"/>
  <path d="M76 88q4 2.5 4-1 0 3.5 4 1" stroke="#78716C" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <g stroke="#A8A29E" stroke-width=".8" stroke-linecap="round" opacity=".6"><path d="m44 82-16-2M44 86l-18 2M116 82l16-2M116 86l18 2"/></g>
  <ellipse cx="68" cy="112" rx="7" ry="5.5" fill="#FAF9F6" stroke="#E7E5E4"/>
  <ellipse cx="92" cy="112" rx="7" ry="5.5" fill="#FAF9F6" stroke="#E7E5E4"/>
</svg>`;

export function createMascot(container) {
  container.innerHTML = MASCOT_SVG;
  container.classList.add("mascot-float");
  const eyes = [...container.querySelectorAll(".mascot-eye")];

  let frameId = 0;
  let blinkTimeout = 0;
  let blinkEndTimeout = 0;
  let isTyping = false;
  let pointer = null;

  const scheduleUpdate = () => {
    if (!frameId) frameId = requestAnimationFrame(updatePupils);
  };

  const updatePupils = () => {
    frameId = 0;
    eyes.forEach((eyeGroup) => {
      const pupil = eyeGroup.querySelector(".mascot-pupil");

      if (isTyping) {
        pupil.style.transform = "translate(0px, 3px)";
        return;
      }

      if (!pointer) {
        pupil.style.transform = "translate(0px, 0px)";
        return;
      }

      const anchor = eyeGroup.querySelector(".eye-anchor").getBoundingClientRect();
      const dx = pointer.x - (anchor.left + anchor.width / 2);
      const dy = pointer.y - (anchor.top + anchor.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const radius = Math.min(3.5, distance * 0.02);
      pupil.style.transform = `translate(${(dx / distance) * radius}px, ${(dy / distance) * radius}px)`;
    });
  };

  const handleMouseMove = (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    scheduleUpdate();
  };

  const handleTouch = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    pointer = { x: touch.clientX, y: touch.clientY };
    scheduleUpdate();
  };

  const handleTouchEnd = () => {
    pointer = null;
    scheduleUpdate();
  };

  const handleFocusIn = (event) => {
    if (event.target.matches("[data-message-input]")) {
      isTyping = true;
      scheduleUpdate();
    }
  };

  const handleFocusOut = (event) => {
    if (event.target.matches("[data-message-input]")) {
      isTyping = false;
      scheduleUpdate();
    }
  };

  const scheduleBlink = () => {
    const delay = 3000 + Math.random() * 2500;
    blinkTimeout = setTimeout(() => {
      eyes.forEach((eye) => eye.classList.add("is-blinking"));
      blinkEndTimeout = setTimeout(() => {
        eyes.forEach((eye) => eye.classList.remove("is-blinking"));
        scheduleBlink();
      }, 140);
    }, delay);
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("touchstart", handleTouch, { passive: true });
  window.addEventListener("touchmove", handleTouch, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);

  scheduleBlink();
  scheduleUpdate();

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("touchstart", handleTouch);
    window.removeEventListener("touchmove", handleTouch);
    window.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("focusin", handleFocusIn);
    document.removeEventListener("focusout", handleFocusOut);
    if (frameId) cancelAnimationFrame(frameId);
    clearTimeout(blinkTimeout);
    clearTimeout(blinkEndTimeout);
  };
}