const content = document.getElementById("content");
const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("sidebar-toggle");

let chatMessages = [];

/* ========================================
   SPIDEYWEB_CANVAS_ENGINE
   Animated canvas web
   ======================================== */

let spideyCanvasAnimation = null;

function startSpideyCanvasEngine() {
    const host = document.getElementById("spidey-canvas");

    if (!host) return;

    if (spideyCanvasAnimation) {
        cancelAnimationFrame(spideyCanvasAnimation);
        spideyCanvasAnimation = null;
    }

    const oldCanvas = host.querySelector(".spidey-physics-canvas");
    if (oldCanvas) oldCanvas.remove();

    const canvas = document.createElement("canvas");
    canvas.className = "spidey-physics-canvas";

    host.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    function resize() {
        const rect = host.getBoundingClientRect();

        canvas.width = Math.max(1, Math.floor(rect.width));
        canvas.height = Math.max(1, Math.floor(rect.height));
    }

    resize();

    window.addEventListener("resize", resize, { passive: true });

    const web = {
        center: { x: 0, y: 0 },
        points: [],
        rings: 5,
        spokes: 14
    };

    function buildWeb() {
        web.center.x = canvas.width / 2;
        web.center.y = canvas.height / 2;

        web.points = [];

        const maxRadius = Math.min(
            canvas.width * 0.44,
            canvas.height * 0.44
        );

        for (let ring = 1; ring <= web.rings; ring++) {
            const radius = maxRadius * (ring / web.rings);

            for (let spoke = 0; spoke < web.spokes; spoke++) {
                const angle =
                    (Math.PI * 2 * spoke) / web.spokes;

                // Kleine variatie voor een natuurlijker web
                const wobble =
                    Math.sin(spoke * 7.13 + ring * 2.71) * 7;

                web.points.push({
                    ring,
                    spoke,
                    angle,
                    radius: radius + wobble,
                    x: 0,
                    y: 0
                });
            }
        }
    }

    buildWeb();

    const spider = {
        x: web.center.x,
        y: web.center.y,
        targetX: web.center.x,
        targetY: web.center.y,
        phase: 0,
        routeIndex: 0
    };

    function updatePoints() {
        web.center.x = canvas.width / 2;
        web.center.y = canvas.height / 2;

        for (const point of web.points) {
            point.x =
                web.center.x +
                Math.cos(point.angle) * point.radius;

            point.y =
                web.center.y +
                Math.sin(point.angle) * point.radius;
        }
    }

    function drawThread(x1, y1, x2, y2, alpha) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle =
            "rgba(122, 170, 170, " + alpha + ")";
        ctx.lineWidth = 0.65;
        ctx.stroke();
    }

    function drawWeb() {
        updatePoints();

        // Draden vanuit het midden
        for (let spoke = 0; spoke < web.spokes; spoke++) {
            const first = web.points.find(
                point =>
                    point.ring === 1 &&
                    point.spoke === spoke
            );

            if (first) {
                drawThread(
                    web.center.x,
                    web.center.y,
                    first.x,
                    first.y,
                    0.55
                );
            }
        }

        // Verbindingen tussen de ringen
        for (let ring = 1; ring <= web.rings; ring++) {
            for (let spoke = 0; spoke < web.spokes; spoke++) {
                const current = web.points.find(
                    point =>
                        point.ring === ring &&
                        point.spoke === spoke
                );

                const next = web.points.find(
                    point =>
                        point.ring === ring &&
                        point.spoke ===
                            ((spoke + 1) % web.spokes)
                );

                if (current && next) {
                    drawThread(
                        current.x,
                        current.y,
                        next.x,
                        next.y,
                        0.42
                    );
                }

                const outer = web.points.find(
                    point =>
                        point.ring === ring + 1 &&
                        point.spoke === spoke
                );

                if (current && outer) {
                    drawThread(
                        current.x,
                        current.y,
                        outer.x,
                        outer.y,
                        0.38
                    );
                }
            }
        }

        // Kleine punten, gebaseerd op de techniek
        // die zichtbaar is in het script uit de video.
        for (const point of web.points) {
            ctx.beginPath();
            ctx.arc(
                point.x,
                point.y,
                1.3,
                0,
                2 * Math.PI
            );

            ctx.fillStyle = "#7AA";
            ctx.fill();
        }
    }

    // Bouw een route die alleen over aangrenzende
    // draden en knooppunten van het web loopt.
    function buildSpiderRoute() {
        const route = [];

        // Start in het midden van het web.
        route.push({
            x: web.center.x,
            y: web.center.y
        });

        let spoke = 0;

        // Loop van het midden naar de buitenste ring.
        for (let ring = 1; ring <= web.rings; ring++) {
            const point = web.points.find(
                item =>
                    item.ring === ring &&
                    item.spoke === spoke
            );

            if (point) {
                route.push(point);
            }
        }

        // Daarna langs de buitenste ring.
        for (let step = 1; step < web.spokes; step++) {
            const point = web.points.find(
                item =>
                    item.ring === web.rings &&
                    item.spoke ===
                        ((spoke + step) % web.spokes)
            );

            if (point) {
                route.push(point);
            }
        }

        // Kies een andere spaak en loop terug naar binnen.
        spoke = Math.floor(web.spokes / 2);

        for (let ring = web.rings; ring >= 1; ring--) {
            const point = web.points.find(
                item =>
                    item.ring === ring &&
                    item.spoke === spoke
            );

            if (point) {
                route.push(point);
            }
        }

        // Terug naar het midden.
        route.push({
            x: web.center.x,
            y: web.center.y
        });

        return route;
    }

    let spiderRoute = buildSpiderRoute();

    function chooseNextTarget() {
        // Bouw de route opnieuw als het venster is gewijzigd.
        if (!spiderRoute.length) {
            spiderRoute = buildSpiderRoute();
        }

        const point =
            spiderRoute[
                spider.routeIndex % spiderRoute.length
            ];

        spider.routeIndex += 1;

        if (point) {
            spider.targetX = point.x;
            spider.targetY = point.y;
        }
    }

    chooseNextTarget();

    function updateSpider() {
        const dx = spider.targetX - spider.x;
        const dy = spider.targetY - spider.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 2) {
            chooseNextTarget();
        } else {
            const speed = 0.9;

            spider.x += (dx / distance) * speed;
            spider.y += (dy / distance) * speed;
        }

        spider.phase += 0.22;
    }

    function drawSpider() {
        ctx.save();

        const dx = spider.targetX - spider.x;
        const dy = spider.targetY - spider.y;
        const angle = Math.atan2(dy, dx);

        ctx.translate(spider.x, spider.y);
        ctx.rotate(angle + Math.PI / 2);

        // Acht bewegende poten
        ctx.strokeStyle = "#15191a";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";

        for (let i = 0; i < 4; i++) {
            const y = -6 + i * 4;
            const step =
                Math.sin(spider.phase + i * 1.4) * 2;

            // Linker poot
            ctx.beginPath();
            ctx.moveTo(-3, y);
            ctx.lineTo(-10 - step, y - 4);
            ctx.lineTo(-14 - step, y - 1);
            ctx.stroke();

            // Rechter poot
            ctx.beginPath();
            ctx.moveTo(3, y);
            ctx.lineTo(10 + step, y - 4);
            ctx.lineTo(14 + step, y - 1);
            ctx.stroke();
        }

        // Lichaam
        ctx.fillStyle = "#0d0f10";

        ctx.beginPath();
        ctx.ellipse(0, 4, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kop
        ctx.beginPath();
        ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function animate() {
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        drawWeb();
        updateSpider();
        drawSpider();

        spideyCanvasAnimation =
            requestAnimationFrame(animate);
    }

    animate();
}



/* =========================================
   SPIDEYWEB_DOSSIER_EXTENSION
   ========================================= */

function openSpideyPersonForm(parentId = null) {
    const existing = document.getElementById("spidey-person-form");

    if (existing) existing.remove();

    const form = document.createElement("div");
    form.id = "spidey-person-form";
    form.className = "spidey-form-overlay";

    form.innerHTML = `
        <div class="spidey-form-box">

            <div class="spidey-form-header">
                ${parentId ? "ADD CONNECTION" : "ADD PERSON"}
            </div>

            <label>FULL NAME</label>
            <input id="spidey-form-name" placeholder="Name">

            <label>DATE OF BIRTH</label>
            <input id="spidey-form-birthdate" type="date">

            <label>EMAIL ADDRESSES</label>
            <textarea
                id="spidey-form-emails"
                placeholder="One email per line"
            ></textarea>

            <label>PHONE NUMBERS</label>
            <textarea
                id="spidey-form-phones"
                placeholder="One number per line"
            ></textarea>

            <label>SOCIAL / PUBLIC LINKS</label>
            <textarea
                id="spidey-form-social"
                placeholder="One link per line"
            ></textarea>

            <label>NOTES</label>
            <textarea
                id="spidey-form-notes"
                placeholder="Optional notes"
            ></textarea>

            <div class="spidey-form-actions">
                <button id="spidey-form-cancel">CANCEL</button>
                <button id="spidey-form-save">SAVE PERSON</button>
            </div>

        </div>
    `;

    document.body.appendChild(form);

    document.getElementById("spidey-form-cancel")
        .addEventListener("click", () => form.remove());

    document.getElementById("spidey-form-save")
        .addEventListener("click", async () => {

            const name = document
                .getElementById("spidey-form-name")
                .value.trim();

            if (!name) {
                alert("Enter a name first.");
                return;
            }

            const splitLines = (value) =>
                value
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean);

            const person = {
                id: "person-" + Date.now(),
                name: name,
                birthdate: document
                    .getElementById("spidey-form-birthdate")
                    .value,

                emails: splitLines(
                    document.getElementById("spidey-form-emails").value
                ),

                phones: splitLines(
                    document.getElementById("spidey-form-phones").value
                ),

                socialLinks: splitLines(
                    document.getElementById("spidey-form-social").value
                ),

                notes: document
                    .getElementById("spidey-form-notes")
                    .value.trim(),

                parentId: parentId,
                createdAt: new Date().toISOString()
            };

            spideyWebData.people.push(person);

            if (parentId) {
                spideyWebData.connections.push({
                    id: "connection-" + Date.now(),
                    from: parentId,
                    to: person.id
                });
            }

            await saveSpideyWeb();

            form.remove();

            renderSpideyWeb();
        });
}

