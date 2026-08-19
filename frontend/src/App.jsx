import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Application Data States
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState(null);

  // Chat UI States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hi! I am your AI Study Buddy. Tell me how I can help you study today! You can toggle 'Strict Notes Mode' below to restrict my answers to your library notes."
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [strictMode, setStrictMode] = useState(true); // Default Strict Mode ON

  // Editor Form States
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editContent, setEditContent] = useState('');

  // Three Image tabs selection state
  const [activeImageTab, setActiveImageTab] = useState('url'); // 'url', 'draw', 'search'

  // Tab 1: Paste URL States
  const [pastedImageUrl, setPastedImageUrl] = useState('');

  // Tab 2: HTML5 Canvas Draw States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState('pen'); // 'pen', 'eraser'
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#6366f1');

  // Tab 3: Unsplash Search States
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [selectedSearchUrl, setSelectedSearchUrl] = useState('');

  // Voice Dictation States
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Fetch all notes
  const fetchNotes = (selectId = null) => {
    fetch('http://localhost:8080/api/notes')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch study notes');
        return response.json();
      })
      .then(data => {
        setNotes(data);
        setNotesLoading(false);
        // Default select the first note if nothing is selected
        if (data.length > 0) {
          if (selectId) {
            const found = data.find(n => n.id === selectId);
            setSelectedNote(found || data[0]);
          } else if (!selectedNote) {
            setSelectedNote(data[0]);
          }
        }
      })
      .catch(err => {
        console.error(err);
        setNotesError('Could not load study notes. Verify that the backend is running.');
        setNotesLoading(false);
      });
  };

  useEffect(() => {
    fetchNotes();

    // Initialize SpeechRecognition
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setEditContent(prev => {
            const separator = prev.trim() === '' ? '' : ' ';
            return prev.trim() + separator + finalTranscript.trim();
          });
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone permission blocked. Please check your browser privacy settings.');
        }
        setIsDictating(false);
      };

      rec.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isChatOpen]);

  // Set up canvas when switching to Draw tab
  useEffect(() => {
    if (activeImageTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 600;
      canvas.height = 400;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load existing drawing if it starts with data:image
      const currentImage = isEditing ? selectedNote?.image : '';
      if (currentImage && currentImage.startsWith('data:image/')) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = currentImage;
      }
    }
  }, [activeImageTab, isEditing, selectedNote]);

  // Voice dictation controls
  const toggleDictation = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert('Speech Recognition is not supported or blocked in this browser. Please use Google Chrome or Safari.');
      return;
    }

    if (isDictating) {
      rec.stop();
      setIsDictating(false);
    } else {
      try {
        rec.start();
        setIsDictating(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Already stopped
      }
    }
    setIsDictating(false);
  };

  // HTML5 Canvas Drawing functions
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (drawingMode === 'eraser') {
      ctx.strokeStyle = '#0f172a'; // Match background color for erasing
    } else {
      ctx.strokeStyle = brushColor;
    }

    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);

    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Image search proxy call
  const handleImageSearch = async (e) => {
    if (e) e.preventDefault();
    if (!imageSearchQuery.trim()) return;

    setIsSearchingImages(true);
    try {
      const response = await fetch(`http://localhost:8080/api/images/search?query=${encodeURIComponent(imageSearchQuery.trim())}`);
      if (!response.ok) throw new Error('Unsplash image search proxy request failed');
      const data = await response.json();
      setImageSearchResults(data);
    } catch (err) {
      console.error(err);
      alert('Error searching images: ' + err.message);
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Trigger editing state and route tabs automatically
  const handleEditClick = () => {
    stopDictation();
    setIsEditing(true);
    setIsAdding(false);
    setEditTopic(selectedNote.topic);
    setEditContent(selectedNote.content);

    const existingImage = selectedNote.image || '';
    if (existingImage.startsWith('data:image/')) {
      setActiveImageTab('draw');
      setPastedImageUrl('');
      setSelectedSearchUrl('');
    } else if (existingImage.startsWith('http')) {
      setActiveImageTab('url');
      setPastedImageUrl(existingImage);
      setSelectedSearchUrl('');
    } else {
      setActiveImageTab('url');
      setPastedImageUrl('');
      setSelectedSearchUrl('');
    }

    setImageSearchQuery(selectedNote.topic);
    setImageSearchResults([]);
  };

  // Trigger adding state
  const handleAddClick = () => {
    stopDictation();
    setIsAdding(true);
    setIsEditing(false);
    setEditTopic('');
    setEditContent('');
    setActiveImageTab('url');
    setPastedImageUrl('');
    setSelectedSearchUrl('');
    setImageSearchQuery('');
    setImageSearchResults([]);
  };

  // Save Note Handler (Save Add or Save Edit)
  const handleSaveNote = async (e) => {
    e.preventDefault();
    stopDictation();
    if (!editTopic.trim() || !editContent.trim()) return;

    // Determine what image content to attach based on selected tab
    let finalImage = '';
    if (activeImageTab === 'url') {
      finalImage = pastedImageUrl.trim();
    } else if (activeImageTab === 'search') {
      finalImage = selectedSearchUrl.trim();
    } else if (activeImageTab === 'draw') {
      const canvas = canvasRef.current;
      finalImage = canvas ? canvas.toDataURL('image/png') : '';
    }

    try {
      let response;
      if (isAdding) {
        response = await fetch('http://localhost:8080/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: editTopic.trim(),
            content: editContent.trim(),
            image: finalImage
          })
        });
      } else {
        response = await fetch(`http://localhost:8080/api/notes/${selectedNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: editTopic.trim(),
            content: editContent.trim(),
            image: finalImage
          })
        });
      }

      if (!response.ok) throw new Error('Failed to save note');
      
      const savedNote = await response.json();
      
      setIsAdding(false);
      setIsEditing(false);
      setSelectedNote(savedNote);
      fetchNotes(savedNote.id);
    } catch (err) {
      console.error(err);
      alert('Error saving note: ' + err.message);
    }
  };

  // Delete Note Handler
  const handleDeleteClick = async () => {
    if (!selectedNote) return;
    if (!confirm(`Are you sure you want to delete "${selectedNote.topic}"?`)) return;

    try {
      const response = await fetch(`http://localhost:8080/api/notes/${selectedNote.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete note');
      
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      alert('Error deleting note: ' + err.message);
    }
  };

  // Chat Send Handler
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isThinking) return;

    const question = inputQuestion.trim();
    setInputQuestion('');

    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    setIsThinking(true);

    try {
      const response = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question, 
          strictMode, 
          image: selectedNote?.image || "" 
        })
      });

      if (!response.ok) throw new Error('Failed to query AI Study Buddy');

      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { 
          sender: 'ai', 
          text: 'Error: Could not retrieve response. Verify that the backend is running.',
          isError: true
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="icon">📚</span>
          <h1>AI Study Buddy</h1>
        </div>
        <p className="header-subtitle">Your interactive study dashboard</p>
      </header>

      {/* Main Wide Panel Layout */}
      <div className="main-layout">
        {/* Left Library sidebar */}
        <aside className="notes-list-sidebar">
          <div className="sidebar-header">
            <h2>Topics Library</h2>
            <button className="add-note-btn" onClick={handleAddClick}>
              ➕ Add Note
            </button>
          </div>
          <div className="sidebar-list">
            {notesLoading && (
              <div className="loading-state"><div className="spinner"></div><p>Loading notes...</p></div>
            )}
            {notesError && (
              <div className="error-state">⚠️ <p>{notesError}</p></div>
            )}
            {!notesLoading && !notesError && notes.map(note => (
              <button 
                key={note.id}
                className={`sidebar-item ${selectedNote?.id === note.id && !isAdding ? 'active' : ''}`}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                  setIsAdding(false);
                  stopDictation();
                }}
              >
                <div className="sidebar-item-left">
                  {note.image ? (
                    <img 
                      src={note.image} 
                      alt="" 
                      className="sidebar-note-thumb"
                    />
                  ) : (
                    <span className="sidebar-note-icon">📝</span>
                  )}
                  <span>{note.topic}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Note Editor and Content Area */}
        <main className="editor-workspace">
          {isAdding || isEditing ? (
            /* CRUD Edit / Create Mode */
            <form onSubmit={handleSaveNote} className="note-editor-form">
              <div className="editor-header">
                <h2>{isAdding ? 'Create New Study Note' : `Edit: ${editTopic}`}</h2>
                <div className="form-actions">
                  <button type="submit" className="btn-save">💾 Save Note</button>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(false);
                      stopDictation();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="form-group topic-group">
                <label>Note Topic</label>
                <input 
                  type="text" 
                  value={editTopic}
                  onChange={e => {
                    setEditTopic(e.target.value);
                    if (!imageSearchQuery) {
                      setImageSearchQuery(e.target.value);
                    }
                  }}
                  placeholder="e.g. Quantum Physics"
                  required
                />
              </div>

              {/* Flexible Split Editor: Left Text Content, Right Tabs + Attachment Board */}
              <div className="editor-canvas-split">
                <div className="form-group text-group">
                  <div className="textarea-header">
                    <label>Study Notes Content</label>
                    <button 
                      type="button" 
                      className={`dictate-btn ${isDictating ? 'active' : ''}`}
                      onClick={toggleDictation}
                      title={isDictating ? "Click to stop dictation" : "Click to dictate text"}
                    >
                      🎙️ {isDictating ? "Recording... (Click to Stop)" : "Dictate"}
                    </button>
                  </div>
                  <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Write detailed summaries, facts, and key concepts of the topic here..."
                    required
                  />
                </div>

                {/* Three-Way Image Attachment Board */}
                <div className="image-attachment-board">
                  <label className="section-label">Attach Illustration</label>
                  
                  {/* Tabs Toggle buttons */}
                  <div className="image-tabs-header">
                    <button 
                      type="button" 
                      className={`tab-toggle ${activeImageTab === 'url' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('url')}
                    >
                      Paste URL
                    </button>
                    <button 
                      type="button" 
                      className={`tab-toggle ${activeImageTab === 'draw' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('draw')}
                    >
                      Draw
                    </button>
                    <button 
                      type="button" 
                      className={`tab-toggle ${activeImageTab === 'search' ? 'active' : ''}`}
                      onClick={() => setActiveImageTab('search')}
                    >
                      Search
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="image-tabs-content">
                    {activeImageTab === 'url' && (
                      /* Tab 1: Paste URL */
                      <div className="tab-pane url-pane">
                        <input 
                          type="url" 
                          value={pastedImageUrl}
                          onChange={e => setPastedImageUrl(e.target.value)}
                          placeholder="Paste public image URL (https://...)"
                        />
                        {pastedImageUrl && (
                          <div className="live-preview-box">
                            <span>Live Image Preview:</span>
                            <div className="preview-container">
                              <img 
                                src={pastedImageUrl} 
                                alt="Live url preview" 
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                                onLoad={(e) => {
                                  e.target.style.display = 'block';
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeImageTab === 'draw' && (
                      /* Tab 2: Draw Sketchpad */
                      <div className="tab-pane draw-pane">
                        <div className="canvas-wrapper">
                          <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                        </div>
                        <div className="canvas-controls">
                          <button 
                            type="button" 
                            className={`control-btn ${drawingMode === 'pen' ? 'active' : ''}`}
                            onClick={() => setDrawingMode('pen')}
                          >
                            ✏️ Pen
                          </button>
                          <button 
                            type="button" 
                            className={`control-btn ${drawingMode === 'eraser' ? 'active' : ''}`}
                            onClick={() => setDrawingMode('eraser')}
                          >
                            🧽 Eraser
                          </button>
                          <button 
                            type="button" 
                            className="control-btn btn-clear"
                            onClick={clearCanvas}
                          >
                            Clear
                          </button>
                          <div className="brush-settings">
                            <span>Size: {brushSize}px</span>
                            <input 
                              type="range" 
                              min="2" 
                              max="30" 
                              value={brushSize}
                              onChange={e => setBrushSize(parseInt(e.target.value))}
                            />
                            {drawingMode === 'pen' && (
                              <input 
                                type="color" 
                                value={brushColor}
                                onChange={e => setBrushColor(e.target.value)}
                                title="Pen Color"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeImageTab === 'search' && (
                      /* Tab 3: Unsplash Search */
                      <div className="tab-pane search-pane">
                        <div className="search-bar-inline">
                          <input 
                            type="text" 
                            value={imageSearchQuery}
                            onChange={e => setImageSearchQuery(e.target.value)}
                            placeholder="Type keyword..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleImageSearch();
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={handleImageSearch} 
                            disabled={isSearchingImages || !imageSearchQuery.trim()}
                          >
                            {isSearchingImages ? '🔍 Searching...' : '🔍 Search'}
                          </button>
                        </div>

                        {/* Image Grid Selector */}
                        <div className="image-results-grid">
                          {imageSearchResults.length > 0 ? (
                            imageSearchResults.map((url, i) => (
                              <div 
                                key={i} 
                                className={`thumbnail-option ${selectedSearchUrl === url ? 'selected' : ''}`}
                                onClick={() => setSelectedSearchUrl(url)}
                              >
                                <img src={url} alt={`Unsplash option ${i + 1}`} />
                                <div className="checkmark">✓</div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-results">
                              <p>Search Unsplash keywords to find study photos!</p>
                            </div>
                          )}
                        </div>

                        {selectedSearchUrl && (
                          <div className="selected-preview-area">
                            <span>Selected Unsplash Image:</span>
                            <div className="preview-thumbnail">
                              <img src={selectedSearchUrl} alt="Selected preview" />
                              <button 
                                type="button" 
                                className="btn-remove-img"
                                onClick={() => setSelectedSearchUrl('')}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          ) : selectedNote ? (
            /* View Mode */
            <div className="note-viewer">
              <div className="viewer-header">
                <h2>{selectedNote.topic}</h2>
                <div className="viewer-actions">
                  <button className="btn-edit" onClick={handleEditClick}>✏️ Edit Note</button>
                  <button className="btn-delete" onClick={handleDeleteClick}>🗑️ Delete Note</button>
                </div>
              </div>

              <div className="viewer-split">
                <div className="note-content-text">
                  <p>{selectedNote.content}</p>
                </div>
                {selectedNote.image && (
                  <div className="note-content-drawing">
                    <h3>Attached Illustration</h3>
                    <div className="img-container">
                      <img src={selectedNote.image} alt={`${selectedNote.topic}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-workspace">
              <p>Select a note from the library or click "Add Note" to create one!</p>
            </div>
          )}
        </main>
      </div>

      {/* Floating Chat Widget */}
      <div className="floating-chat-container">
        {/* Floating Bubble Icon */}
        <button 
          className={`chat-bubble-launcher ${isChatOpen ? 'active' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Chat with Study Buddy"
        >
          {isChatOpen ? '❌' : '🤖'}
        </button>

        {/* Floating Chat Panel Box */}
        {isChatOpen && (
          <div className="floating-chat-window">
            <div className="chat-window-header">
              <div className="chat-title">
                <span className="logo-emoji">🤖</span>
                <h3>AI Study Buddy</h3>
              </div>
              
              {/* Strict Mode Toggle switch */}
              <div className="strict-mode-container">
                <span className="toggle-label" title="Force AI to strictly answer only from your notes library">
                  Strict Notes Mode
                </span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={strictMode}
                    onChange={e => setStrictMode(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            {/* Chat History Messages */}
            <div className="chat-history-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message-row ${msg.sender}-row`}>
                  {msg.sender === 'ai' && <div className="avatar">🤖</div>}
                  <div className={`message-bubble ${msg.sender}-bubble ${msg.isError ? 'error-bubble' : ''}`}>
                    <p>{msg.text}</p>
                  </div>
                  {msg.sender === 'user' && <div className="avatar user-avatar">👤</div>}
                </div>
              ))}

              {isThinking && (
                <div className="message-row ai-row">
                  <div className="avatar">🤖</div>
                  <div className="message-bubble ai-bubble thinking-bubble">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {selectedNote?.image && (
              <div className="chat-suggestions">
                <button 
                  type="button" 
                  className="suggestion-chip"
                  onClick={() => {
                    setInputQuestion("Explain the image attached to my " + selectedNote.topic + " note.");
                  }}
                  disabled={isThinking}
                >
                  🖼️ Explain Image
                </button>
              </div>
            )}

            {/* Chat Inputs */}
            <form onSubmit={handleSendChat} className="chat-window-input-form">
              <input
                type="text"
                value={inputQuestion}
                onChange={e => setInputQuestion(e.target.value)}
                placeholder="Ask me a question..."
                disabled={isThinking}
                autoFocus
              />
              <button type="submit" disabled={isThinking || !inputQuestion.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
