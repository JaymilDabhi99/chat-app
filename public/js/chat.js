import { createPopup } from "https://cdn.skypack.dev/@picmo/popup-picker";

const socket = io();

const username = localStorage.getItem("username");
const room = localStorage.getItem("room");

const toggleThemeBtn = document.getElementById("toggle-theme-btn");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const btn2 = document.getElementById("btn2");
const triggerButton = document.querySelector("#emoji-btn");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

// Theme toggle
if (toggleThemeBtn) {
  document.body.classList.toggle(
    "dark-mode",
    localStorage.getItem("theme") === "dark"
  );
  toggleThemeBtn.textContent =
    localStorage.getItem("theme") === "dark" ? "☀️" : "🌙";
  toggleThemeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const theme = document.body.classList.contains("dark-mode")
      ? "dark"
      : "light";
    localStorage.setItem("theme", theme);
    toggleThemeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  });
}

// Display user info
if (username && room) {
  document.querySelector(
    ".container2"
  ).textContent = `Username: ${username} | Room: ${room}`;
  socket.emit("joinRoom", { username, room });
  initNotificationHandlers();
}

// Emoji picker
const picker = createPopup(
  { hideOnEmojiSelect: false },
  {
    triggerElement: triggerButton,
    referenceElement: triggerButton,
    position: "top-end",
  }
);

triggerButton.addEventListener("click", (e) => {
  e.preventDefault();
  picker.toggle();
});
picker.addEventListener("emoji:select", (e) => insertAtCursor(input, e.emoji));

let base64Media = null;
let mediaType = null;
uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0]; // Get the selected file
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const reader = new FileReader();
    reader.onload = () => (base64Media = reader.result); // read base64 encoded data
    reader.readAsDataURL(file); // convert file to base64 string
  }
});

// Send message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message && !base64Media) return;

  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const payload = { username, room, timestamp };
  if (message) payload.message = message;
  if (base64Media) payload.media = { base64: base64Media, type: mediaType };

  socket.emit("chat message", payload);

  input.value = "";
  fileInput.value = "";
  base64Media = null;
  mediaType = null;
});

btn2.addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("room");
  window.location.href = "/";
});

// Notifications
function initNotificationHandlers() {
  socket.on("user_join", (u) => {
    socket.off("user_join");
    socket.off("user_left");
    console.log("join event received");
    showNotification(`${u} has joined the chat`);
  });
  socket.on("user_left", (u) => showNotification(`${u} has left the chat`));
}

// Online users
socket.on("userOnline", ({ onlineUsers }) => {
  const list = document.querySelector(".online-users-list");
  list.innerHTML = "";
  onlineUsers.forEach((user) => {
    if (user !== username) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${user}</span><span class="badge"></span>`;
      list.appendChild(li);
    }
  });
});

// Typing indicator
input.addEventListener("focus", () =>
  socket.emit("typing", { username, typing: true })
);
input.addEventListener("blur", () =>
  socket.emit("typing", { username, typing: false })
);
socket.on("typing_status", ({ username: typingUser, typing }) => {
  const indicator = document.querySelector(".indicator");
  indicator.textContent =
    typing && typingUser !== username ? `${typingUser} is typing...` : "";
});

// Incoming messages
socket.on("chat message", appendMessage);
socket.on("loadMessages", (msgs) => msgs.forEach(appendMessage));
socket.on("message-deleted", ({ _id }) => {
  const msg = document.querySelector(`[data-id="${_id}"]`);
  if (msg) msg.remove();
});

function appendMessage({
  username: user,
  message,
  timestamp,
  _id,
  media = [],
}) {
  const currentUser = localStorage.getItem("username");
  const item = document.createElement("div");
  const msg = document.createElement("p");
  const time = document.createElement("span");
  item.setAttribute("data-id", _id);

  let text;
  if (message) {
    text = message;
  }

  msg.innerHTML = `<strong>${user}</strong>: ${message ? `: ${message}` : ""}`;
  time.textContent = timestamp;

  media.forEach((file) => {
    if (file.type === "image" || file.url.startsWith("data:image")) {
      const img = document.createElement("img");
      img.src = file.url;
      img.alt = "Image";
      img.style.maxWidth = "189px";
      img.style.display = "block";
      msg.appendChild(img);
    } else if (file.type === "video" || file.url.startsWith("https://")) {
      const video = document.createElement("video");
      video.src = file.url;
      video.controls = true;
      video.style.maxWidth = "189px";
      video.style.display = "block";
      msg.appendChild(video);
    }
  });

  const menuIcon = document.createElement("span");
  menuIcon.className = "menu-icon";
  menuIcon.textContent = "⋮";

  const dropdown = document.createElement("div");
  dropdown.className = "dropdown-menu";
  if (user === currentUser) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () =>
      socket.emit("delete-message", { _id })
    );
    dropdown.appendChild(deleteBtn);
  }

  menuIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => (dropdown.style.display = "none"));

  item.className = "message-div";

  item.style.cssText = `
              background-color: rgb(194 194 194);
            //   min-height: 1rem;
              padding: 12px;
              margin-left: -205px;
              margin-top: 2px;
              border-radius: 10px;
              width: 40%;
              box-shadow: 0 4px 4px rgba(0, 0, 0, 0.2);
            `;
  item.style.marginLeft = user === currentUser ? "585px" : "3px";

  msg.style.margin = "-4px 0 -4px -1px";
  time.style.fontSize = "11px";

  item.appendChild(msg);
  item.appendChild(time);
  item.appendChild(menuIcon);
  item.appendChild(dropdown);
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function insertAtCursor(input, emoji) {
  const [start, end] = [input.selectionStart, input.selectionEnd];
  const text = input.value;
  input.value = text.slice(0, start) + emoji + text.slice(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus();
}

function showNotification(message) {
  const div = document.createElement("div");
  div.className = "chat-notification";
  div.textContent = message;
  messages.appendChild(div);
}
