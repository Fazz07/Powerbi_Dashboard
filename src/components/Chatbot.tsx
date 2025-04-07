import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatLogo from './assets/bot_icon.jpeg';
import BotIcon from './assets/bot_icon.jpeg';
import UserIcon from './assets/user.png';
import PowerBILogo from './assets/powerbi_logo.png';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  loading?: boolean;
}

interface PowerBIVisual {
  name: string;
  key: string;
  title: string;
  data: any;
}

interface PowerBIFilter {
  table: string;
  column: string;
  value: string;
}

interface PowerBIData {
  pageName: string;
  reportId: string | null;
  filters: PowerBIFilter[];
  visuals: PowerBIVisual[];
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [powerBIData, setPowerBIData] = useState<PowerBIData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { visualsLoaded } = useAuthStore();
  const { metrics, parsedComponentOne, parsedComponentTwo } = useAuthStore();

  const location = useLocation();
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  /**
   * Toggles the visibility of the chatbot window.
   * If visuals are not loaded, it alerts the user.
   */
  const toggleChatbot = (): void => {
    if (!visualsLoaded) {
      alert('Please wait until all visuals are rendered successfully');
      return;
    }
    setIsOpen((prevState) => !prevState);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  /**
   * Fetches PowerBI data from the global window object.
   */
  useEffect(() => {
    const fetchPowerBIData = (): void => {
      try {
        const windowWithPowerBI = window as any;
        if (windowWithPowerBI.__powerBIData) {
          setPowerBIData(windowWithPowerBI.__powerBIData);
        }
      } catch (error) {
        console.error('Error fetching PowerBI data:', error);
      }
    };

    fetchPowerBIData();
    const intervalId = setInterval(fetchPowerBIData, 5000);
    return () => clearInterval(intervalId);
  }, [location]);

  /**
   * Extracts and formats the raw PowerBI data into a readable response.
   */
  const extractRawPowerBIData = (): string => {
    if (!powerBIData) {
      return "No PowerBI data available. Please ensure you're on a dashboard page.";
    }
    const formattedData = [
      `Current Page: ${powerBIData.pageName}`,
      `Report ID: ${powerBIData.reportId || 'N/A'}`,
      '',
      'Applied Filters:',
      ...powerBIData.filters.map(filter =>
        `- ${filter.table}.${filter.column}: ${filter.value}`
      ),
      '',
      'Available Visuals:',
      ...powerBIData.visuals.map(visual =>
        `- ${visual.title} (${visual.key})`
      )
    ].join('\n');
    return formattedData;
  };

  /**
   * Extracts data from PowerBI visuals using the PowerBI JavaScript API.
   */
  const extractVisualData = async (): Promise<Record<string, any>> => {
    const windowWithPowerBI = window as any;
    const result: Record<string, any> = {};

    try {
      if (!windowWithPowerBI.__powerBIVisualInstances) {
        return { error: "PowerBI visual instances not available" };
      }
      const visualInstancesRef = windowWithPowerBI.__powerBIVisualInstances || {};

      for (const [key, visual] of Object.entries(visualInstancesRef)) {
        if (!visual) continue;

        try {
          const page = await (visual as any).getActivePage();
          if (!page) {
            result[key] = { error: "Could not get active page" };
            continue;
          }

          const visualName = (windowWithPowerBI.__powerBIData?.visuals || [])
            .find((v: any) => v.key === key)?.name;
          if (!visualName) {
            result[key] = { error: "Visual name not found" };
            continue;
          }

          const visuals = await page.getVisuals();
          const targetVisual = visuals.find((v: any) => v.name === visualName);
          if (!targetVisual) {
            result[key] = { error: "Visual not found on active page" };
            continue;
          }

          const exportDataType = windowWithPowerBI.powerbi?.models?.ExportDataType?.Summarized || 0;
          const visualData = await targetVisual.exportData(exportDataType);
          result[key] = visualData;
        } catch (visualError) {
          console.error(`Error loading data from ${key} visual:`, visualError);
          result[key] = { 
            error: `Failed to extract data: ${visualError instanceof Error ? visualError.message : String(visualError)}` 
          };
        }
      }
      return result;
    } catch (error) {
      console.error('Error extracting visual data:', error);
      return { error: `Failed to extract visual data: ${error instanceof Error ? error.message : String(error)}` };
    }
  };

  /**
   * Formats the extracted visual data into a readable string.
   */
  const formatVisualData = (visualData: Record<string, any>): string => {
    if (!visualData || Object.keys(visualData).length === 0) {
      return "No visual data available.";
    }
  
    let formattedData = "Visual Data:\n";
    for (const [key, data] of Object.entries(visualData)) {
      formattedData += `\n## ${key} Visual:\n`;
      if (data.error) {
        formattedData += `Error: ${data.error}\n`;
        continue;
      }
      if (typeof data === 'string') {
        try {
          const dataRows = data.split('\n');
          if (dataRows.length > 0 && dataRows[0].includes(',')) {
            const headers = dataRows[0].split(',');
            formattedData += headers.join(' | ') + '\n';
            formattedData += headers.map(() => '---').join(' | ') + '\n';
            for (let i = 1; i < dataRows.length && i < 10; i++) {
              const rowValues = dataRows[i].split(',');
              formattedData += rowValues.join(' | ') + '\n';
            }
            if (dataRows.length > 10) {
              formattedData += `... (${dataRows.length - 10} more rows)\n`;
            }
          } else {
            formattedData += data + '\n';
          }
        } catch (err) {
          formattedData += `Error formatting data: ${err}\n`;
        }
      } else if (typeof data === 'object') {
        formattedData += JSON.stringify(data, null, 2) + '\n';
      } else {
        formattedData += String(data) + '\n';
      }
    }
    return formattedData;
  };

  /**
   * Handles sending a message and generating a response.
   * Uses fetch to stream response chunks and updates the UI in real time.
   */
  const handleSend = async (): Promise<void> => {
    if (input.trim() === '') return;

    // Append user's message to chat
    const newMessages: Message[] = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    const userInput = input; // Capture current input
    setInput('');
    setIsLoading(true);

    // Add an empty bot message to update with streaming response
    setMessages(prevMessages => [...prevMessages, { sender: 'bot', text: '' }]);

    try {
      // Prepare the data for the LLM
      const rawMetadata = extractRawPowerBIData();
      const visualData = await extractVisualData();
      const formattedVisualData = formatVisualData(visualData);
      
      // Build the metrics section only if the metrics are available
      let metricsSection = '';
      if (Object.keys(metrics).length > 0) {
        metricsSection = "Current Metrics:\n";
        for (const [label, value] of Object.entries(metrics)) {
          if (value !== "loading..." && value !== "N/A") {
            metricsSection += `${label}: ${value}\n`;
          }
        }
      }
    
      // Update the combinedData construction:
      const combinedData = `${rawMetadata}${metricsSection ? '\n' + metricsSection : ''}\n\n${formattedVisualData}`;
      

      // Send the request using fetch with streaming enabled
      const response = await fetch(`${apiUrl}/llm-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session: 'user123',
          data: combinedData,
          userInput: userInput
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response was not ok or streaming not supported');
      }

      // Create a reader for the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // Split the accumulated text by newlines.
          const lines = buffer.split('\n');
          // Keep the last (possibly incomplete) line in the buffer.
          buffer = lines.pop() || '';
          for (const line of lines) {
            // Process only lines that start with "data: "
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              // Check if the data string starts with '{', indicating JSON.
              if (dataStr && dataStr[0] === '{') {
                try {
                  const parsed = JSON.parse(dataStr);
                  // Extract the nested content
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Update the last bot message by appending the new content.
                    setMessages((prevMessages) => {
                      const updatedMessages = [...prevMessages];
                      const lastIndex = updatedMessages.length - 1;
                      updatedMessages[lastIndex] = {
                        ...updatedMessages[lastIndex],
                        text: updatedMessages[lastIndex].text + content,
                      };
                      return updatedMessages;
                    });
                  }
                } catch (err) {
                  console.error('Error parsing SSE data:', err, 'Data:', dataStr);
                }
              } else {
                console.warn('Skipping non-JSON SSE data:', dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('LLM Processing Error:', error);
      // Replace the last bot message with an error message
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          sender: 'bot',
          text: 'Failed to process request. Please try again.'
        };
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press in the input field.
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  useEffect(() => {
    // Preload images to ensure smooth rendering
    const botIcon = new Image();
    botIcon.src = BotIcon;

    const userIcon = new Image();
    userIcon.src = UserIcon;

    const chatLogo = new Image();
    chatLogo.src = ChatLogo;

    const powerBi = new Image();
    powerBi.src = PowerBILogo;
  }, []);

  /**
   * Auto-scrolls chat history on new messages.
   */
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Shows an initial bot message when the chat is opened.
   */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const timer = setTimeout(() => {
        setMessages(prevMessages => [
          ...prevMessages,
          { sender: 'bot', text: 'Hello, how can I help you?' }
        ]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  return (
    <div>
      {/* Chat toggle button */}
      <button
        onClick={toggleChatbot}
        disabled={!visualsLoaded}
        className="fixed bottom-4 right-4 p-0 border-none bg-transparent shadow-none z-50"
        aria-label="Toggle chat"
      >
        <img 
          src={ChatLogo} 
          alt="Chatbot" 
          className={`
            w-16 
            h-16 
            transition-opacity
            ${visualsLoaded ? 'opacity-100' : 'opacity-100'}
            rounded-full
            object-cover
            border-2
            border-[#454774]
          `}
          style={{ cursor: visualsLoaded ? 'pointer' : 'not-allowed' }}
        />
        {!visualsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t border-b border-[#454774]"></div>
          </div>
        )}
      </button>
  
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="chatbot-window"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 bottom-[85px] bg-white shadow-lg rounded-lg p-4 flex flex-col z-40
                      w-[87vw] h-[80vh] sm:w-[350px] sm:h-[450px]"
            style={{ borderColor: '#454774', borderWidth: '2px', borderStyle: 'solid', maxHeight: 'calc(100vh - 8rem)' }}
          >

            {/* Chat history */}
            <div 
              ref={chatHistoryRef} 
              className="flex-1 overflow-y-auto p-2 mb-1"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 py-4 text-[25px] font-bold h-full">
                  <img
                    src={PowerBILogo}
                    alt="Power BI Logo"
                    className="w-12 h-12 mb-2"
                  />
                  PowerBI Dashboard Analysis
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <span
                      className={`font-semibold flex items-center ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'bot' && (
                        <img 
                          src={BotIcon} 
                          alt="Bot Icon" 
                          className="w-9 h-9 mr-3 rounded-full flex-shrink-0 border-2 border-[#454774]"
                        />
                      )}
                      <div
                        className={`
                          whitespace-pre-wrap
                          break-words
                          max-w-[70%]
                          p-3
                          border-2
                          border-[#454774]
                        `}
                        style={{ borderRadius: '16px' }}
                      >
                        {msg.text}
                      </div>
  
                      {msg.sender === 'user' && (
                        <img 
                          src={UserIcon} 
                          alt="User Icon" 
                          className="w-9 h-9 ml-3 rounded-full flex-shrink-0 border-2 border-[#454774]"
                        />
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
  
            {/* Input and send button */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Enter your query..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 p-2 border-2 border-gray-400 focus:outline-none focus:border-[#454774]"
                style={{ borderRadius: '17px' }}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                style={{ backgroundColor: "#454774", color: 'white', padding: '8px 16px', borderRadius: '20px' }}
                disabled={isLoading}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  

};

export default Chatbot;
