// src/components/Chatbot.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid'; // <-- Import UUID
import ChatLogo from './assets/bot_icon.jpeg';
import BotIcon from './assets/bot_icon.jpeg';
import UserIcon from './assets/user.png';
import PowerBILogo from './assets/powerbi_logo.png';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean; // Keep for LLM response streaming
}

// Keep PowerBI interfaces if still needed for data extraction
interface PowerBIVisual { name: string; key: string; title: string; data: any; }
interface PowerBIFilter { table: string; column: string; value: string; }
interface PowerBIData { pageName: string; reportId: string | null; filters: PowerBIFilter[]; visuals: PowerBIVisual[]; }

const SESSION_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]); // Only current session messages
  const [input, setInput] = useState<string>('');
  // powerBIData state might still be needed if you extract PBI info for the LLM context
  // const [powerBIData, setPowerBIData] = useState<PowerBIData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For LLM response loading
  // REMOVED: isHistoryLoading state

  const [sessionId, setSessionId] = useState<string | null>(null); // <-- NEW: Session ID state
  const [showTimeoutPopup, setShowTimeoutPopup] = useState<boolean>(false); // <-- NEW: Timeout popup state
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // <-- NEW: Ref for timeout timer

  const { visualsLoaded, metrics, getToken } = useAuthStore();
  const location = useLocation();
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // --- Utility to reset the session timeout timer ---
  const resetTimeoutTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isOpen) { // Only set timer if chatbot is open
      timeoutRef.current = setTimeout(() => {
        console.log(`Chatbot: Session ${sessionId} timed out.`);
        setShowTimeoutPopup(true); // Show the timeout popup
      }, SESSION_TIMEOUT_DURATION);
    }
  }, [isOpen, sessionId]); // Recreate timer logic if isOpen or sessionId changes

  // --- Effect to manage the timeout timer ---
  useEffect(() => {
    if (isOpen) {
      resetTimeoutTimer(); // Start timer when opened
    } else {
      // Clear timer if closed manually or via timeout confirmation
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    // Cleanup timer on component unmount or when isOpen becomes false
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, resetTimeoutTimer]); // Dependency on isOpen and the memoized reset function

  // --- Function to Save Session Data ---
  const saveSessionData = useCallback(async (reason: 'timeout' | 'manual_close') => {
    const token = getToken();
    // Check conditions: session must exist, have messages, and user authenticated
    if (!sessionId || messages.length === 0 || !token || !apiUrl) {
      console.log("Chatbot: Save conditions not met.", { sessionId, messages: messages.length, token: !!token, apiUrl: !!apiUrl });
      return; // Don't save empty or unauthenticated sessions
    }

    console.log(`Chatbot: Saving session ${sessionId} (Reason: ${reason})`);
    try {
      const response = await fetch(`${apiUrl}/api/session/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: messages, // Send the messages from the current session state
          reason: reason,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Chatbot: Failed to save session ${sessionId} - ${response.status} ${response.statusText}`, errorText);
        // Optional: Inform user save failed?
      } else {
        console.log(`Chatbot: Session ${sessionId} saved successfully.`);
      }
    } catch (error) {
      console.error(`Chatbot: Error saving session ${sessionId}:`, error);
      // Optional: Inform user save failed?
    }
  }, [apiUrl, getToken, messages, sessionId]); // Dependencies for the save function


  // --- Toggle Chatbot Visibility ---
  const toggleChatbot = (): void => {
    if (!visualsLoaded && !isOpen) { // Only check visualsLoaded when trying to open
      alert('Please wait until all visuals are rendered successfully');
      return;
    }

    const nextIsOpen = !isOpen;

    if (nextIsOpen) {
      // --> Opening the chat <--
      console.log("Chatbot: Opening...");
      const newSessionId = uuidv4(); // Generate a new unique ID for this session
      setSessionId(newSessionId);
      setMessages([]); // Start with a fresh message list
      setInput(''); // Clear input
      setShowTimeoutPopup(false); // Ensure timeout popup is hidden
      setIsOpen(true);
      console.log(`Chatbot: Started new session ${newSessionId}`);
      // Timer will be started by the useEffect [isOpen]
    } else {
      // --> Closing the chat (manually) <--
      console.log(`Chatbot: Closing manually (Session: ${sessionId})...`);
      // Save data *before* setting isOpen to false
      saveSessionData('manual_close'); // Attempt to save the session
      setIsOpen(false);
      setSessionId(null); // Clear session ID
      // Timer will be cleared by the useEffect [isOpen] cleanup
    }
  };

  // --- Handle Timeout Confirmation ---
  const handleTimeoutOk = () => {
    console.log(`Chatbot: Timeout confirmed (Session: ${sessionId}). Saving and closing...`);
    saveSessionData('timeout'); // Attempt to save session data
    setShowTimeoutPopup(false); // Hide popup
    setIsOpen(false);         // Close chatbot window
    setSessionId(null);       // Clear session ID
    // Timer should be cleared by the useEffect [isOpen] cleanup
  };


  useEffect(() => {
    // Close chatbot if navigating away (optional, but good UX)
    setIsOpen(false);
    // If closing due to navigation, decide if you want to save
    // saveSessionData('navigation_close'); // Or maybe not save on navigation?
    setSessionId(null); // Clear session on navigation
  }, [location]); // Removed saveSessionData from dependency array here

  // REMOVED: fetchChatHistory function and its useEffect

  // --- Power BI Data Extraction (Keep if needed for LLM context) ---
  // ... (keep extractRawPowerBIData, extractVisualData, formatVisualData if used in handleSend) ...
  const extractRawPowerBIData = (): string => { /* ... implementation ... */ return "";};
  const extractVisualData = async (): Promise<Record<string, any>> => { /* ... implementation ... */ return {};};
  const formatVisualData = (visualData: Record<string, any>): string => { /* ... implementation ... */ return "";};


  // --- Handle Sending a Message ---
  const handleSend = async (): Promise<void> => {
    // Prevent sending if input empty, loading, or timeout popup shown
    if (input.trim() === '' || isLoading || showTimeoutPopup) return;

    const token = getToken();
    if (!token) {
        alert("Authentication error. Please log in again.");
        return;
    }

    resetTimeoutTimer(); // <-- Reset inactivity timer on send

    const userMessage: Message = { role: 'user', content: input };
    // Update local message state for *this session*
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Add placeholder for bot response
    setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '', loading: true }]);

    try {
        // --- Prepare data for LLM ---
        const rawMetadata = extractRawPowerBIData(); // Keep if needed
        const visualData = await extractVisualData(); // Keep if needed
        const formattedVisualData = formatVisualData(visualData); // Keep if needed
        let metricsSection = '';
        if (Object.keys(metrics).length > 0) { /* ... format metrics ... */ }
        const combinedData = `${rawMetadata}${metricsSection ? '\n' + metricsSection : ''}\n\n${formattedVisualData}`; // Adjust as needed

        // Get messages *from the current session state* (excluding the loading placeholder)
        const messagesForLLM = messages.filter(msg => !(msg.role === 'assistant' && msg.loading));

        const response = await fetch(`${apiUrl}/llm-response`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: combinedData, // The dashboard context data
              messages: messagesForLLM, // Send current session messages for context
              userInput: currentInput // The new user question
            })
        });

        if (!response.ok || !response.body) {
            let errorMsg = `Network response error: ${response.status}`;
            try { const errorData = await response.json(); errorMsg = errorData.message || errorData.error || errorMsg; } catch (_) {}
            throw new Error(errorMsg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';
        let botResponseAccumulator = '';

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep potential partial line

                for (const line of lines) {
                  // SSE Processing logic...
                   if (line.startsWith('data: ')) {
                       const dataStr = line.slice(6).trim();
                       if (line.startsWith('event: error')) { console.error('Stream error event:', dataStr); }
                       else if (dataStr && dataStr.startsWith('{')) {
                           try {
                               const parsed = JSON.parse(dataStr);
                               const content = parsed.choices?.[0]?.delta?.content;
                               if (content) {
                                   botResponseAccumulator += content;
                                   // Update the last message (the loading placeholder)
                                   setMessages((prev) => {
                                       const updated = [...prev];
                                       if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                                          updated[updated.length - 1] = {
                                              ...updated[updated.length - 1],
                                              content: botResponseAccumulator,
                                              loading: true, // Keep loading true until stream ends
                                          };
                                       }
                                       return updated;
                                   });
                               }
                           } catch (err) { console.error('SSE parse error:', err, 'Data:', dataStr); }
                       } else if (dataStr === '[DONE]') {
                           done = true; // Mark stream as done based on SSE signal
                           console.log("Chatbot: LLM stream marked as [DONE]");
                       }
                   } // end if (line.startsWith('data: '))
                } // end for (const line of lines)
            } // end if (value)
        } // End while (!done)

        // --- Finalize bot message after stream ends ---
        setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
                updated[updated.length - 1].loading = false; // Set loading to false
            }
            return updated;
        });
        resetTimeoutTimer(); // <-- Reset inactivity timer again after response received

    } catch (error: any) {
        console.error('Chatbot Send Error:', error);
        // Update the bot placeholder with error message
         setMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastIndex = updatedMessages.length - 1;
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
                updatedMessages[lastIndex] = { role: 'assistant', content: `Error: ${error.message || 'Failed.'}`, loading: false };
            } else {
                // Should not happen if placeholder was added, but fallback just in case
                updatedMessages.push({ role: 'assistant', content: `Error: ${error.message || 'Failed.'}`});
            }
            return updatedMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  // --- Handle Enter Key ---
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading && !showTimeoutPopup) { // Prevent Enter during loading/popup
      handleSend();
    }
    // Optionally reset timer on typing, but might be too aggressive.
    // resetTimeoutTimer();
  };

  // --- Preload Images Effect ---
  useEffect(() => {
    // ... (keep image preloading) ...
    const botIcon = new Image(); botIcon.src = BotIcon;
    const userIcon = new Image(); userIcon.src = UserIcon;
    const chatLogo = new Image(); chatLogo.src = ChatLogo;
    const powerBi = new Image(); powerBi.src = PowerBILogo;
  }, []);

  // --- Auto-scroll Effect ---
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]); // Scroll when messages change


  // --- Render Logic ---
  return (
    <div>
      {/* Chat toggle button */}
      <button
        onClick={toggleChatbot}
        // Disable open button if visuals not loaded
        disabled={!visualsLoaded && !isOpen}
        className="fixed bottom-4 right-4 p-0 border-none bg-transparent shadow-none z-50"
        aria-label="Toggle chat"
      >
        <img
          src={ChatLogo}
          alt="Chatbot"
          className={`
            w-16 h-16 transition-opacity
            ${visualsLoaded ? 'opacity-100' : 'opacity-50'}
            rounded-full object-cover border-2 border-[#454774]
          `}
           style={{ cursor: (visualsLoaded || isOpen) ? 'pointer' : 'not-allowed' }} // Allow clicking to close even if visuals unload?
        />
        {/* Loading Indicator only for initial visual load */}
        {!visualsLoaded && !isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#454774]"></div>
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatbot-window"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 bottom-[85px] bg-white shadow-lg rounded-lg p-4 flex flex-col z-40 w-[87vw] h-[80vh] sm:w-[350px] sm:h-[450px] border-2 border-[#454774]"
            style={{ maxHeight: 'calc(100vh - 8rem)' }}
            // onClick={resetTimeoutTimer} // Optional: Reset timer on any click within the chat window
          >

            {/* Chat history area */}
            <div
              ref={chatHistoryRef}
              className="flex-1 overflow-y-auto p-2 mb-1"
            >
              {/* Initial State Message (Always shown if messages array is empty) */}
              {messages.length === 0 && (
                 <div className="flex flex-col items-center justify-center text-gray-500 py-4 text-[25px] font-bold h-full">
                  <img src={PowerBILogo} alt="Power BI Logo" className="w-12 h-12 mb-2"/>
                  PowerBI Analysis
                </div>
              )}

              {/* Render Current Session Messages */}
              {messages.map((msg, index) => (
                 // Ensure content exists before rendering (good practice)
                 msg.content || (msg.role === 'assistant' && msg.loading) ? (
                  <div
                    key={`${sessionId}-${index}`} // Use session ID + index for a more unique key within the session
                    className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                      {msg.role === 'assistant' && (
                          <img src={BotIcon} alt="Bot" className="w-9 h-9 mr-3 rounded-full flex-shrink-0 border-2 border-[#454774] self-end"/>
                      )}
                      <div
                          className={`
                            whitespace-pre-wrap break-words max-w-[75%] p-3 border-2 border-[#454774] rounded-lg
                            ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}
                          `}
                      >
                          {/* Render content or loading indicator */}
                          {msg.content}
                          {msg.loading && <span className="animate-pulse inline-block ml-1">...</span>}
                      </div>
                      {msg.role === 'user' && (
                          <img src={UserIcon} alt="User" className="w-9 h-9 ml-3 rounded-full flex-shrink-0 border-2 border-[#454774] self-end"/>
                      )}
                  </div>
                 ) : null // Don't render if no content and not loading assistant msg
              ))}
            </div> {/* End chat history area */}

            {/* Input area */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Enter your query..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 p-2 border-2 border-gray-400 focus:outline-none focus:border-[#454774] rounded-[17px]"
                // Disable input if LLM is responding or timeout popup is shown
                disabled={isLoading || showTimeoutPopup}
              />
              <button
                onClick={handleSend}
                style={{ backgroundColor: "#454774", color: 'white', padding: '8px 16px', borderRadius: '20px' }}
                // Disable send button if input empty, loading, or popup shown
                disabled={isLoading || showTimeoutPopup || input.trim() === ''}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div> {/* End input area */}

            {/* Timeout Popup */}
            {showTimeoutPopup && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-[#454774]">
                  <h3 className="text-lg font-semibold mb-4">Session Timeout</h3>
                  <p className="mb-4">Your session has expired due to inactivity.</p>
                  <button
                    onClick={handleTimeoutOk}
                    style={{ backgroundColor: "#454774", color: 'white', padding: '8px 16px', borderRadius: '20px' }}
                    className="ml-[110px] w-[80px]"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;