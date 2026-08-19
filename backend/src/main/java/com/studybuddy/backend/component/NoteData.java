package com.studybuddy.backend.component;

import com.studybuddy.backend.model.Note;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class NoteData {

    private final List<Note> notes;

    public NoteData() {
        this.notes = new CopyOnWriteArrayList<>(List.of(
            new Note(UUID.randomUUID().toString(), "Photosynthesis", 
                "Photosynthesis is the process used by plants, algae, and certain bacteria to harness energy from sunlight and turn it into chemical energy. It primarily takes place in chloroplasts using chlorophyll, the green pigment in leaves. During this process, carbon dioxide and water are converted into glucose and oxygen, which supports most life on Earth.", ""),
            new Note(UUID.randomUUID().toString(), "Newton's Laws", 
                "Newton's Laws of Motion describe the relationship between a body and the forces acting upon it, and its motion in response to those forces. The first law states that an object remains at rest or in uniform motion unless acted upon by a force. The second law defines force as mass times acceleration (F = ma). The third law states that for every action, there is an equal and opposite reaction.", ""),
            new Note(UUID.randomUUID().toString(), "REST APIs", 
                "REST (Representational State Transfer) is an architectural style for designing networked applications. It relies on a stateless, client-server communication protocol, almost always HTTP. REST APIs use standard HTTP methods like GET, POST, PUT, and DELETE to perform CRUD operations on resources, which are identified by URIs. Responses are typically formatted in JSON or XML.", ""),
            new Note(UUID.randomUUID().toString(), "Operating Systems Basics", 
                "An Operating System (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs. It acts as an intermediary between users/applications and the computer hardware. Key functions of an OS include process management, memory management, file system handling, security, and device communication.", ""),
            new Note(UUID.randomUUID().toString(), "TCP vs UDP", 
                "TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are core transport layer protocols in the IP suite. TCP is connection-oriented, providing reliable, ordered, and error-checked delivery of a stream of octets. In contrast, UDP is a connectionless, simpler protocol that sends packets (datagrams) without verifying receipt, making it faster but less reliable, suitable for real-time video or gaming.", ""),
            new Note(UUID.randomUUID().toString(), "Object-Oriented Programming", 
                "Object-Oriented Programming (OOP) is a programming paradigm based on the concept of 'objects', which can contain data and code. The four fundamental principles of OOP are Encapsulation (bundling data and methods), Inheritance (sharing traits between classes), Polymorphism (allowing objects to take multiple forms), and Abstraction (hiding complex implementation details).", "")
        ));
    }

    public List<Note> getNotes() {
        return notes;
    }

    public Note addNote(String topic, String content, String image) {
        Note note = new Note(UUID.randomUUID().toString(), topic, content, image);
        notes.add(note);
        return note;
    }

    public Note updateNote(String id, String topic, String content, String image) {
        for (int i = 0; i < notes.size(); i++) {
            if (notes.get(i).id().equals(id)) {
                Note updated = new Note(id, topic, content, image);
                notes.set(i, updated);
                return updated;
            }
        }
        return null;
    }

    public boolean deleteNote(String id) {
        return notes.removeIf(note -> note.id().equals(id));
    }
}
