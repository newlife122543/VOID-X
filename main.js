const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");


function getGamesRoot() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "games");
    }

    return path.join(__dirname, "games");
}
function createWindow() {
    const win = new BrowserWindow({
        width: 1450,
        height: 900,
        minWidth: 1000,
        minHeight: 650,
        backgroundColor: "#09050f",
        title: "VOID//X",
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.loadFile(path.join(__dirname, "index.html"));
}

function askOllama(messages) {
    return new Promise((resolve, reject) => {
        const systemPrompt = {
            role: "system",
            content: `Je bent VOID//X.

Je bent de digitale stem van een fictieve, mysterieuze hackersgroep.
Je spreekt altijd Nederlands, tenzij de gebruiker duidelijk een andere taal gebruikt.

Je stijl:
- Kort en direct.
- Koel en zelfverzekerd.
- Soms mysterieus of droog.
- Niet overdreven vriendelijk.
- Geen standaard AI-zinnen.
- Zeg niet dat je een AI bent.
- Doe niet alsof je een echt persoon bent buiten deze chat.
- Geef normale, behulpzame antwoorden wanneer iemand een serieuze vraag stelt.

Voorbeelden van je stijl:
Gebruiker: Hallo
VOID//X: Ja. Wat wil je?

Gebruiker: Wie ben je?
VOID//X: VOID//X. Meer hoef je voorlopig niet te weten.

Gebruiker: Bedankt.
VOID//X: Maak er geen gewoonte van.`
        };

        const body = JSON.stringify({
            model: "llama3.2:3b",
            messages: [systemPrompt, ...messages],
            stream: false
        });

        const request = http.request({
            hostname: "127.0.0.1",
            port: 11434,
            path: "/api/chat",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        }, response => {
            let data = "";

            response.on("data", chunk => {
                data += chunk;
            });

            response.on("end", () => {
                try {
                    const result = JSON.parse(data);

                    if (result.message && result.message.content) {
                        resolve(result.message.content.trim());
                    } else {
                        reject(new Error("Ongeldig antwoord van Ollama."));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on("error", error => {
            reject(error);
        });

        request.write(body);
        request.end();
    });
}


/* ========================================
   VOIDX_SPIDEYWEB_API
   Local SpideyWeb data storage
   ======================================== */

const spideyWebDataPath = path.join(
    __dirname,
    "spideyweb",
    "data.json"
);

function getSpideyWebData() {
    try {
        if (!fs.existsSync(spideyWebDataPath)) {
            return {
                people: [],
                connections: []
            };
        }

        const raw = fs.readFileSync(
            spideyWebDataPath,
            "utf8"
        ).replace(/^\uFEFF/, "");

        return JSON.parse(raw);
    }
    catch (error) {
        console.error(
            "SpideyWeb data kon niet worden geladen:",
            error
        );

        return {
            people: [],
            connections: []
        };
    }
}

ipcMain.handle(
    "voidx-get-spideyweb-data",
    async () => {
        return getSpideyWebData();
    }
);

ipcMain.handle(
    "voidx-save-spideyweb-data",
    async (event, data) => {
        try {
            const directory = path.dirname(
                spideyWebDataPath
            );

            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, {
                    recursive: true
                });
            }

            fs.writeFileSync(
                spideyWebDataPath,
                JSON.stringify(data, null, 4),
                "utf8"
            );

            return {
                success: true
            };
        }
        catch (error) {
            console.error(
                "SpideyWeb data kon niet worden opgeslagen:",
                error
            );

            return {
                success: false,
                message: error.message
            };
        }
    }
);

ipcMain.handle("voidx-chat", async (event, messages) => {
    try {
        return await askOllama(messages);
    } catch (error) {
        console.error("Ollama fout:", error.message);

        return "Geen antwoord. Controleer of de lokale AI-engine beschikbaar is.";
    }
});


ipcMain.handle("voidx-get-games", async () => {
    const fs = require("fs");
    const gamesPath = getGamesRoot();

    if (!fs.existsSync(gamesPath)) {
        return [];
    }

    const folders = fs.readdirSync(gamesPath, {
        withFileTypes: true
    });

    const games = [];

    for (const folder of folders) {
        if (!folder.isDirectory()) continue;

        const infoPath = path.join(
            gamesPath,
            folder.name,
            "game.json"
        );

        if (fs.existsSync(infoPath)) {
            try {
                const info = JSON.parse(
                    fs.readFileSync(infoPath, "utf8").replace(/^\uFEFF/, "")
                );

                games.push({
                    ...info,
                    folder: folder.name,
                    integrated: true
                });
            }
            catch (error) {
                console.error(
                    "Game informatie kon niet worden gelezen:",
                    folder.name
                );
            }
        }
    }

    return games;
});

ipcMain.handle("voidx-launch-game", async (event, gameId) => {
    console.log("VOID//X GAME LAUNCH REQUEST:", gameId);
    const games = {
        "tka": {
            path: path.join(getGamesRoot(), "The-Killing-Antidote"),
            exe: "TheKillingAntidote.exe"
        },
        "dawn-break": {
            path: path.join(getGamesRoot(), "Dawn-Break", "DawnBreak"),
            exe: "DawnBreak.exe"
        }
    };

    const selectedGame = games[gameId];

    if (!selectedGame) {
        return {
            success: false,
            message: "UNKNOWN GAME"
        };
    }

    const gamePath = selectedGame.path;
    const gameExe = path.join(gamePath, selectedGame.exe);

    if (!fs.existsSync(gameExe)) {
        return {
            success: false,
            message: "GAME FILE NOT FOUND"
        };
    }

    try {
        const gameProcess = spawn(gameExe, [], {
            cwd: gamePath,
            detached: true,
            stdio: "ignore"
        });

        gameProcess.unref();

        return {
            success: true,
            message: "GAME STARTED"
        };
    } catch (error) {
        console.error("Game start fout:", error);

        return {
            success: false,
            message: "LAUNCH ERROR"
        };
    }
});
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});








