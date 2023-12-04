const vscode     = require("vscode");
const markdownIt = require("markdown-it");
const axios      = require("axios");
const path       = require("path");
const md         = new markdownIt();

let link = "https://pakegpt.com";
let token, bahasa, maks_poin, mode;
let riwayat_kode = {};

function activate(context) {
    ambil_pengaturan();

    context.subscriptions.push(
        vscode.commands.registerCommand("analisa", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Menganalisa Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }

                let poin_maksimal;
                if (mode == "cerdas") { poin_maksimal = 0; } else { poin_maksimal  = maks_poin; }

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: [{ role: "user", content: selectedText}]};
                try {
                    await axios.post(link + "/api/aplikasi?aksi=analisa", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        const htmlOutput = md.render(response.data);
                        const css = "<style>body{font-size:3vw;}</style>";
                        const panel = vscode.window.createWebviewPanel("hasil_analisa", "Hasil Analisa", vscode.ViewColumn.Beside, {});    
                        panel.webview.html = css + htmlOutput;
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal membuat analisa"); }
            });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("buat", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Membuat Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);
                const location     = file_aktif.selection.end
                const startColumn = file_aktif.selection.start.character;
                const indeksTab = Math.ceil(startColumn / file_aktif.options.tabSize);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }
                
                let poin_maksimal;
                let daftar_riwayat;
                
                if      (mode == "hemat")   { daftar_riwayat = [] ; poin_maksimal = maks_poin;                                }
                else if (mode == "standar") { daftar_riwayat = ambil_riwayat(nama_file).slice(-4); poin_maksimal = maks_poin; }
                else if (mode == "cerdas")  { daftar_riwayat = ambil_riwayat(nama_file).slice(-9); poin_maksimal = 0;         }

                daftar_riwayat.push({ role: "user", content: selectedText});

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: daftar_riwayat};
                try {
                    await axios.post(link + "/api/aplikasi?aksi=buat", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        if (response.data) {
                            tambah_riwayat(nama_file, response.data)

                            const baris = response.data.split("\n");
                            const barisDenganIndeksTab = baris.map(line => "\t".repeat(indeksTab) + line);
                            const hasil_akhir = barisDenganIndeksTab.join("\n");

                            file_aktif.edit(editBuilder => { editBuilder.insert(location, "\n" + hasil_akhir); });
                        }
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal membuat kode"); }
            });     
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("buat.disamping", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Membuat Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }
                
                let poin_maksimal;
                let daftar_riwayat;
                
                if      (mode == "hemat")   { daftar_riwayat = [] ; poin_maksimal = maks_poin;                                }
                else if (mode == "standar") { daftar_riwayat = ambil_riwayat(nama_file).slice(-4); poin_maksimal = maks_poin; }
                else if (mode == "cerdas")  { daftar_riwayat = ambil_riwayat(nama_file).slice(-9); poin_maksimal = 0;         }

                daftar_riwayat.push({ role: "user", content: selectedText});

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: daftar_riwayat};
                try {
                    await axios.post(link + "/api/aplikasi?aksi=buat", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        if (response.data) {
                            tambah_riwayat(nama_file, response.data)
                            vscode.workspace.openTextDocument({ content: response.data }).then(document => { vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside }); });   
                        }
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal membuat kode"); } 
            });     
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("perbaiki", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Memperbaiki Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);
                const target       = file_aktif.selection;
                const startColumn  = file_aktif.selection.start.character;
                const indeksTab    = Math.ceil(startColumn / file_aktif.options.tabSize);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }
                
                let poin_maksimal;
                let daftar_riwayat;
                
                if      (mode == "hemat")   { daftar_riwayat = [] ; poin_maksimal = maks_poin;                                }
                else if (mode == "standar") { daftar_riwayat = ambil_riwayat(nama_file).slice(-4); poin_maksimal = maks_poin; }
                else if (mode == "cerdas")  { daftar_riwayat = ambil_riwayat(nama_file).slice(-9); poin_maksimal = 0;         }

                daftar_riwayat.push({ role: "user", content: selectedText});

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: daftar_riwayat};
                try {
                    await axios.post(link + "/api/aplikasi?aksi=perbaiki", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        if (response.data) {
                            const baris = response.data.split("\n");
                            const barisDenganIndeksTab = baris.map(line => "\t".repeat(indeksTab) + line);
                            const hasil_akhir = barisDenganIndeksTab.join("\n");

                            file_aktif.edit(editBuilder => { editBuilder.replace(target, hasil_akhir); });
                        }
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal memperbaiki kode"); }
            });     
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("perbaiki.disamping", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Memperbaiki Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }
                
                let poin_maksimal;
                let daftar_riwayat;
                
                if      (mode == "hemat")   { daftar_riwayat = [] ; poin_maksimal = maks_poin;                                }
                else if (mode == "standar") { daftar_riwayat = ambil_riwayat(nama_file).slice(-4); poin_maksimal = maks_poin; }
                else if (mode == "cerdas")  { daftar_riwayat = ambil_riwayat(nama_file).slice(-9); poin_maksimal = 0;         }

                daftar_riwayat.push({ role: "user", content: selectedText});

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: daftar_riwayat};
                try {
                    await axios.post(link + "/api/aplikasi?aksi=perbaiki", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        if (response.data) { vscode.workspace.openTextDocument({ content: response.data }).then(document => { vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside }); }); }
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal memperbaiki kode"); } 
            });     
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("terangkan", () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Memahami Potongan Kode...",
                cancellable: false
            }, async () => {
                const file_aktif   = vscode.window.activeTextEditor;
                const nama_file    = getFileName(file_aktif);
                const selectedText = file_aktif.document.getText(file_aktif.selection);

                if (nama_file == "untitled" || isOnlyWhitespace(selectedText)) { vscode.window.showErrorMessage("Kesalahan: kondisi tidak terpenuhi. Tidak dapat melanjutkan."); return undefined; }

                let poin_maksimal;
                if (mode == "cerdas") { poin_maksimal = 0; } else { poin_maksimal  = maks_poin; }

                let postData = { bahasa: bahasa, maks_poin: poin_maksimal, key: token, file: nama_file, rantai_pesan: [{ role: "user", content: selectedText}]};

                try {
                    await axios.post(link + "/api/aplikasi?aksi=terangkan", postData, { headers: { "Content-Type": "application/json", "Code-Editor": "vscode" } })
                    .then(function (response) {
                        const htmlOutput = md.render(response.data);
                        const css = "<style>body{font-size:3vw;}</style>";
                        const panel = vscode.window.createWebviewPanel("keterangan", "keterangan", vscode.ViewColumn.Beside, {});    
                        panel.webview.html = css + htmlOutput;
                    })
                    .catch(function (error) {
                        if (error.response.headers["x-error-message"]) { vscode.window.showErrorMessage("Kesalahan: " + error.response.headers["x-error-message"]); } 
                        else { vscode.window.showErrorMessage("Kesalahan: " + error.message); }
                    });
                }
                catch (error) {  vscode.window.showErrorMessage("Kesalahan: gagal membuat keterangan"); }
            }); 
        })
    );
}

