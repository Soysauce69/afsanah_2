

document.addEventListener("DOMContentLoaded", function () {

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

let lastScroll = 0;
const header = document.querySelector("header");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll <= 0) {
    header.classList.remove("hide");
    return;
  }

  if (currentScroll > lastScroll && currentScroll > 80) {
    header.classList.add("hide"); // scroll down
  } else {
    header.classList.remove("hide"); // scroll up
  }

  lastScroll = currentScroll;
});