function calculateSpideyAge(birthdate) {
    if (!birthdate) return "";

    const birth = new Date(birthdate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();

    if (
        month < 0 ||
        (month === 0 && today.getDate() < birth.getDate())
    ) {
        age--;
    }

    return age;
}

/* ================================
   SPIDEYWEB_MODULE
   ================================ */

let spideyWebUnlocked = false;
let spideyWebData = {
    people: [],
    connections: []
};

async function loadSpideyWebData() {
    if (!window.voidx || !window.voidx.getSpideyWebData) {
        console.error("SpideyWeb API niet beschikbaar.");
        return;
    }

    try {
        spideyWebData = await window.voidx.getSpideyWebData();

        if (!spideyWebData.people) {
            spideyWebData.people = [];
        }

        if (!spideyWebData.connections) {
            spideyWebData.connections = [];
        }
    }
    catch (error) {
        console.error("SpideyWeb laden mislukt:", error);
    }
}

async function saveSpideyWeb() {
    if (!window.voidx || !window.voidx.saveSpideyWebData) {
        console.error("SpideyWeb opslag API niet beschikbaar.");
        return;
    }

    try {
        await window.voidx.saveSpideyWebData(spideyWebData);
    }
    catch (error) {
        console.error("SpideyWeb opslaan mislukt:", error);
    }
}


/* ================================
   SPIDEYWEB_SPIDER_MOVEMENT
   ================================ */

let spideySpiderAnimation = null;

function startSpideySpider() {
    const canvas = document.getElementById("spidey-canvas");
    const spider = document.querySelector(".spidey-spider");

    if (!canvas || !spider) return;

    if (spideySpiderAnimation) {
        cancelAnimationFrame(spideySpiderAnimation);
    }

    const points = [
        { x: 50, y: 8 },
        { x: 72, y: 25 },
        { x: 90, y: 50 },
        { x: 72, y: 75 },
        { x: 50, y: 92 },
        { x: 28, y: 75 },
        { x: 10, y: 50 },
        { x: 28, y: 25 },
        { x: 50, y: 50 }
    ];

    let currentPoint = 0;
    let nextPoint = 1;
    let progress = 0;

    function animateSpider() {
        const from = points[currentPoint];
        const to = points[nextPoint];

        progress += 0.0022;

        if (progress >= 1) {
            progress = 0;
            currentPoint = nextPoint;
            nextPoint = (nextPoint + 1) % points.length;
        }

        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;

        const angle = Math.atan2(
            to.y - from.y,
            to.x - from.x
        ) * (180 / Math.PI);

        spider.style.left = x + "%";
        spider.style.top = y + "%";
        spider.style.transform =
            "translate(-50%, -50%) rotate(" + angle + "deg)";

        spideySpiderAnimation =
            requestAnimationFrame(animateSpider);
    }

    animateSpider();
}

function renderSpideyWeb() {
    const canvas = document.getElementById("spidey-canvas");
    const profile = document.getElementById("spidey-profile");

    if (!canvas || !profile) return;

    // Posities van het centrum en de personen.
    const center = { x: 50, y: 50 };

    const positions = spideyWebData.people.map((person, index) => {
        const total = Math.max(spideyWebData.people.length, 1);
        const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;

        // Afwisselende afstand maakt het web minder kunstmatig.
        const radius = 27 + ((index % 3) * 7);

        return {
            id: person.id,
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        };
    });

    // Echte SVG-draden bouwen.
    let webLines = "";

    // Centrum naar iedere persoon.
    positions.forEach(position => {
        webLines += `
            <line
                class="web-thread spidey-route"
                x1="${center.x}"
                y1="${center.y}"
                x2="${position.x}"
                y2="${position.y}"
            />
        `;
    });

    // Personen onderling verbinden, zodat een echt netwerk ontstaat.
    if (positions.length > 1) {
        positions.forEach((position, index) => {
            const next = positions[(index + 1) % positions.length];

            webLines += `
                <line
                    class="web-thread spidey-route"
                    x1="${position.x}"
                    y1="${position.y}"
                    x2="${next.x}"
                    y2="${next.y}"
                />
            `;
        });
    }

    // SVG gebruikt percentages als viewBox-coördinaten.
    canvas.innerHTML = `
        <svg
            class="spidey-real-web"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            ${webLines}

            <circle
                class="spidey-web-center"
                cx="${center.x}"
                cy="${center.y}"
                r="1.3"
            />
        </svg>

        <div class="spidey-spider" aria-hidden="true">
    <div class="spider-leg leg-1"></div>
    <div class="spider-leg leg-2"></div>
    <div class="spider-leg leg-3"></div>
    <div class="spider-leg leg-4"></div>
    <div class="spider-body">
        <div class="spider-abdomen"></div>
        <div class="spider-thorax"></div>
    </div>
    <div class="spider-leg leg-5"></div>
    <div class="spider-leg leg-6"></div>
    <div class="spider-leg leg-7"></div>
    <div class="spider-leg leg-8"></div>
</div>

        ${spideyWebData.people.map((person, index) => {
            const position = positions[index];

            return `
                <button
                    class="spidey-person-node"
                    data-person="${person.id}"
                    style="
                        left: ${position.x}%;
                        top: ${position.y}%;
                    "
                >
                    ${escapeHtml(person.name)}
                </button>
            `;
        }).join("")}
    `;

    // De route voor de spin:
    // centrum -> persoon 1 -> persoon 2 -> enzovoort -> centrum.
    const spiderRoute = [
        center,
        ...positions.map(position => ({
            x: position.x,
            y: position.y
        })),
        center
    ];

    startSpideySpiderOnRoute(spiderRoute);

    canvas.querySelectorAll(".spidey-person-node").forEach(node => {
        node.addEventListener("click", () => {
            const person = spideyWebData.people.find(
                item => item.id === node.dataset.person
            );

            if (person) {
                showSpideyProfile(person);
            }
        });
    });

    profile.innerHTML = `
        <div class="spidey-profile-empty">
            CLICK A PERSON IN THE WEB
        </div>
    `;
}

function startSpideySpiderOnRoute(route) {
    const canvas = document.getElementById("spidey-canvas");
    const spider = canvas?.querySelector(".spidey-spider");

    if (!spider || !route || route.length < 2) return;

    if (window.spideySpiderAnimation) {
        cancelAnimationFrame(window.spideySpiderAnimation);
        window.spideySpiderAnimation = null;
    }

    let segment = 0;
    let startTime = null;

    // Pixels per seconde. De spin beweegt hierdoor
    // natuurlijker en iedere afstand krijgt de juiste tijd.
    const speed = 55;

    function animate(timestamp) {
        if (startTime === null) {
            startTime = timestamp;
        }

        const from = route[segment];
        const to = route[(segment + 1) % route.length];

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const duration =
            Math.max(800, (distance / speed) * 1000);

        let progress =
            (timestamp - startTime) / duration;

        if (progress > 1) progress = 1;

        // Gelijkmatige beweging over de draad.
        const x = from.x + dx * progress;
        const y = from.y + dy * progress;

        const angle =
            Math.atan2(dy, dx) * 180 / Math.PI;

        spider.style.left = x + "%";
        spider.style.top = y + "%";
        spider.style.transform =
            "translate(-50%, -50%) rotate(" +
            (angle + 90) + "deg)";

        if (progress >= 1) {
            segment = (segment + 1) % route.length;
            startTime = timestamp;
        }

        window.spideySpiderAnimation =
            requestAnimationFrame(animate);
    }

    window.spideySpiderAnimation =
        requestAnimationFrame(animate);
}
function showSpideyProfile(person) {
    const profile = document.getElementById("spidey-profile");

    if (!profile) return;

    profile.innerHTML = `
        <div class="spidey-profile-header">
            <div class="spidey-profile-title">PERSON DOSSIER</div>
            <h2>${escapeHtml(person.name)}</h2>

            <button
                class="spidey-delete-person"
                data-person-id="${escapeHtml(person.id)}"
            >
                REMOVE PERSON
            </button>
        </div>

        <div class="spidey-profile-section">
            <label>NOTITIES</label>
            <p>${escapeHtml(person.notes || "Geen informatie toegevoegd.")}</p>
        </div>

        <div class="spidey-profile-section">
            <label>VERBINDINGEN</label>
            <p>
                Klik later op een verbinding om een nieuw,
                dieper web te openen.
            </p>
        </div>

        <div class="spidey-profile-section">
            <label>BRONNEN & MEDIA</label>
            <p>
                Nog geen openbare bronnen of media toegevoegd.
            </p>
        </div>
    `;

    const deleteButton =
        profile.querySelector(".spidey-delete-person");

    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const confirmed = confirm(
                "Weet je zeker dat je " +
                person.name +
                " wilt verwijderen?"
            );

            if (!confirmed) return;

            // Persoon verwijderen
            spideyWebData.people =
                spideyWebData.people.filter(
                    item => item.id !== person.id
                );

            // Alle verbindingen van deze persoon verwijderen
            if (Array.isArray(spideyWebData.connections)) {
                spideyWebData.connections =
                    spideyWebData.connections.filter(
                        connection =>
                            connection.from !== person.id &&
                            connection.to !== person.id
                    );
            }

            // Opslaan en het web opnieuw tekenen
            await saveSpideyWeb();
            renderSpideyWeb();
        });
    }
}

