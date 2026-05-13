document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const closeModal = document.getElementById("close-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const logoutSection = document.getElementById("logout-section");
  const loggedInAs = document.getElementById("logged-in-as");
  const logoutBtn = document.getElementById("logout-btn");
  const signupContainer = document.getElementById("signup-container");
  const signupTitle = document.getElementById("signup-title");

  // Authentication state
  let isLoggedIn = false;
  let currentTeacher = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only shown if teacher is logged in)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isLoggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Update UI based on login state
  function updateUIForAuthState() {
    if (isLoggedIn) {
      signupTitle.textContent = "Register Student for Activity (Teacher)";
      signupContainer.style.display = "block";
      loginForm.classList.add("hidden");
      logoutSection.classList.remove("hidden");
      loggedInAs.innerHTML = `Logged in as: <strong>${currentTeacher}</strong>`;
      userIcon.textContent = "👨‍🏫";
    } else {
      signupTitle.textContent = "View Participant Information";
      signupContainer.style.display = "none";
      loginForm.classList.remove("hidden");
      logoutSection.classList.add("hidden");
      userIcon.textContent = "👤";
    }
  }

  // Handle login
  async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      if (response.ok) {
        isLoggedIn = true;
        currentTeacher = username;
        updateUIForAuthState();
        fetchActivities();
        loginForm.reset();
        loginError.classList.add("hidden");
      } else {
        loginError.textContent = "Invalid username or password";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  }

  // Handle logout
  function handleLogout() {
    isLoggedIn = false;
    currentTeacher = null;
    updateUIForAuthState();
    fetchActivities();
    loginModal.classList.add("hidden");
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!isLoggedIn) {
      messageDiv.textContent = "You must be logged in to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentTeacher)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle signup form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!isLoggedIn) {
      messageDiv.textContent = "You must be logged in to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentTeacher)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Modal event listeners
  userIcon.addEventListener("click", () => {
    loginModal.classList.toggle("hidden");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Initialize app
  updateUIForAuthState();
  fetchActivities();
});
