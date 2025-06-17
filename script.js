
// DOM Elements
const send_icon = document.querySelector(".send-icon");
const input = document.querySelector(".InputMSG");
const ContentChat = document.querySelector(".ContentChat");
const send1 = document.getElementById("send1");
const send2 = document.getElementById("send2");
const status_text = document.querySelector(".status-text");
const status_indicator = document.querySelector(".status-indicator");

// Server configuration
// const BASE_URL = 'https://hono-vercel-chat.vercel.app'; // Production
// const BASE_URL = 'http://localhost:8000'; // Development
// EC-2
const BASE_URL = 'http://18.234.226.123:5000';
const SERVER_URL = `${BASE_URL}/api/chat`;

// Configure marked.js with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// Bot status (0 = ready, 1 = busy)
let status_func_SendMsgBot = 0;
// Server connection status (0 = offline, 1 = online)
let serverStatus = 0;

// Auto-resize textarea as user types - enhanced version
input.addEventListener('input', autoResizeTextarea);

// Function to resize textarea based on content
function autoResizeTextarea() {
  // Reset height to auto to correctly calculate the new height
  input.style.height = 'auto';
  
  // Set the height to either scrollHeight or max 120px
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

// Initialize textarea height
window.addEventListener('load', function() {
  // Set initial height after a slight delay to ensure content is rendered
  setTimeout(autoResizeTextarea, 100);
});

// Reset textarea height when window is resized
window.addEventListener('resize', autoResizeTextarea);

// Reset height when the input is cleared after sending a message
function resetTextareaHeight() {
  input.style.height = '50px';
}

// Event Listeners
send_icon.addEventListener("click", SendMsgUser);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    SendMsgUser();
  }
});

// Function to update status UI
function updateStatus(state) {
  status_indicator.classList.remove('online', 'offline', 'busy');
  
  switch(state) {
    case 'online':
      status_text.textContent = "I am ready";
      status_indicator.classList.add('online');
      serverStatus = 1;
      input.disabled = false;
      input.placeholder = "Type your message here";
      send_icon.classList.remove('disabled');
      break;
    case 'offline':
      status_text.textContent = "Offline";
      status_indicator.classList.add('offline');
      serverStatus = 0;
      input.disabled = true;
      input.placeholder = "Server is offline...";
      send_icon.classList.add('disabled');
      break;
    case 'busy':
      status_text.textContent = "Thinking...";
      status_indicator.classList.add('busy');
      break;
    case 'error':
      status_text.textContent = "Server issue";
      status_indicator.classList.add('offline');
      serverStatus = 0;
      input.disabled = true;
      input.placeholder = "Server error...";
      send_icon.classList.add('disabled');
      break;
  }
}

// Function to send user message to chat
function SendMsgUser() {
  // Don't allow sending if server is offline
  if (serverStatus === 0) {
    showToast("Cannot send message: Server is offline");
    return;
  }
  
  const userMessage = input.value.trim();
  
  if (userMessage !== "" && status_func_SendMsgBot === 0) {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create and append user message element
    const userMsgElement = document.createElement("div");
    userMsgElement.classList.add("massage", "msgCaption");
    userMsgElement.setAttribute("data-user", "true");
    
    userMsgElement.innerHTML = `
      <div class="user-response">
        ${escapeHTML(userMessage)}
        <div class="time-stamp">${timeNow}</div>
        <button class="copy-btn" title="Copy"><svg width="16" height="16"><use href="#copy-icon" /></svg></button>
      </div>
    `;
    
    ContentChat.appendChild(userMsgElement);
    ContentChat.scrollTop = ContentChat.scrollHeight;
    
    // Add copy functionality to user message
    const copyButton = userMsgElement.querySelector('.copy-btn');
    copyButton.addEventListener("click", () => {
      navigator.clipboard.writeText(userMessage).then(() => {
        copyButton.innerHTML = `<svg width="16" height="16"><use href="#check-icon" /></svg>`;
        setTimeout(() => copyButton.innerHTML = `<svg width="16" height="16"><use href="#copy-icon" /></svg>`, 1500);
      });
    });
    
    // Clear input and reset height
    input.value = "";
    resetTextareaHeight();
    
    // Send message to server
    SendMsgToServer(userMessage);
  }
}

// Simple toast notification
function showToast(message) {
  // Check if a toast container exists, if not create one
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.classList.add('toast-container');
    document.body.appendChild(toastContainer);
  }
  
  // Create the toast
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.textContent = message;
  
  // Add the toast to the container
  toastContainer.appendChild(toast);
  
  // Trigger animation by adding 'show' class after a brief delay
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove the toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300); // Wait for fade out animation to complete
  }, 3000);
}