function setupSpideyWeb() {
    const unlockButton = document.getElementById("spidey-unlock");
    const passwordInput = document.getElementById("spidey-password");

    if (unlockButton && passwordInput) {
        unlockButton.addEventListener("click", async () => {
            if (passwordInput.value.trim().toUpperCase() !== "TRACE") {
                passwordInput.value = "";
                passwordInput.placeholder = "ACCESS DENIED";
                return;
            }

            await loadSpideyWebData();

            const lockScreen =
                document.getElementById("spidey-lock-screen");

            const system =
                document.getElementById("spidey-system");

            if (lockScreen) lockScreen.style.display = "none";
            if (system) system.style.display = "grid";

            renderSpideyWeb();
        });

        passwordInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                unlockButton.click();
            }
        });
    }

    // Eén centrale klik-handler voor SpideyWeb
    document.addEventListener("click", async event => {
        const button = event.target.closest("#spidey-add-person");

        if (!button) return;

        event.preventDefault();

        const canvas = document.getElementById("spidey-canvas");

        if (!canvas) {
            alert("SpideyWeb is nog niet geladen.");
            return;
        }

        // Toon een echt invoervenster in het web
        canvas.innerHTML = `
            <div class="spidey-add-form">
                <h2>ADD PERSON</h2>

                <input
                    id="spidey-person-name"
                    type="text"
                    placeholder="FULL NAME"
                    autocomplete="off"
                >

                <textarea
                    id="spidey-person-notes"
                    placeholder="NOTES (OPTIONAL)"
                ></textarea>

                <div class="spidey-form-actions">
                    <button id="spidey-save-person">
                        SAVE PERSON
                    </button>

                    <button id="spidey-cancel-person">
                        CANCEL
                    </button>
                </div>
            </div>
        `;
    });

    // Centrale handler voor het opslaan
    document.addEventListener("click", async event => {
        const button = event.target.closest("#spidey-save-person");

        if (!button) return;

        const nameInput =
            document.getElementById("spidey-person-name");

        const notesInput =
            document.getElementById("spidey-person-notes");

        if (!nameInput || !nameInput.value.trim()) {
            alert("Vul eerst een naam in.");
            return;
        }

        if (!spideyWebData.people) {
            spideyWebData.people = [];
        }

        spideyWebData.people.push({
            id: "person-" + Date.now(),
            name: nameInput.value.trim(),
            notes: notesInput ? notesInput.value.trim() : "",
            createdAt: new Date().toISOString()
        });

        await saveSpideyWeb();

        renderSpideyWeb();
    });

    // Annuleren
    document.addEventListener("click", event => {
        const button = event.target.closest("#spidey-cancel-person");

        if (!button) return;

        renderSpideyWeb();
    });
}
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function page(title, subtitle, message) {
    return `
        <h1 class="page-title">${title}</h1>
        <div class="page-subtitle">${subtitle}</div>
        <div class="coming">${message}</div>
    `;
}

