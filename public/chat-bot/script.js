document.addEventListener("DOMContentLoaded", () => {
  const chatbotContainer = document.getElementById("chatbot-container");
  const openChatbotButton = document.getElementById("open-chatbot");
  const closeChatbotButton = document.getElementById("close-chatbot");
  const sendMessageButton = document.getElementById("send-message");
  const chatbotInput = document.getElementById("chatbot-input");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatLog = document.getElementById("chat-log");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const voiceCallBtn = document.getElementById("voice-call-btn");
  const videoCallBtn = document.getElementById("video-call-btn");

  // Open Chatbot
  openChatbotButton.addEventListener("click", () => {
      chatbotContainer.style.display = "flex";
      openChatbotButton.style.display = "none";
  });

  // Close Chatbot
  closeChatbotButton.addEventListener("click", () => {
      chatbotContainer.style.display = "none";
      openChatbotButton.style.display = "block";
  });

  // Send Message
  sendMessageButton.addEventListener("click", async () => sendMessage());
  chatbotInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") sendMessage();
  });

  async function sendMessage() {
      const userMessage = chatbotInput.value.trim();
      if (!userMessage) return;

      // Add user message to chat
      appendMessage("user", userMessage);
      chatbotInput.value = "";

      // Fetch response from backend
      try {
          const response = await fetch("/groq", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: userMessage }),
          });

          const data = await response.json();
          appendMessage("bot", data.response);
      } catch (error) {
          console.error("Error fetching response:", error);
          appendMessage("bot", "Sorry, something went wrong. Please try again.");
      }
  }

  // Append message to chat
  function appendMessage(sender, message) {
      const messageElement = document.createElement("div");
      messageElement.classList.add("message", sender);
      messageElement.textContent = message;
      chatbotMessages.appendChild(messageElement);
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Auto-scroll
  }

  // Handle user chat messages
  sendBtn.addEventListener("click", () => sendChatMessage());
  userInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") sendChatMessage();
  });

  function sendChatMessage() {
      const message = userInput.value.trim();
      if (message === "") return;
      chatLog.innerHTML += `<div class='message user-message'>${message}</div>`;
      userInput.value = "";
      chatLog.scrollTop = chatLog.scrollHeight;
  }

  // Voice Call
  voiceCallBtn.addEventListener("click", () => {
      alert("Starting voice call...");
  });

  // Video Call
  videoCallBtn.addEventListener("click", () => {
      alert("Starting video call...");
  });
});