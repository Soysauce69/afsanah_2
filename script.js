// ================================================================
//  Afsanah 2.0 — script.js
//  Runs on: index.html, about.html, contact.html
//  Handles: contact form validation
// ================================================================

document.addEventListener("DOMContentLoaded", function () {

  // ── Contact form validation ────────────────────────────────
  const contactForm = document.getElementById("contact-form");

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name    = document.getElementById("name").value.trim();
      const email   = document.getElementById("email").value.trim();
      const message = document.getElementById("message").value.trim();

      if (!name || !email || !message) {
        alert("Please fill in all fields.");
        return;
      }

      if (!email.includes("@") || !email.includes(".")) {
        alert("Please enter a valid email address.");
        return;
      }

      alert("Thank you! Your message has been sent. We'll get back to you within 2–3 working days.");
      contactForm.reset();
    });
  }

});