function ambil_pengaturan() {
    const pengaturan = vscode.workspace.getConfiguration("pakegpt");
    token = pengaturan.get("token");
    bahasa = pengaturan.get("bahasa");
    maks_poin = pengaturan.get("maks_poin");
    mode = pengaturan.get("mode");
}

function getFileName(editor) {
    if (editor.document.isUntitled) { 
        return "untitled";
    } else {
        const absolutePath = editor.document.fileName;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                const folderPath = folder.uri.fsPath;
                if (absolutePath.startsWith(folderPath)) {
                    const relativePath = path.relative(folderPath, absolutePath);
                    return relativePath;
                }
            }
        }
        
        return absolutePath;
    }
}

function tambah_riwayat(filePath, hasil) { 
    if (!riwayat_kode[filePath]) { riwayat_kode[filePath] = []; }
    else if (riwayat_kode[filePath].length == 9) { riwayat_kode[filePath].shift(); }

    riwayat_kode[filePath].push({ role: "assistant", content: hasil});
}

function ambil_riwayat(filePath) { return riwayat_kode[filePath] || []; }
function isOnlyWhitespace(text)  { return /^\s*$/.test(text); }
function deactivate() {}

vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration("pakegpt")) { ambil_pengaturan(); } });

module.exports = { activate, deactivate }