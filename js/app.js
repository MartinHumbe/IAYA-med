import { createMascot } from "./mascot.js";
import { sendMessageToN8n } from "./chatService.js";

const STORAGE_KEY = "iaya_chats";
const welcomeView = document.querySelector("#welcome-view");
const conversationView = document.querySelector("#conversation-view");
const messagesContainer = document.querySelector("[data-messages]");
const chatHistory = document.querySelector("#chat-history");
const sidebar = document.querySelector("#history-sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const newChatButton = document.querySelector("#new-chat-button");
const sidebarClose = document.querySelector("#sidebar-close");
const forms = [...document.querySelectorAll("[data-message-form]")];
const inputs = [...document.querySelectorAll("[data-message-input]")];
const buttons = [...document.querySelectorAll("[data-send-button]")];
const suggestions = [...document.querySelectorAll("[data-suggestion]")];

let chats = loadChats();
let activeChatId = null;
let isSending = false;

document.querySelectorAll("[data-mascot]").forEach(createMascot);

function loadChats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error("No se pudo leer el historial:", error);
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  renderChatHistory();
}

function createId() {
  return crypto.randomUUID();
}

function resizeInput(input) {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

function syncInputs(value, source) {
  inputs.forEach((input) => {
    if (input !== source) input.value = value;
    resizeInput(input);
  });
  buttons.forEach((button) => { button.disabled = !value.trim() || isSending; });
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function updateActiveChat() {
  const chat = getActiveChat();
  if (!chat) return;
  chat.updatedAt = Date.now();
  saveChats();
}

function addMessage(text, sender, isError = false, persist = true) {
  const row = document.createElement("div");
  row.className = `message-row ${sender}`;
  const bubble = document.createElement("div");
  bubble.className = `message-bubble${isError ? " error-message" : ""}`;

  if (sender === "assistant" && !isError && window.marked) {
    bubble.innerHTML = window.marked.parse(text);
  } else {
    bubble.textContent = text;
  }

  row.append(bubble);
  messagesContainer.append(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  if (persist) {
    const chat = getActiveChat();
    if (chat) {
      chat.messages.push({ sender, text, isError });
      updateActiveChat();
    }
  }
}

function setTyping(visible) {
  const existing = messagesContainer.querySelector(".typing-row");
  if (visible && !existing) {
    const row = document.createElement("div");
    row.className = "message-row assistant typing-row";
    row.innerHTML = '<div class="message-bubble typing"><span></span><span></span><span></span></div>';
    messagesContainer.append(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else if (!visible && existing) {
    existing.remove();
  }
}

function showWelcomeView(preserveActiveId = false) {
  if (!preserveActiveId) activeChatId = null;
  isSending = false;
  conversationView.classList.remove("is-visible");
  conversationView.hidden = true;
  welcomeView.hidden = false;
  welcomeView.classList.remove("is-leaving");
  messagesContainer.innerHTML = "";
  syncInputs("", null);
  renderChatHistory();
}

function showConversationView() {
  welcomeView.classList.add("is-leaving");
  setTimeout(() => {
    welcomeView.hidden = true;
    welcomeView.classList.remove("is-leaving");
    conversationView.hidden = false;
    requestAnimationFrame(() => conversationView.classList.add("is-visible"));
  }, 280);
}

function renderStoredMessages(chat) {
  messagesContainer.innerHTML = "";
  chat.messages.forEach((message) => addMessage(message.text, message.sender, Boolean(message.isError), false));
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function openChat(chatId) {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return;
  activeChatId = chatId;
  isSending = false;
  welcomeView.hidden = true;
  welcomeView.classList.remove("is-leaving");
  conversationView.hidden = false;
  conversationView.classList.add("is-visible");
  renderStoredMessages(chat);
  syncInputs("", null);
  renderChatHistory();
  closeSidebar();
}

function deleteChat(chatId) {
  chats = chats.filter((chat) => chat.id !== chatId);
  saveChats();
  if (activeChatId === chatId) showWelcomeView();
}

function renderChatHistory() {
  chatHistory.innerHTML = "";
  [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((chat) => {
      const item = document.createElement("div");
      item.className = `chat-history-item${chat.id === activeChatId ? " is-active" : ""}`;

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "chat-select-button";
      selectButton.textContent = chat.title;
      selectButton.title = chat.title;
      selectButton.addEventListener("click", () => openChat(chat.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "chat-delete-button";
      deleteButton.textContent = "×";
      deleteButton.title = "Eliminar chat";
      deleteButton.setAttribute("aria-label", `Eliminar ${chat.title}`);
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteChat(chat.id);
      });

      item.append(selectButton, deleteButton);
      chatHistory.append(item);
    });
}

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebar.setAttribute("aria-hidden", "false");
  sidebarToggle.setAttribute("aria-expanded", "true");
  sidebarToggle.setAttribute("aria-label", "Cerrar historial");
  if (window.matchMedia("(max-width: 640px)").matches) sidebarBackdrop.classList.add("is-visible");
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebar.setAttribute("aria-hidden", "true");
  sidebarToggle.setAttribute("aria-expanded", "false");
  sidebarToggle.setAttribute("aria-label", "Abrir historial");
  sidebarBackdrop.classList.remove("is-visible");
}

async function sendMessage(value) {
  const message = value.trim();
  if (!message || isSending) return;

  if (!activeChatId) {
    activeChatId = createId();
  }

  let chat = getActiveChat();
  if (!chat) {
    chat = {
      id: activeChatId,
      title: message.length > 35 ? `${message.slice(0, 35)}…` : message,
      messages: [],
      updatedAt: Date.now()
    };
    chats.push(chat);
  }

  showConversationView();
  syncInputs("", null);
  addMessage(message, "user");
  isSending = true;
  buttons.forEach((button) => { button.disabled = true; });
  setTyping(true);

  try {
    const reply = await sendMessageToN8n(message, activeChatId);
    setTyping(false);
    addMessage(reply, "assistant");
  } catch (error) {
    setTyping(false);
    addMessage("No pude conectar con el servicio. Inténtalo de nuevo.", "assistant", true);
    console.error("Error al enviar el mensaje:", error);
  } finally {
    isSending = false;
    syncInputs("", null);
  }
}

newChatButton.addEventListener("click", () => {
  activeChatId = createId();
  closeSidebar();
  showWelcomeView(true);
});

sidebarToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("is-open")) closeSidebar();
  else openSidebar();
});
sidebarBackdrop.addEventListener("click", closeSidebar);
sidebarClose.addEventListener("click", closeSidebar);

document.addEventListener("click", (event) => {
  if (!sidebar.classList.contains("is-open")) return;
  if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
    closeSidebar();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebar.classList.contains("is-open")) {
    closeSidebar();
  }
});

inputs.forEach((input) => {
  input.addEventListener("input", () => syncInputs(input.value, input));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });
});

forms.forEach((form) => form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(form.querySelector("[data-message-input]").value);
}));

suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", () => sendMessage(suggestion.dataset.suggestion));
});

renderChatHistory();