// Function to send message to server with streaming response
function SendMsgToServer(msg) {
  if (status_func_SendMsgBot === 1) return;
  
  // Update status
  status_func_SendMsgBot = 1;
  updateStatus('busy');
  
  // Show loading icon
  send1.classList.add("none");
  send2.classList.remove("none");
  
  // Create bot message container
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const botMsgElement = document.createElement("div");
  botMsgElement.classList.add("massage");
  
  botMsgElement.innerHTML = `
    <div class="bot-response">
      <div class="captionBot">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" />
        <span>gemini-flash</span>
      </div>
      <div class="markdown-content">
        <span class="typing-indicator"></span>
        <span class="typing-indicator"></span>
        <span class="typing-indicator"></span>
      </div>
      <button class="copy-btn" title="Copy"><svg width="16" height="16"><use href="#copy-icon" /></svg></button>
      <div class="time-stamp">${timeNow}</div>
    </div>
  `;
  
  ContentChat.appendChild(botMsgElement);
  ContentChat.scrollTop = ContentChat.scrollHeight;
  
  const markdownContentDiv = botMsgElement.querySelector('.markdown-content');
  const copyButton = botMsgElement.querySelector('.copy-btn');
  let fullResponse = "";

  
  // Implement streaming with fetch + reader
  fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg }),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    // Process the stream
    function processStream({ done, value }) {
      if (done) {
        // Add copy functionality once complete
        copyButton.addEventListener("click", () => {
          navigator.clipboard.writeText(fullResponse).then(() => {
            copyButton.innerHTML = `<svg width="16" height="16"><use href="#check-icon" /></svg>`;
            setTimeout(() => copyButton.innerHTML = `<svg width="16" height="16"><use href="#copy-icon" /></svg>`, 1500);
          });
        });
        
        // Update status
        if (serverStatus === 1) {
          updateStatus('online');
        }
        send1.classList.remove("none");
        send2.classList.add("none");
        status_func_SendMsgBot = 0;
        return;
      }
      
      // Decode and process chunk
      const chunk = decoder.decode(value, { stream: true });
      try {
        // For APIs that send JSON chunks
        const parsedChunk = JSON.parse(chunk);
        if (parsedChunk.response) {
          fullResponse += parsedChunk.response;
        }
      } catch (e) {
        // For APIs that send raw text
        fullResponse += chunk;
      }
      
      // Update the UI with the current response
      markdownContentDiv.innerHTML = marked.parse(fullResponse);
      ContentChat.scrollTop = ContentChat.scrollHeight;
      
      // Continue reading
      return reader.read().then(processStream);
    }
    
    return reader.read().then(processStream);
  })
  .catch(error => {
    console.error("Error:", error);
    
    let errorMessage = "⚠️ Something went wrong connecting to the server.";
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMessage = "🔌 Network error. Please check your connection or the server status.";
      // Server might be offline
      checkServerStatus();
    } else if (error.name === 'AbortError') {
      errorMessage = "⏱️ Request timed out. The server took too long to respond.";
    } else if (error.message.includes('HTTP error')) {
      errorMessage = "🚫 Server error. The API server might be down or unavailable.";
    }
    
    markdownContentDiv.innerHTML = `<div class="error">${errorMessage}</div>`;
    
    // Reset state
    if (serverStatus === 1) {
      updateStatus('online');
    } else {
      updateStatus('offline');
    }
    send1.classList.remove("none");
    send2.classList.add("none");
    status_func_SendMsgBot = 0;
  });
}

// Helper function to escape HTML
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initial Bot Greeting
function sendInitialGreeting() {
  const greetingElement = document.createElement("div");
  greetingElement.classList.add("massage");
  
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  greetingElement.innerHTML = `
    <div class="bot-response">
      <div class="captionBot">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" />
        <span>gemini-flash</span>
      </div>
      <div class="markdown-content">
        <p>👋 Hi! I'm G-Bot, powered by Google Gemini.</p>
        <p>How can I help you today?</p>
      </div>
      <button class="copy-btn" title="Copy"><svg width="16" height="16"><use href="#copy-icon" /></svg></button>
      <div class="time-stamp">${timeNow}</div>
    </div>
  `;
  
  ContentChat.appendChild(greetingElement);
  
  // Add copy functionality to greeting message
  const copyButton = greetingElement.querySelector('.copy-btn');
  copyButton.addEventListener("click", () => {
    const text = "👋 Hi! I'm G-Bot, powered by Google Gemini.\n\nHow can I help you today?";
    navigator.clipboard.writeText(text).then(() => {
      copyButton.innerHTML = `<svg width="16" height="16"><use href="#check-icon" /></svg>`;
      setTimeout(() => copyButton.innerHTML = `<svg width="16" height="16"><use href="#copy-icon" /></svg>`, 1500);
    });
  });
  
  ContentChat.scrollTop = ContentChat.scrollHeight;
}