function renderChatMessages() {
    const messages = document.getElementById("chat-messages");

    if (!messages) return;

    messages.innerHTML = chatMessages.map(message => `
        <div class="chat-row ${message.sender}">
            <div class="chat-bubble">
                ${escapeHtml(message.text)}
            </div>
        </div>
    `).join("");

    messages.scrollTop = messages.scrollHeight;
}

function setupChat() {
    const input = document.getElementById("chat-input");
    const send = document.getElementById("chat-send");

    async function sendMessage() {
        const text = input.value.trim();

        if (!text) return;

        // Gebruikersbericht toevoegen
        chatMessages.push({
            role: "user",
            sender: "user",
            text: text
        });

        input.value = "";
        input.disabled = true;
        send.disabled = true;

        renderChatMessages();

        // Tijdelijk laadbericht
        const loadingMessage = {
            role: "assistant",
            sender: "void",
            text: "..."
        };

        chatMessages.push(loadingMessage);
        renderChatMessages();

        try {
            // Alleen de echte berichten naar Ollama sturen
            const conversation = chatMessages
                .filter(message => message.text !== "...")
                .map(message => ({
                    role: message.role,
                    content: message.text
                }));

            const reply = await window.voidx.chat(conversation);

            // Laadbericht vervangen
            const loadingIndex = chatMessages.indexOf(loadingMessage);

            if (loadingIndex !== -1) {
                chatMessages[loadingIndex] = {
                    role: "assistant",
                    sender: "void",
                    text: reply
                };
            }

        } catch (error) {
            console.error("Chat fout:", error);

            const loadingIndex = chatMessages.indexOf(loadingMessage);

            if (loadingIndex !== -1) {
                chatMessages[loadingIndex] = {
                    role: "assistant",
                    sender: "void",
                    text: "Er ging iets mis. Probeer het opnieuw."
                };
            }
        }

        input.disabled = false;
        send.disabled = false;

        renderChatMessages();
        input.focus();
    }

    send.addEventListener("click", sendMessage);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    renderChatMessages();
    input.focus();
}



