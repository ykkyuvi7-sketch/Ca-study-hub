const app = {
    state: {
        view: 'home',
        subject: null,
        chapter: null,
        history: ['home']
    },

    init() {
        this.render();
        this.updateOverallProgress();
    },

    // --- DATA HANDLING ---
    getUserData(lectureId) {
        const data = localStorage.getItem(`ca_hub_${lectureId}`);
        return data ? JSON.parse(data) : { completed: false, notes: "" };
    },

    saveUserData(lectureId, status, notes) {
        localStorage.setItem(`ca_hub_${lectureId}`, JSON.stringify({ completed: status, notes: notes }));
        this.updateOverallProgress();
    },

    // --- NAVIGATION ---
    navigateTo(view, params = {}) {
        this.state.view = view;
        this.state.subject = params.subject || null;
        this.state.chapter = params.chapter || null;
        this.state.history.push({ view, ...params });
        this.render();
    },

    goBack() {
        if (this.state.history.length > 1) {
            this.state.history.pop();
            const prevState = this.state.history[this.state.history.length - 1];
            this.state.view = prevState.view;
            this.state.subject = prevState.subject;
            this.state.chapter = prevState.chapter;
            this.render();
        }
    },

    // --- RENDERING ---
    render() {
        const container = document.getElementById('main-content');
        const backBtn = document.getElementById('back-btn');
        const title = document.getElementById('page-title');
        
        // Toggle Back Button
        backBtn.className = this.state.history.length > 1 ? "" : "hidden";

        let html = "";

        if (this.state.view === 'home') {
            title.innerText = "CA Study Hub";
            html = this.renderHome();
        } else if (this.state.view === 'subject') {
            title.innerText = this.state.subject;
            html = this.renderSubject();
        } else if (this.state.view === 'chapter') {
            title.innerText = this.state.chapter;
            html = this.renderChapter();
        } else if (this.state.view === 'lecture') {
            title.innerText = "Watching Lecture";
            html = this.renderLecture(this.state.lectureId);
        } else if (this.state.view === 'search') {
            title.innerText = "Search";
            html = this.renderSearchUI();
        }

        container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    renderHome() {
        let cards = `<div class="grid">`;
        subjects.forEach(sub => {
            const count = lecturesData.filter(l => l.subject === sub).length;
            cards += `
                <div class="card" onclick="app.navigateTo('subject', {subject: '${sub}'})">
                    <h3>${sub}</h3>
                    <p style="font-size:0.7rem; color:var(--text-dim)">${count} Lectures</p>
                </div>
            `;
        });
        cards += `</div>`;
        
        // Continue Watching (Recent 3)
        const recentHtml = this.renderContinueWatching();
        return cards + recentHtml;
    },

    renderSubject() {
        const chapters = [...new Set(lecturesData
            .filter(l => l.subject === this.state.subject)
            .map(l => l.chapter))];

        return chapters.map(ch => `
            <div class="list-item" onclick="app.navigateTo('chapter', {subject: '${this.state.subject}', chapter: '${ch}'})">
                <div class="list-item-info">
                    <strong>${ch}</strong>
                </div>
                <span>→</span>
            </div>
        `).join('');
    },

    renderChapter() {
        const lectures = lecturesData.filter(l => l.subject === this.state.subject && l.chapter === this.state.chapter);
        
        return lectures.map((l, index) => {
            const userData = this.getUserData(l.id);
            return `
                <div class="list-item" onclick="app.openLecture('${l.id}')">
                    <div class="list-item-info">
                        <strong>${index + 1}. ${l.title}</strong>
                        <span>${userData.completed ? '✅ Completed' : '🕒 Not watched'}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    openLecture(id) {
        this.state.lectureId = id;
        this.navigateTo('lecture');
    },

    renderLecture(id) {
        const lecture = lecturesData.find(l => l.id === id);
        const userData = this.getUserData(id);

        return `
            <div class="video-container">
                <iframe src="https://www.youtube-nocookie.com/embed/${lecture.youtubeId}" frameborder="0" allowfullscreen></iframe>
            </div>
            <div class="lecture-content">
                <h2>${lecture.title}</h2>
                <p>${lecture.subject} • ${lecture.chapter}</p>
                
                <label>My Notes</label>
                <textarea id="note-area" placeholder="Write key points here..." onblur="app.saveNotes('${id}')">${userData.notes}</textarea>
                
                <button id="complete-btn" class="complete-btn ${userData.completed ? 'btn-done' : 'btn-not-done'}" 
                    onclick="app.toggleComplete('${id}')">
                    ${userData.completed ? 'Completed' : 'Mark as Completed'}
                </button>
            </div>
        `;
    },

    renderSearchUI() {
        return `
            <div class="search-container">
                <input type="text" id="search-input" placeholder="Search title or chapter..." oninput="app.handleSearch(this.value)">
                <div id="search-results"></div>
            </div>
        `;
    },

    handleSearch(query) {
        const resultsDiv = document.getElementById('search-results');
        if (!query) { resultsDiv.innerHTML = ""; return; }
        
        const filtered = lecturesData.filter(l => 
            l.title.toLowerCase().includes(query.toLowerCase()) || 
            l.chapter.toLowerCase().includes(query.toLowerCase())
        );

        resultsDiv.innerHTML = filtered.map(l => `
            <div class="list-item" onclick="app.openLecture('${l.id}')">
                <div class="list-item-info">
                    <strong>${l.title}</strong>
                    <span>${l.subject}</span>
                </div>
            </div>
        `).join('');
    },

    // --- LOGIC ---
    toggleComplete(id) {
        const userData = this.getUserData(id);
        const newStatus = !userData.completed;
        const notes = document.getElementById('note-area').value;
        this.saveUserData(id, newStatus, notes);
        this.render(); // Re-render to show updated button
    },

    saveNotes(id) {
        const notes = document.getElementById('note-area').value;
        const userData = this.getUserData(id);
        this.saveUserData(id, userData.completed, notes);
    },

    updateOverallProgress() {
        const total = lecturesData.length;
        let completed = 0;
        lecturesData.forEach(l => {
            if (this.getUserData(l.id).completed) completed++;
        });
        const percent = Math.round((completed / total) * 100) || 0;
        document.getElementById('overall-fill').style.width = percent + "%";
        document.getElementById('overall-percent').innerText = percent + "%";
    },

    renderContinueWatching() {
        // Logic: Show the first 3 uncompleted lectures
        const uncompleted = lecturesData.filter(l => !this.getUserData(l.id).completed).slice(0, 3);
        if (uncompleted.length === 0) return "";

        return `
            <div style="padding: 1rem 1rem 0;"><h3>Continue Watching</h3></div>
            ${uncompleted.map(l => `
                <div class="list-item" onclick="app.openLecture('${l.id}')">
                    <div class="list-item-info">
                        <strong>${l.title}</strong>
                        <span>${l.subject}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }
};

// Start the app
app.init();
