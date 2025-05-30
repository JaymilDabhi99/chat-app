// Import emoji picker
import { createPopup } from "https://cdn.skypack.dev/@picmo/popup-picker";

// Socket connection
const socket = io();

// Get user info
const username = localStorage.getItem("username");
const room = localStorage.getItem("room");

// DOM elements
const toggleThemeBtn = document.getElementById("toggle-theme-btn");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const logoutBtn = document.getElementById("btn2");
const triggerButton = document.querySelector("#emoji-btn");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

// Theme toggle
if (toggleThemeBtn) {
  const savedTheme = localStorage.getItem("theme") === "dark";
  document.body.classList.toggle("dark-mode", savedTheme);
  toggleThemeBtn.textContent = savedTheme ? "☀️" : "🌙";

  toggleThemeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    toggleThemeBtn.textContent = isDark ? "☀️" : "🌙";
  });
}

// Join room
if (username && room) {
  document.querySelector(
    ".container2"
  ).textContent = `Username: ${username} | Room: ${room}`;
  socket.emit("joinRoom", { username, room });
  initNotificationHandlers();
}

// Emoji picker for input
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

// File upload
let base64Media = null;
let mediaType = null;

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    mediaType = file.type.startsWith("image") ? "image" : "video";
    const reader = new FileReader();
    reader.onload = () => (base64Media = reader.result);
    reader.readAsDataURL(file);
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

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("room");
  window.location.href = "/";
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

// Notifications
function initNotificationHandlers() {
  socket.on("user_join", (u) => showNotification(`${u} has joined the chat`));
  socket.on("user_left", (u) => showNotification(`${u} has left the chat`));
}

// Online users list
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

// Handle message reactions
socket.on("react-message", ({ messageId, reactions }) => {
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageDiv) return;

  const container = messageDiv.querySelector(".reaction-container");
  if (!container) return;
  container.innerHTML = "";

  reactions.forEach((r) => {
    const span = document.createElement("span");
    span.className = "reaction";
    span.textContent = r.emoji;
    span.title = `Reacted by ${r.reactedBy}`;
    // if (r.reactedBy === username) {
    //   span.style.border = "2px solid blue";
    // }
    container.appendChild(span);
  });
});

// Message deleted
socket.on("message-deleted", ({ _id }) => {
  const msg = document.querySelector(`[data-message-id="${_id}"]`);
  if (msg) msg.remove();
});

// Incoming messages
socket.on("chat message", appendMessage);
socket.on("loadMessages", (msgs) => msgs.forEach(appendMessage));

function appendMessage({
  username: user,
  message,
  timestamp,
  _id,
  media = [],
  reactions = [],
}) {
  const currentUser = localStorage.getItem("username");
  const item = document.createElement("div");
  const msg = document.createElement("p");
  const time = document.createElement("span");

  item.className = "message-div";
  item.setAttribute("data-id", _id);
  item.dataset.messageId = _id;
  item.style.position = "relative";
  item.style.cssText = `
    background-color: rgb(194 194 194);
    padding: 12px;
    margin-top: 2px;
    border-radius: 10px;
    width: 40%;
    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.2);
  `;
  item.style.marginLeft = user === currentUser ? "585px" : "3px";

  msg.innerHTML = `<strong>${user}</strong>${message ? `: ${message}` : ""}`;
  time.textContent = timestamp;
  msg.style.margin = "-4px 0 -4px -1px";
  time.style.fontSize = "11px";

  const reactionBar = document.createElement("div");
  reactionBar.className = "reaction-bar";
  const emojis = ["❤️", "😂", "😮", "😢", "👍"];
  emojis.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.className = "reaction-btn";
    btn.textContent = emoji;
    btn.addEventListener("click", () => {
      const hasReacted = reactions.some(
        (r) => r.emoji === emoji && r.reactedBy === currentUser
      );
      socket.emit(hasReacted ? "remove-reaction" : "react-message", {
        messageId: _id,
        emoji,
        username: currentUser,
      });
    });
    reactionBar.appendChild(btn);
  });

  const moreBtn = document.createElement("button");
  moreBtn.className = "reaction-btn";
  moreBtn.textContent = "➕";
  moreBtn.title = "More Emojis";

  const reactPicker = createPopup(
    { hideOnEmojiSelect: false, emojiSize: "16px" },
    {
      triggerElement: moreBtn,
      referenceElement: item,
      position: "bottom-end",
    }
  );

  moreBtn.addEventListener("click", (e) => {
    e.preventDefault();
    reactPicker.toggle();
  });

  reactPicker.addEventListener("emoji:select", (e) => {
    socket.emit("react-message", {
      messageId: _id,
      emoji: e.emoji,
      username: currentUser,
    });
  });

  reactionBar.appendChild(moreBtn);

  const reactionContainer = document.createElement("div");
  reactionContainer.className = "reaction-container";
  reactions.forEach((r) => {
    const span = document.createElement("span");
    span.className = "reaction";
    span.textContent = r.emoji;
    reactionContainer.appendChild(span);
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

  item.appendChild(reactionBar);
  item.appendChild(reactionContainer);
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

  item.appendChild(msg);
  item.appendChild(time);
  item.appendChild(menuIcon);
  item.appendChild(dropdown);

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function insertAtCursor(input, emoji) {
  const [start, end] = [input.selectionStart, input.selectionEnd];
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus();
}

function showNotification(message) {
  const div = document.createElement("div");
  div.className = "chat-notification";
  div.textContent = message;
  messages.appendChild(div);
}