// Display server offline message
function displayServerOfflineMessage() {
  // Check if we already have a server status message
  const existingMessages = document.querySelectorAll('.server-status-message');
  if (existingMessages.length > 0) {
    // Remove any existing server status messages to avoid duplication
    existingMessages.forEach(msg => msg.remove());
  }

  const offlineElement = document.createElement("div");
  offlineElement.classList.add("massage", "server-status-message");
  
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  offlineElement.innerHTML = `
    <div class="bot-response server-offline">
      <div class="captionBot">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" />
        <span>System</span>
      </div>
      <div class="markdown-content">
        <p>⚠️ <strong>Server is currently offline or unreachable.</strong></p>
        <p>You can still review previous messages, but new queries cannot be processed until connection is restored.</p>
        <p><em>The system will automatically reconnect when the server becomes available.</em></p>
      </div>
      <div class="time-stamp">${timeNow}</div>
    </div>
  `;
  
  ContentChat.appendChild(offlineElement);
  ContentChat.scrollTop = ContentChat.scrollHeight;
}

// Display server reconnection message
function displayServerReconnectedMessage() {
  // Check if we already have a server status message
  const existingMessages = document.querySelectorAll('.server-status-message');
  if (existingMessages.length > 0) {
    // Remove any existing server status messages to avoid duplication
    existingMessages.forEach(msg => msg.remove());
  }

  const reconnectMessage = document.createElement("div");
  reconnectMessage.classList.add("massage", "server-status-message");
  
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  reconnectMessage.innerHTML = `
    <div class="bot-response server-online">
      <div class="captionBot">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" alt="Gemini" />
        <span>System</span>
      </div>
      <div class="markdown-content">
        <p>✅ <strong>Connection restored!</strong> The server is now online.</p>
        <p>You can continue with your conversation.</p>
      </div>
      <div class="time-stamp">${timeNow}</div>
    </div>
  `;
  
  ContentChat.appendChild(reconnectMessage);
  ContentChat.scrollTop = ContentChat.scrollHeight;
}

// Check for server connectivity
function checkServerStatus() {
  return fetch(`${BASE_URL}/api/health`, { 
    method: 'GET',
    signal: AbortSignal.timeout(30000) // 30 second timeout
  })
    .then(response => {
      if (response.ok) {
        updateStatus('online');
        return true;
      } else {
        updateStatus('error');
        return false;
      }
    })
    .catch(() => {
      updateStatus('offline');
      return false;
    });
}

// Start checking server connectivity on load
window.addEventListener('load', () => {
  // Always show greeting first
  setTimeout(sendInitialGreeting, 1000);
  
  // Check server status after greeting
  setTimeout(() => {
    checkServerStatus().then(isOnline => {
      if (!isOnline) {
        // Display offline message only if server is unreachable
        displayServerOfflineMessage();
      }
    });
    
    // Set up regular checks
    setUpServerMonitoring();
  }, 2000);
});

// Enhanced server monitoring function
function setUpServerMonitoring() {
  let wasOnline = serverStatus === 1;
  
  // Check server status every 15 seconds
  const statusInterval = setInterval(() => {
    checkServerStatus().then(isOnline => {
      // If server was online but is now offline, display message
      if (wasOnline && !isOnline) {
        displayServerOfflineMessage();
      }
      // If server was offline but is now online, show reconnected message
      else if (!wasOnline && isOnline) {
        displayServerReconnectedMessage();
      }
      
      wasOnline = isOnline;
    });
  }, 15000);

  // When page is not visible, pause the checks
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(statusInterval);
    } else {
      // Immediate check when page becomes visible again
      checkServerStatus();
      
      // Restart regular checks
      setUpServerMonitoring();
    }
  });
}

// Add styles for toast notifications and server status messages
const style = document.createElement('style');
style.textContent = `
/* Toast notifications */
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.toast {
  min-width: 250px;
  margin-top: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  transform: translateY(100px);
  opacity: 0;
  transition: transform 0.3s, opacity 0.3s;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}

/* Disabled state for input and send button */
.InputMSG:disabled {
  background: #f1f1f1;
  color: #999;
}

.send-icon.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.send-icon.disabled:hover {
  transform: none;
  box-shadow: none;
}

/* Server status message styling */
.server-offline {
  background: linear-gradient(135deg, #ff5252, #b71c1c);
  box-shadow: 0 4px 12px rgba(183, 28, 28, 0.2);
}

.server-online {
  background: linear-gradient(135deg, #69de40, #388e3c);
  box-shadow: 0 4px 12px rgba(56, 142, 60, 0.2);
}

.server-status-message .markdown-content {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 10px;
  border-radius: 8px;
}
`;
document.head.appendChild(style);
