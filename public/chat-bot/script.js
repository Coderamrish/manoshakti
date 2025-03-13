document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
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
    const userList = document.getElementById("user-list");
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    const typingIndicator = document.getElementById("typing-indicator");
  
    let currentUser = prompt("Enter your name:");
    if (!currentUser) currentUser = "Anonymous";
  
     // Join server with therapist
  function joinServer(therapistName) {
    socket.emit("join-server", { user: currentUser, therapist: therapistName });
  }

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
  
      appendMessage("user", userMessage, currentUser);
      chatbotInput.value = "";
  
      try {
        const response = await fetch("/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userMessage }),
        });
  
        const data = await response.json();
        appendMessage("bot", data.response, "AI Therapist");
      } catch (error) {
        console.error("Error fetching response:", error);
        appendMessage("bot", "Sorry, something went wrong. Please try again.", "AI Therapist");
      }
    }
  
    // Append message to chat
    function appendMessage(sender, message, username) {
      const messageElement = document.createElement("div");
      messageElement.classList.add("message", sender);
      messageElement.innerHTML = `<strong>${username}:</strong> ${message} <span class="timestamp">${new Date().toLocaleTimeString()}</span>`;
      chatbotMessages.appendChild(messageElement);
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
  
    // Handle user chat messages
    sendBtn.addEventListener("click", () => sendChatMessage());
    userInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") sendChatMessage();
    });
  
    function sendChatMessage() {
      const message = userInput.value.trim();
      if (message === "") return;
      socket.emit("chatMessage", { user: currentUser, message: message });
      userInput.value = "";
    }
  
    // Typing indicator
    userInput.addEventListener("input", () => {
      if (userInput.value.trim() !== "") {
        socket.emit("typing");
      } else {
        socket.emit("stop-typing");
      }
    });
  
    // Listen for online users updates
    socket.on("online-users", (users) => {
        document.getElementById("user-list").innerHTML = users.map(user => `<li>${user}</li>`).join("");
      });
      
// Listen for online therapists updates
socket.on("online-therapists", (therapists) => {
    document.getElementById("therapist-list").innerHTML = therapists.map(therapist => `<li>${therapist}</li>`).join("");
  });
    // Listen for incoming messages
    socket.on("message", ({ username, msg, timestamp }) => {
      const messageElement = document.createElement("div");
      messageElement.innerHTML = `<strong>${username}:</strong> ${msg} <span class="timestamp">${timestamp}</span>`;
      chatLog.appendChild(messageElement);
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  
    // Listen for typing indicators
    socket.on("typing", (username) => {
      typingIndicator.textContent = `${username} is typing...`;
    });
  
    socket.on("stop-typing", () => {
      typingIndicator.textContent = "";
    });
  
    // WebRTC setup for video/audio calls
    let localStream;
    let remoteStream;
    let peerConnection;
  
    const servers = {
      iceServers: [
        {
          urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
        },
      ],
    };
  
    // Get local media stream
    async function startLocalStream() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    }
  
    // Create peer connection
    function createPeerConnection() {
      peerConnection = new RTCPeerConnection(servers);
  
      // Add local stream to peer connection
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  
      // Handle remote stream
      peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
      };
  
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("video-candidate", event.candidate);
        }
      };
    }
  
    // Start video call
    videoCallBtn.addEventListener("click", async () => {
      await startLocalStream();
      createPeerConnection();
  
      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("video-offer", offer);
    });
  
    // Handle video offer
    socket.on("video-offer", async (offer) => {
      await startLocalStream();
      createPeerConnection();
      await peerConnection.setRemoteDescription(offer);
  
      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("video-answer", answer);
    });
  
    // Handle video answer
    socket.on("video-answer", async (answer) => {
      await peerConnection.setRemoteDescription(answer);
    });
  
    // Handle ICE candidates
    socket.on("video-candidate", async (candidate) => {
      await peerConnection.addIceCandidate(candidate);
    });
  });