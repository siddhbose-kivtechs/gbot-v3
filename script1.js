
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
        <span>gemini-pro</span>
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
      
      // Decode chunk
      const text = decoder.decode(value);
      
      // Split by newlines to find individual JSON objects
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          // Try to parse as JSON
          const data = JSON.parse(line);
          
          // Check if it's a chunk format
          if (data.chunk !== undefined) {
            fullResponse += data.chunk;
          }
          // Check if it's a response format
          else if (data.response !== undefined) {
            fullResponse += data.response;
          }
        } catch (e) {
          // If it's not valid JSON, just add the line as is
          fullResponse += line;
        }
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
