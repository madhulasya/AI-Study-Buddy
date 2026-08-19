package com.studybuddy.backend.service;

import com.studybuddy.backend.component.NoteData;
import com.studybuddy.backend.model.Note;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;

@Service
public class ChatService {

    private final NoteData noteData;
    private final RestClient restClient;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-sonnet-4-6}")
    private String model;

    public ChatService(NoteData noteData, RestClient.Builder restClientBuilder) {
        this.noteData = noteData;
        this.restClient = restClientBuilder
                .baseUrl("https://api.anthropic.com")
                .build();
    }

    public String askQuestion(String question, boolean strictMode, String image) {
        // Read key from env if properties are empty
        String activeApiKey = (apiKey == null || apiKey.trim().isEmpty()) 
                ? System.getenv("ANTHROPIC_API_KEY") 
                : apiKey;

        if (activeApiKey == null || activeApiKey.trim().isEmpty() || activeApiKey.equalsIgnoreCase("mock")) {
            System.out.println("[WARNING] ANTHROPIC_API_KEY environment variable is not configured. Running in Mock Demo Mode. StrictMode: " + strictMode);
            String lowerQuestion = question.toLowerCase();
            List<Note> activeNotes = noteData.getNotes();
            
            // Check for mock image analysis queries first
            if (lowerQuestion.contains("drawing") || lowerQuestion.contains("sketch") || lowerQuestion.contains("diagram") || lowerQuestion.contains("canvas") || lowerQuestion.contains("image")) {
                if (image != null && !image.trim().isEmpty()) {
                    if (image.startsWith("data:image/")) {
                        return "[AI Image Analyst Mock Response] I can see your hand-drawn canvas diagram! Since this is mock mode, here is a general educational overview: It is a diagram illustrating key study concepts.";
                    } else {
                        return "[AI Image Analyst Mock Response] I can see your attached image from the URL: " + image + "! Since this is mock mode, here is a general educational interpretation: It provides visual context for your note.";
                    }
                } else {
                    return "There is no image attached to the selected note. Try drawing something or attaching an image first!";
                }
            }

            // Search notes first (for both modes)
            for (Note note : activeNotes) {
                String topic = note.topic().toLowerCase();
                if (lowerQuestion.contains(topic) || 
                    (topic.contains("newton") && lowerQuestion.contains("newton")) ||
                    (topic.contains("rest") && lowerQuestion.contains("rest")) ||
                    (topic.contains("operating system") && (lowerQuestion.contains("operating system") || lowerQuestion.contains("os"))) ||
                    (topic.contains("tcp") && (lowerQuestion.contains("tcp") || lowerQuestion.contains("udp"))) ||
                    (topic.contains("oop") && (lowerQuestion.contains("oop") || lowerQuestion.contains("object-oriented") || lowerQuestion.contains("object oriented"))) ||
                    (topic.contains("relativity") && lowerQuestion.contains("relativity"))) {
                    return note.content();
                }
            }

            // If Strict Mode is ON: refuse anything not found in notes
            if (strictMode) {
                return "I can only help you with study-related questions from your notes";
            }

            // If Strict Mode is OFF: act as general-purpose assistant
            
            // 1. Check for specific baking questions (to test strict mode OFF vs ON)
            if (lowerQuestion.contains("cake") || lowerQuestion.contains("bake") || lowerQuestion.contains("recipe") || lowerQuestion.contains("pizza") || lowerQuestion.contains("cook")) {
                return "To bake a simple vanilla cake:\n1. Preheat oven to 350°F (175°C).\n2. Whisk 2.5 cups flour, 2.5 tsp baking powder, and 1/2 tsp salt.\n3. Cream 1.5 cups sugar and 1/2 cup butter, then add 3 eggs and 1 tbsp vanilla.\n4. Alternate adding the dry ingredients and 1.25 cups milk.\n5. Bake in greased pans for 30 minutes.";
            }

            // 2. Check general academic keywords
            String[] academicKeywords = {
                "math", "science", "chemistry", "physics", "biology", "history", 
                "geography", "literature", "calculus", "algebra", "programming", 
                "coding", "java", "python", "javascript", "html", "css", "computer",
                "molecule", "cell", "equation", "formula", "who is", "who was", 
                "capital", "gravity", "force", "velocity", "atom", "algebra", 
                "geometry", "president", "war", "english", "french"
            };
            boolean isAcademic = false;
            for (String keyword : academicKeywords) {
                if (lowerQuestion.contains(keyword)) {
                    isAcademic = true;
                    break;
                }
            }

            if (isAcademic) {
                return getAcademicMockResponse(lowerQuestion, question);
            }

            // 3. General chit-chat fallback in General Mode (Strict Mode OFF)
            return "[General Assistant Mock Response] I am ready to help you as a general study buddy! Your query is: '" + question + "'. Since Strict Notes Mode is OFF, I can answer anything using my general knowledge database!";
        }

        // Build the notes context
        List<Note> notes = noteData.getNotes();
        StringBuilder notesContext = new StringBuilder();
        for (Note note : notes) {
            notesContext.append("Topic: ").append(note.topic()).append("\n");
            notesContext.append("Content: ").append(note.content()).append("\n");
            if (note.image() != null && !note.image().trim().isEmpty()) {
                notesContext.append("[This note has an attached image]\n");
            }
            notesContext.append("\n");
        }

        String prompt;
        if (strictMode) {
            // Strict Notes Mode: Answer strictly using notes, refuse everything else
            prompt = String.format("""
                    You are a strict study buddy AI assistant.
                    Your behavior MUST follow these strict priority rules:
                    
                    Rule 1: Answer the student's question using ONLY the facts directly mentioned in the Study Notes provided below. Do not extrapolate, do not assume, and do not use outside knowledge.
                    
                    Rule 2: If the question cannot be answered using the provided notes (i.e. the topic is not covered, or is about a different topic, or asks for facts not present), you MUST reply with EXACTLY: "I can only help you with study-related questions from your notes" and nothing else. Do not explain why it is missing, do not attempt to answer it from general knowledge, just output the exact refusal string.
                    
                    Study Notes:
                    %s
                    
                    Student Question: %s
                    """, notesContext.toString(), question);
        } else {
            // General Mode: ChatGPT-like, using notes as optional context
            prompt = String.format("""
                    You are a general-purpose study assistant (like ChatGPT).
                    Answer the student's question using your general knowledge.
                    We have also provided the student's study notes below as optional extra context. You may reference them if relevant, but you are free to answer any question fully using your own knowledge.
                    
                    Study Notes Context (Optional):
                    %s
                    
                    Student Question: %s
                    """, notesContext.toString(), question);
        }

        AnthropicMessage userMessage = new AnthropicMessage("user", prompt);

        AnthropicRequest request = new AnthropicRequest(
                model,
                500,
                List.of(userMessage)
        );

        try {
            AnthropicResponse response = restClient.post()
                    .uri("/v1/messages")
                    .header("x-api-key", activeApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AnthropicResponse.class);

            if (response != null && response.content() != null && !response.content().isEmpty()) {
                return response.content().get(0).text();
            } else {
                return "Error: Received empty response from Anthropic API.";
            }
        } catch (RestClientException e) {
            return "Error communicating with Anthropic API: " + e.getMessage() + ". Please make sure your ANTHROPIC_API_KEY is correct.";
        } catch (Exception e) {
            return "An unexpected error occurred while communicating with the AI service: " + e.getMessage();
        }
    }

    // Anthropic API Records
    public record AnthropicRequest(
        String model,
        int max_tokens,
        List<AnthropicMessage> messages
    ) {}

    public record AnthropicMessage(
        String role,
        Object content
    ) {}

    public record AnthropicResponse(
        String id,
        String type,
        String role,
        List<AnthropicContent> content,
        String model
    ) {}

    public record AnthropicContent(
        String type,
        String text
    ) {}

    private String getAcademicMockResponse(String lowerQuestion, String originalQuestion) {
        if (lowerQuestion.contains("pillar") || lowerQuestion.contains("oop") || lowerQuestion.contains("encapsulation") || lowerQuestion.contains("polymorphism") || lowerQuestion.contains("inheritance") || lowerQuestion.contains("abstraction")) {
            return "The four pillars of Object-Oriented Programming (OOP) are:\n1. Encapsulation: Bundling data (variables) and behavior (methods) into a single class and restricting direct access (using private fields and public getters/setters).\n2. Inheritance: Allowing a subclass to inherit attributes and behaviors from a parent superclass, promoting code reuse.\n3. Polymorphism: The ability of an object or method to take on multiple forms, achieved via method overriding (runtime) and method overloading (compile-time).\n4. Abstraction: Hiding complex implementation details and exposing only the essential interface, achieved through abstract classes and interfaces.";
        } else if (lowerQuestion.contains("java")) {
            return "Java is a popular, class-based, object-oriented programming language designed to have as few implementation dependencies as possible. It runs on the Java Virtual Machine (JVM), enabling the 'Write Once, Run Anywhere' (WORA) capability, making it standard for enterprise servers, Android apps, and web backends.";
        } else if (lowerQuestion.contains("python")) {
            return "Python is a high-level, interpreted programming language known for its readability and simple syntax. It supports multiple programming paradigms (procedural, OOP, functional) and is the dominant language in data science, AI, machine learning, and automated scripting.";
        } else if (lowerQuestion.contains("javascript") || lowerQuestion.contains("js")) {
            return "JavaScript is a lightweight, interpreted scripting language with first-class functions. It is the core programming language of the web, running natively in browsers. With Node.js, it is also widely used for building servers and backend applications.";
        } else if (lowerQuestion.contains("html") || lowerQuestion.contains("css")) {
            return "HTML (HyperText Markup Language) defines the structure and semantic markup of web pages. CSS (Cascading Style Sheets) defines the styling, layouts, fonts, colors, and responsive visual properties of the HTML elements.";
        } else if (lowerQuestion.contains("math") || lowerQuestion.contains("algebra") || lowerQuestion.contains("calculus") || lowerQuestion.contains("equation") || lowerQuestion.contains("addition")) {
            return "Mathematics is the science of logical reasoning, shapes, spaces, quantities, and relationships. Algebra uses variables (like x and y) to solve equations, and Calculus explores rates of change (derivatives) and accumulations (integrals). For example, 2 + 2 = 4.";
        } else if (lowerQuestion.contains("chemistry") || lowerQuestion.contains("atom") || lowerQuestion.contains("molecule") || lowerQuestion.contains("periodic table")) {
            return "Chemistry studies the composition, structure, properties, and reactions of matter. Atoms are the basic units of chemical elements, and molecules are formed when atoms bind together. For instance, water (H2O) is a molecule of two hydrogen atoms and one oxygen atom.";
        } else if (lowerQuestion.contains("biology") || lowerQuestion.contains("cell") || lowerQuestion.contains("dna")) {
            return "Biology is the science of life and living organisms. Cells are the fundamental structural and functional building blocks of all living things, and they store the genetic blueprints and hereditary instructions in the form of DNA molecules.";
        } else if (lowerQuestion.contains("history") || lowerQuestion.contains("war") || lowerQuestion.contains("president") || lowerQuestion.contains("lincoln")) {
            return "History documents and analyzes the human past. Academic focus includes prominent historic leaders (like Abraham Lincoln, the 16th US President who preserved the Union and signed the Emancipation Proclamation), geopolitical conflicts, and societal movements.";
        } else if (lowerQuestion.contains("geography") || lowerQuestion.contains("capital") || lowerQuestion.contains("river") || lowerQuestion.contains("mountain") || lowerQuestion.contains("france") || lowerQuestion.contains("paris")) {
            return "Geography studies Earth's landscapes, environments, populations, and political borders. Examples include political capitals (such as Paris, the capital of France) and geographical features like rivers, oceans, plates, and mountains.";
        } else if (lowerQuestion.contains("physics") || lowerQuestion.contains("gravity") || lowerQuestion.contains("force") || lowerQuestion.contains("velocity") || lowerQuestion.contains("speed")) {
            return "Physics studies matter, motion, energy, and force. Gravity is an attractive force pulling objects together; on Earth, it causes falling objects to accelerate downwards at approximately 9.8 m/s².";
        }
        return "[Study Assistance] '" + originalQuestion + "' is an academic study topic. While we are in demo/mock mode, this represents an educational area (Science, Math, History, Languages, or Computer Science) that the AI assistant can explain in detail using its general study database.";
    }
}
