const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const Lang = imports.lang;

const URL_BASE ="https://api.mcsrvstat.us/2/"; 


function MinecraftServerStatus(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

MinecraftServerStatus.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
        
        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);
        
        // Text box for entering IP
        this.settings.bind("serverIp", "serverIp", this.update, null);
        this.settings.bind("showUUID", "showUUID", this.update, null);
        this.setupUI();
    },

    setupUI: function() {
        this.window = new St.BoxLayout({vertical: true});
        // Need to query the server every update otherwise this response object wont be updated
        this.displayPlayers = false;
        this.hostname = new St.Label();
        this.ip= new St.Label();
        this.version= new St.Label();
        this.motd= new St.Label();
        this.playerCount = new St.Label();
        this.players = [];

        this.window.add(this.hostname);
        this.window.add(this.ip);
        this.window.add(this.version);
        this.window.add(this.motd);
        this.window.add(this.playerCount);

        this.setContent(this.window);
        this.update();
    },

    update: function() {
        this.response = this.queryServer();
        // Change the text to unknown if the server is offline
        if (!this.response.online) {
            this.hostname.set_text("Server Offline");
            this.ip.set_text(`Entered Ip: ${this.serverIp}`);
            this.version.set_text("Version: Unknown");
            this.motd.set_text("Motd: Unknown");
            this.playerCount.set_text("Players: Unknown");
            return;
        } 
        if (this.response.hostname) {
            this.hostname.set_text(`Hostname:   ${this.response.hostname}`);
        } else if (!this.response.hostname) {
            this.hostname.set_text(`No Hostname`);
        }
        // Ip and protocol version
        this.ip.set_text(`Ip:   ${this.response.ip}:${this.response.port} (${this.response.protocol})`);
        

        if (this.response.version) {
            this.version.set_text(`Version: ${this.response.version}`);
        }
        if (this.response.motd) {
            this.motd.set_text(`Motd: ${this.response.motd.clean}`);
        }
        if (this.response.players) {
            // Store players in a list until user wants to see them
            this.players = [];
            let playerCountStr = `Players (${this.response.players.online}/${this.response.players.max}):`;
            if (this.response.players.list) {
                for (let i = 0; i < this.response.players.online; i++) {
                    this.players.push(this.response.players.list[i]);
                }
            }
            // If the user clicks on the desklet, display the players in one label
            if (this.displayPlayers) {
                for (let i = 0; i < this.players.length; i++) {
                    playerCountStr += `\n   ${this.players[i]} `;
                    if (this.showUUID) {
                        playerCountStr += `(${this.response.players.uuid[this.players[i]]})`;
                    }
                }
            }
            this.playerCount.set_text(playerCountStr);
        }
        // API caches results for 10 mins (600s)
        this.timeout = Mainloop.timeout_add_seconds(600, Lang.bind(this, this.update));
    },
    
    // Query the server using the mc server status API. Returns the json response
    queryServer: function() {
        const urlCatch = Gio.file_new_for_uri(URL_BASE + this.serverIp);
        let response;
        try {
            let [successful, contents, tag_out] = urlCatch.load_contents(null);
            if (successful) {
                response = contents.toString();
            } else {
                response = '{"error": "Url not available!"}';
            }
        } catch (err) {
            response = '{"error": "URL not valid"}';
        }
        return JSON.parse(response);   
    },

    on_desklet_clicked: function(event) {  
        this.displayPlayers = !this.displayPlayers;
        this.update();
    },
}

function main(metadata, desklet_id) {
    return new MinecraftServerStatus(metadata, desklet_id);
}
