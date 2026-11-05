const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voidx", {
    chat: (messages) => ipcRenderer.invoke("voidx-chat", messages),

    getGames: () => ipcRenderer.invoke("voidx-get-games"),
    launchGame: (gameId) => ipcRenderer.invoke("voidx-launch-game", gameId),

    // SpideyWeb lokale opslag
    getSpideyWebData: () =>
        ipcRenderer.invoke("voidx-get-spideyweb-data"),

    saveSpideyWebData: (data) =>
        ipcRenderer.invoke("voidx-save-spideyweb-data", data)
});


