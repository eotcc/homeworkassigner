import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3E6n_VRbeW0MfEvksjvLFTwvDmx0Jk9I",
    authDomain: "nrdstut.firebaseapp.com",
    projectId: "nrdstut",
    storageBucket: "nrdstut.firebasestorage.app",
    messagingSenderId: "4814258678",
    appId: "1:4814258678:web:5f8ea96c5c930eb1c847d7",
    measurementId: "G-NWWNY3VHP6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentStudent = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Verify if Code or Name exists in `student_registrations`
window.verifyStudent = async function(event) {
    event.preventDefault();
    const inputVal = document.getElementById('studentCodeInput').value.trim();

    if (!inputVal) {
        showToast("Please enter an ID code or name.", "error");
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "student_registrations"));
        let matchedStudent = null;
        const searchUpper = inputVal.toUpperCase();

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Match against Code (id) or Full Name
            if (
                (data.id && String(data.id).toUpperCase() === searchUpper) ||
                (data.fullName && data.fullName.toUpperCase() === searchUpper) ||
                (data.firstName && data.firstName.toUpperCase() === searchUpper)
            ) {
                matchedStudent = { firestoreId: docSnap.id, ...data };
            }
        });

        if (!matchedStudent) {
            showToast("Student code or name not found in database.", "error");
            return;
        }

        currentStudent = matchedStudent;
        
        // Normalize ID to uppercase to prevent case-sensitive query issues
        currentStudent.normalizedId = String(currentStudent.id || '').toUpperCase();

        const studentName = currentStudent.fullName || `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim() || 'Student';

        document.getElementById('display-student-name').innerText = studentName;
        document.getElementById('display-student-grade').innerText = currentStudent.grade || 'N/A';
        document.getElementById('display-student-id').innerText = currentStudent.id || 'N/A';
        document.getElementById('header-student-name').innerText = studentName;

        document.getElementById('step-login').classList.add('hidden');
        document.getElementById('step-messaging').classList.remove('hidden');
        document.getElementById('student-badge').classList.remove('hidden');
        document.getElementById('student-badge').classList.add('flex');

        showToast(`Welcome back, ${studentName}!`, 'success');
        await fetchStudentMessages();

    } catch (error) {
        console.error("Verification error:", error);
        showToast("Error querying database.", "error");
    }
};

// Send message to Firebase
window.sendStudentMessage = async function(event) {
    event.preventDefault();
    if (!currentStudent) return;

    const messageInput = document.getElementById('messageText');
    const content = messageInput.value.trim();

    if (!content) return;

    const payload = {
        id: currentStudent.normalizedId || String(currentStudent.id || '').toUpperCase(),
        studentName: currentStudent.fullName || `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim(),
        grade: currentStudent.grade || 'N/A',
        message: content,
        createdAt: new Date().toISOString(),
        sender: 'student'
    };

    try {
        await addDoc(collection(db, "student_communications"), payload);
        messageInput.value = '';
        showToast("Message sent to teacher!", "success");
        await fetchStudentMessages();
    } catch (error) {
        console.error("Sending message error:", error);
        showToast("Failed to send message.", "error");
    }
};

// Fetch ONLY messages for this student (privacy protected)
async function fetchStudentMessages() {
    if (!currentStudent) return;
    const container = document.getElementById('student-messages-list');

    try {
        const studentIdQuery = currentStudent.normalizedId || String(currentStudent.id || '').toUpperCase();
        const q = query(
            collection(db, "student_communications"),
            where("id", "==", studentIdQuery)
        );
        const querySnapshot = await getDocs(q);

        let messages = [];
        querySnapshot.forEach((docSnap) => {
            messages.push(docSnap.data());
        });

        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        if (messages.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No messages yet.</p>`;
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="message-bubble ${msg.sender === 'admin' || msg.sender === 'teacher' ? 'bg-indigo-50 border-indigo-200 text-indigo-900 ml-4' : 'bg-white border-slate-200 text-slate-800 mr-4'} border rounded-xl p-3 text-xs shadow-sm">
                <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span class="font-bold ${msg.sender === 'admin' || msg.sender === 'teacher' ? 'text-indigo-600' : 'text-slate-600'}">
                        ${msg.sender === 'admin' || msg.sender === 'teacher' ? 'Teacher Response' : 'You'}
                    </span>
                    <span>${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p class="whitespace-pre-wrap">${escapeHtml(msg.message)}</p>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

window.logoutStudent = function() {
    currentStudent = null;
    document.getElementById('studentCodeInput').value = '';
    document.getElementById('step-login').classList.remove('hidden');
    document.getElementById('step-messaging').classList.add('hidden');
    document.getElementById('student-badge').classList.add('hidden');
    showToast("Logged out.", "info");
};

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastMsg) return;
    toastMsg.innerText = message;
    if (toastIcon) {
        toastIcon.setAttribute('data-lucide', type === 'error' ? 'alert-circle' : 'check-circle-2');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    toast.classList.remove('translate-x-full');
    setTimeout(() => toast.classList.add('translate-x-full'), 3500);
}