function setupGameLaunchButtons() {
    document.querySelectorAll(".game-launch").forEach(button => {
        button.addEventListener("click", async () => {
            console.log("VOID//X LAUNCH BUTTON CLICKED");
            const gameId = button.dataset.game;

            if (!gameId || !window.voidx || !window.voidx.launchGame) {
                console.error("Game launcher is niet beschikbaar.");
                return;
            }

            const originalText = button.textContent;

            button.disabled = true;
            button.textContent = "STARTING...";

            try {
                const result = await window.voidx.launchGame(gameId);

                if (result.success) {
                    button.textContent = "RUNNING";

                    setTimeout(() => {
                        button.textContent = originalText;
                        button.disabled = false;
                    }, 2500);
                } else {
                    button.textContent = result.message || "ERROR";

                    setTimeout(() => {
                        button.textContent = originalText;
                        button.disabled = false;
                    }, 2500);
                }
            } catch (error) {
                console.error("Game launch fout:", error);

                button.textContent = "LAUNCH ERROR";

                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2500);
            }
        });
    });
}

async function loadGames() {
    const library = document.getElementById("games-library");
    const count = document.getElementById("games-count");

    if (!library || !window.voidx || !window.voidx.getGames) {
        return;
    }

    try {
        const games = await window.voidx.getGames();

        if (count) {
            count.textContent = String(games.length).padStart(2, "0");
        }

        if (!games.length) {
            library.innerHTML = `
                <div class="games-empty">
                    <div class="empty-symbol">?</div>
                    <div>
                        <h3>GEEN GAMES GEVONDEN</h3>
                        <p>De VOID//X gamebibliotheek is leeg.</p>
                    </div>
                </div>
            `;
            return;
        }

        library.innerHTML = games.map((game, index) => {
            const number = String(index + 1).padStart(2, "0");

            return `
                <div class="game-card ${index === 0 ? "featured-game" : ""}">
                    <div class="game-number">${number}</div>

                    <div class="game-info">
                        <div class="game-label">
                            ${index === 0 ? "PRIORITY GAME" : "INTEGRATED GAME"}
                        </div>

                        <h2>${escapeHtml(game.displayName || game.name)}</h2>

                        <p>${escapeHtml(
                            game.description || "Integrated VOID//X game module."
                        )}</p>

                        <div class="game-meta">
                            <span>STATUS: ${escapeHtml(game.status || "READY")}</span>
                            <span>TYPE: GAME</span>
                        </div>
                    </div>

                    <div class="game-actions">
                        <button
                            class="game-launch"
                            data-game="${escapeHtml(game.id)}"
                        >
                            LAUNCH
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        setupGameLaunchButtons();

    } catch (error) {
        console.error("Games konden niet worden geladen:", error);

        library.innerHTML = `
            <div class="games-empty">
                <div class="empty-symbol">!</div>
                <div>
                    <h3>LIBRARY ERROR</h3>
                    <p>De ingebouwde gamebibliotheek kon niet worden gelezen.</p>
                </div>
            </div>
        `;
    }
}


/* VOIDX_GLOBAL_GAME_LAUNCH_HANDLER */
document.addEventListener("click", async (event) => {
    const button = event.target.closest(".game-launch");

    if (!button) {
        return;
    }

    event.preventDefault();

    console.log("VOID//X LAUNCH BUTTON CLICKED");

    const gameId = button.dataset.game;

    console.log("VOID//X GAME ID:", gameId);

    if (!gameId) {
        console.error("Geen game-ID gevonden.");
        return;
    }

    if (!window.voidx || !window.voidx.launchGame) {
        console.error("VOID//X launcher API is niet beschikbaar.");
        return;
    }

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "STARTING...";

    try {
        const result = await window.voidx.launchGame(gameId);

        console.log("VOID//X LAUNCH RESULT:", result);

        if (result && result.success) {
            button.textContent = "RUNNING";
        }
        else {
            button.textContent =
                (result && result.message) || "LAUNCH ERROR";
        }
    }
    catch (error) {
        console.error("VOID//X LAUNCH ERROR:", error);
        button.textContent = "LAUNCH ERROR";
    }

    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 3000);
});

const pages = {
    home: () => `
        <div class="hero">
            <h1>Welkom Bij VOID//X!</h1>
            <div class="tagline">There Is No Way Back Now.</div>
            <p>Selecteer een module in het zijmenu om te beginnen.</p>

            <div class="grid">
                <div class="card"><h3>Chat</h3><p>VOID//X conversation workspace.</p></div>
                <div class="card"><h3>Scripter Tools</h3><p>Lua, Python, PowerShell en JavaScript.</p></div>
                <div class="card"><h3>V/F Editor</h3><p>Photo and video editing workspace.</p></div>
                <div class="card"><h3>Games</h3><p>Game management and launcher.</p></div>
            </div>
        </div>
    `,

    chat: () => `
        <div class="chat-page">
            <div class="chat-header">
                <div>
                    <h1 class="page-title">Chat</h1>
                    <div class="page-subtitle">VOID//X conversation workspace.</div>
                </div>
                <div class="chat-online">
                    <span class="status-dot"></span>
                    VOID//X ONLINE
                </div>
            </div>

            <div id="chat-messages" class="chat-messages"></div>

            <div class="chat-input-area">
                <textarea
                    id="chat-input"
                    placeholder="Type your message..."
                    rows="1"
                ></textarea>
                <button id="chat-send">Send</button>
            </div>
        </div>
    `,

    localai: () => page("Local AI", "Local AI environment.", "Nog geen lokaal model verbonden."),
    scripter: () => page("Scripter Tools", "Lua • Python • PowerShell • JavaScript", "De volledige scripting workspace volgt later."),
    editor: () => page("V/F Editor", "Photo and video editing environment.", "De editor wordt als aparte module gebouwd."),
    games: () => `
    <div class="games-page">
        <div class="games-header">
            <div>
                <h1 class="page-title">Games</h1>
                <div class="page-subtitle">Game management and launcher.</div>
            </div>

            <div class="games-count">
                <span id="games-count">00</span> GAMES DETECTED
            </div>
        </div>

        <div id="games-library" class="games-library">

            <div class="game-card featured-game">
                <div class="game-number">01</div>

                <div class="game-info">
                    <div class="game-label">PRIORITY GAME</div>

                    <h2>The Killing Antidote</h2>

                    <p>
                        Survival horror. Game management and launcher
                        integration will be configured here.
                    </p>

                    <div class="game-meta">
                        <span>STATUS: DETECTED</span>
                        <span>TYPE: GAME</span>
                    </div>
                </div>

                <div class="game-actions">
                    <button class="game-launch" data-game="tka">
                        LAUNCH
                    </button>
                </div>
            </div>

            <div class="games-empty">
                <div class="empty-symbol">+</div>

                <div>
                    <h3>MORE GAMES LATER</h3>
                    <p>
                        Additional games can be added to the VOID//X library.
                    </p>
                </div>
            </div>

        </div>
    </div>
`,
    spideyweb: () => `
    <div class="spidey-page">

        <div id="spidey-lock-screen" class="spidey-lock-screen">
            <div class="spidey-lock-box">
                <div class="spidey-lock-spider">🕷️</div>
                <div class="spidey-lock-title">SPIDEYWEB</div>
                <div class="spidey-lock-subtitle">
                    PRIVATE RELATIONSHIP MAPPING SYSTEM
                </div>

                <input
                    id="spidey-password"
                    type="password"
                    placeholder="ACCESS CODE"
                    autocomplete="off"
                >

                <button id="spidey-unlock">
                    UNLOCK WEB
                </button>
            </div>
        </div>

        <div id="spidey-system" class="spidey-system" style="display:none">

            <div class="spidey-header">
                <div>
                    <div class="spidey-kicker">VOID//X NETWORK</div>
                    <h1>SPIDEYWEB</h1>
                </div>

                <button id="spidey-add-person" class="spidey-add-button">
                    + ADD PERSON
                </button>
            </div>

            <div class="spidey-workspace">

                <div class="spidey-web-panel">
                    <div class="spidey-panel-title">
                        RELATIONSHIP WEB
                    </div>

                    <div id="spidey-canvas" class="spidey-canvas"></div>
                </div>

                <div class="spidey-profile-panel">
                    <div class="spidey-panel-title">
                        INFORMATION DOSSIER
                    </div>

                    <div id="spidey-profile"></div>
                </div>

            </div>

        </div>

    </div>
`,
    notes: () => page("Notes", "Local notes workspace.", "Notes module wordt later toegevoegd."),
    settings: () => page("Settings", "VOID//X system configuration.", "Instellingen worden later toegevoegd.")
};

function showPage(name) {
    const render = pages[name] || pages.home;
    content.innerHTML = render();

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.page === name);
    });

    if (name === "chat") {
        setupChat();
    }

    if (name === "games") {
        loadGames();
    }

    if (name === "spideyweb") {
        setupSpideyWeb();
    }
}

document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

showPage("home");
























