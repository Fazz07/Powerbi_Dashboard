import { useState, useRef, useEffect } from 'react';
import ChatLogo from './chat_logo.png'; // Import the image
import BotIcon from './botIcon.png'; // Import the bot icon image
import UserIcon from './userIcon.png'; // Import the user icon image

// Define the type for messages
type Message = {
  sender: 'user' | 'bot';
  text: string;
};

const Chatbot = () => {
  // State to manage chatbot window visibility, messages list, and current input value
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);  
  const [input, setInput] = useState('');

  // Create a ref to reference the chat history container
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Toggle chatbot visibility
  const toggleChatbot = () => setIsOpen(!isOpen);

  // Handle sending a message
  const handleSend = () => {
    // Ignore empty messages
    if (input.trim() === '') return;

    // Append the user's message immediately
    const newMessages: Message[] = [
      ...messages, 
      { sender: 'user', text: input },
    ];
    setMessages(newMessages);
    setInput(''); // Clear the input field after sending

    // Simulate a delay for the bot's response (1 second delay)
    setTimeout(() => {
      // Append the bot's response after 1 second
      const botResponse: Message[] = [
        ...newMessages,
        { sender: 'bot', text: input } // The bot simply echoes the user's message for now
      ];
      setMessages(botResponse);
    }, 1000); // 1000 milliseconds = 1 second
  };

  // Handle "Enter" key press to send the message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Scroll to the bottom of the chat history when new messages are added
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]); // Re-run this effect whenever messages change

  return (
    <div>
      {/* Button to toggle the chatbot window */}
      <button
        onClick={toggleChatbot}
        className="fixed bottom-4 right-4 p-0 border-none bg-transparent shadow-none z-50"
      >
        <img 
          src={ChatLogo} 
          alt="Chat Logo" 
          className="w-16 h-16 object-contain" // Adjust image size if needed
        />
      </button>

      {/* Chatbot modal */}
      {isOpen && (
        <div 
            className="fixed right-4 w-[399px] h-96 bg-white shadow-lg rounded-lg p-4 flex flex-col z-40"
            style={{ bottom: '84px' }}
        >
          {/* Chat history container */}
          <div 
            ref={chatHistoryRef} 
            className="flex-1 overflow-y-auto p-2 mb-1 border border-gray-200 rounded-md"
          >
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`font-bold flex items-center ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Bot icon */}
                  {msg.sender === 'bot' && (
                    <img 
                      src={BotIcon} 
                      alt="Bot Icon" 
                      className="w-9 h-9 mr-1 rounded-full" // Size the bot icon and add margin
                    />
                  )}

                  {/* Message text */}
                  <span className={msg.sender === 'user' ? 'text-gray-800' : 'text-gray-800'}>
                    {msg.text}
                  </span>

                  {/* User icon */}
                  {msg.sender === 'user' && (
                    <img 
                      src={UserIcon} 
                      alt="User Icon" 
                      className="w-9 h-9 ml-1 rounded-full" // Size the user icon and add margin
                    />
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Input and send button container */}
          <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Enter your query..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 p-2 border-2 border-gray-300 rounded-lg 
                        focus:outline-none focus:border-[#7e002e]"    /* Changes the border on focus */
            />
                <button
                  onClick={handleSend}
                  style={{ backgroundColor: "#7e002e" }}
                  className="p-2 text-white rounded-lg"
                >
                  Send
                </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
