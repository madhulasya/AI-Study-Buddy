package com.studybuddy.backend.controller;

import com.studybuddy.backend.component.NoteData;
import com.studybuddy.backend.model.Note;
import com.studybuddy.backend.service.ChatService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;
    private final NoteData noteData;

    public ChatController(ChatService chatService, NoteData noteData) {
        this.chatService = chatService;
        this.noteData = noteData;
    }

    @GetMapping("/notes")
    public List<Note> getNotes() {
        return noteData.getNotes();
    }

    @PostMapping("/notes")
    public Note createNote(@RequestBody Map<String, String> body) {
        String topic = body.get("topic");
        String content = body.get("content");
        String image = body.get("image");
        
        if (topic == null || topic.trim().isEmpty() || content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Topic and content are required.");
        }
        
        String finalImage = (image == null) ? "" : image;
        return noteData.addNote(topic, content, finalImage);
    }

    @PutMapping("/notes/{id}")
    public Note updateNote(@PathVariable String id, @RequestBody Map<String, String> body) {
        String topic = body.get("topic");
        String content = body.get("content");
        String image = body.get("image");
        
        if (topic == null || topic.trim().isEmpty() || content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Topic and content are required.");
        }
        
        String finalImage = (image == null) ? "" : image;
        Note updated = noteData.updateNote(id, topic, content, finalImage);
        if (updated == null) {
            throw new IllegalArgumentException("Note with ID " + id + " not found.");
        }
        return updated;
    }

    @DeleteMapping("/notes/{id}")
    public Map<String, Boolean> deleteNote(@PathVariable String id) {
        boolean deleted = noteData.deleteNote(id);
        return Map.of("success", deleted);
    }

    @PostMapping("/chat")
    public Map<String, String> chat(@RequestBody Map<String, Object> requestBody) {
        String question = (String) requestBody.get("question");
        Boolean strictModeObj = (Boolean) requestBody.get("strictMode");
        String image = (String) requestBody.get("image");
        
        boolean strictMode = (strictModeObj == null) ? false : strictModeObj;
        String finalImage = (image == null) ? "" : image;

        if (question == null || question.trim().isEmpty()) {
            return Map.of("answer", "Please provide a valid question.");
        }
        
        String answer = chatService.askQuestion(question, strictMode, finalImage);
        return Map.of("answer", answer);
    }

    @GetMapping("/images/search")
    public List<String> searchImages(@RequestParam String query) {
        // Build target search URI using Spring UriComponentsBuilder (properly encodes query string spaces and characters)
        String targetUri = UriComponentsBuilder.fromHttpUrl("https://api.unsplash.com/search/photos")
                .queryParam("query", query)
                .queryParam("per_page", 8)
                .build()
                .encode()
                .toUriString();
        
        System.out.println("Sending Unsplash search request URL: " + targetUri);

        String key = System.getenv("UNSPLASH_API_KEY");
        if (key == null || key.trim().isEmpty() || key.equalsIgnoreCase("mock")) {
            System.out.println("[WARNING] UNSPLASH_API_KEY is not configured. Returning curated mock educational images.");
            
            // Return 8 beautiful fallback educational/study-related stock images
            return List.of(
                "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&fit=max&q=80", // science lab
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&fit=max&q=80", // abstract science/tech
                "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&fit=max&q=80", // school homework
                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&fit=max&q=80", // notebook / studying
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&fit=max&q=80", // study writer
                "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&fit=max&q=80", // calendar schedule
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&fit=max&q=80", // group study
                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&fit=max&q=80"  // online education
            );
        }

        try {
            RestClient restClient = RestClient.create();
            Map<String, Object> response = restClient.get()
                    .uri(targetUri)
                    .header("Authorization", "Client-ID " + key)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("results")) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
                List<String> imageUrls = new ArrayList<>();
                for (Map<String, Object> item : results) {
                    Map<String, String> urls = (Map<String, String>) item.get("urls");
                    if (urls != null && urls.containsKey("regular")) {
                        imageUrls.add(urls.get("regular"));
                    } else if (urls != null && urls.containsKey("small")) {
                        imageUrls.add(urls.get("small"));
                    }
                }
                return imageUrls;
            }
        } catch (RestClientException e) {
            System.err.println("[ERROR] Failed to query Unsplash API: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("[ERROR] Unexpected error in proxy Unsplash search: " + e.getMessage());
        }

        // Fallback in case of call errors
        return List.of(
            "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&fit=max&q=80",
            "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&fit=max&q=80"
        );
    }
}
