/**
 * All tutorial messages received so far.
 */
var g_TutorialMessages = [];

/**
 * GUI tags applied to the most recent tutorial message.
 */
var g_TutorialNewMessageTags = { "color": "255 226 149" };

/**
 * The number of seconds we monitor to rate limit flares.
 */
var g_FlareRateLimitScope = 6;

/**
 * The maximum allowed number of flares within g_FlareRateLimitScope seconds.
 * This should be a bit larger than the number of flares that can be sent in theory by using the GUI.
 */
var g_FlareRateLimitMaximumFlares = 16;

/**
 * Contains the arrival timestamps the flares of the last g_FlareRateLimitScope seconds.
 */
var g_FlareRateLimitLastTimes = [];

/**
 * These handlers are called everytime a client joins or disconnects.
 */
var g_PlayerAssignmentsChangeHandlers = new Set();

/**
 * These handlers are called when the ceasefire time has run out.
 */
var g_CeasefireEndedHandlers = new Set();

/**
 * These handlers are fired when the match is networked and
 * the current client established the connection, authenticated,
 * finished the loading screen, starts or finished synchronizing after a rejoin.
 * The messages are constructed in NetClient.cpp.
 */
var g_NetworkStatusChangeHandlers = new Set();

/**
 * These handlers are triggered whenever a client finishes the loading screen.
 */
var g_ClientsLoadingHandlers = new Set();

/**
 * These handlers are fired if the server informed the players that the networked game is out of sync.
 */
var g_NetworkOutOfSyncHandlers = new Set();

// HC-code
/**
 * Array containing the HC AI dialogue objects that were sent through, used like a queue
 */
var g_AIDialogQueue = {};

/**
 * Handle all netmessage types that can occur.
 */
var g_NetMessageTypes = {
	"netstatus": msg => {
		handleNetStatusMessage(msg);
	},
	"netwarn": msg => {
		addNetworkWarning(msg);
	},
	"out-of-sync": msg => {
		for (let handler of g_NetworkOutOfSyncHandlers)
			handler(msg);
	},
	"players": msg => {
		handlePlayerAssignmentsMessage(msg);
	},
	"paused": msg => {
		g_PauseControl.setClientPauseState(msg.guid, msg.pause);
	},
	"clients-loading": msg => {
		for (let handler of g_ClientsLoadingHandlers)
			handler(msg.guids);
	},
	"rejoined": msg => {
		addChatMessage({
			"type": "rejoined",
			"guid": msg.guid
		});
	},
	"kicked": msg => {
		addChatMessage({
			"type": "kicked",
			"username": msg.username,
			"banned": msg.banned
		});
	},
	"chat": msg => {
		addChatMessage({
			"type": "message",
			"guid": msg.guid,
			"text": msg.text
		});
	},
	"gamesetup": msg => {}, // Needed for autostart
	"start": msg => {}
};

var g_PlayerStateMessages = {
	"won": translate("You have won!"),
	"defeated": translate("You have been defeated!")
};

var g_LastAttack;

/**
 * Defines how the GUI reacts to notifications that are sent by the simulation.
 * Don't open new pages (message boxes) here! Otherwise further notifications
 * handled in the same turn can't access the GUI objects anymore.
 */
var g_NotificationsTypes =
{
	"aichat": function(notification, player)
	{
		let message = {
			"type": "message",
			"text": notification.message,
			"guid": findGuidForPlayerID(player) || -1,
			"player": player,
			"translate": true
		};

		if (notification.translateParameters)
		{
			message.translateParameters = notification.translateParameters;
			message.parameters = notification.parameters;
			colorizePlayernameParameters(notification.parameters);
		}

		addChatMessage(message);
	},
	"defeat": function(notification, player)
	{
		playersFinished(notification.allies, notification.message, false);
	},
	"won": function(notification, player)
	{
		playersFinished(notification.allies, notification.message, true);
	},
	"diplomacy": function(notification, player)
	{
		updatePlayerData();
		g_DiplomacyColors.onDiplomacyChange();

		addChatMessage({
			"type": "diplomacy",
			"sourcePlayer": player,
			"targetPlayer": notification.targetPlayer,
			"status": notification.status
		});
	},
	"ceasefire-ended": function(notification, player)
	{
		updatePlayerData();
		for (let handler of g_CeasefireEndedHandlers)
			handler();
	},
	"tutorial": function(notification, player)
	{
		updateTutorial(notification);
	},
	"tribute": function(notification, player)
	{
		addChatMessage({
			"type": "tribute",
			"sourcePlayer": notification.donator,
			"targetPlayer": player,
			"amounts": notification.amounts
		});
	},
	"barter": function(notification, player)
	{
		addChatMessage({
			"type": "barter",
			"player": player,
			"amountGiven": notification.amountGiven,
			"amountGained": notification.amountGained,
			"resourceGiven": notification.resourceGiven,
			"resourceGained": notification.resourceGained
		});
	},
	"spy-response": function(notification, player)
	{
		g_DiplomacyDialog.onSpyResponse(notification, player);

		if (notification.entity && g_ViewedPlayer == player)
		{
			g_DiplomacyDialog.close();
			setCameraFollow(notification.entity);
		}
	},
	"attack": function(notification, player)
	{
		if (player != g_ViewedPlayer)
			return;

		// Focus camera on attacks
		if (g_FollowPlayer)
		{
			setCameraFollow(notification.target);

			g_Selection.reset();
			if (notification.target)
				g_Selection.addList([notification.target]);
		}

		g_LastAttack = { "target": notification.target, "position": notification.position };

		if (Engine.ConfigDB_GetValue("user", "gui.session.notifications.attack") !== "true")
			return;

		addChatMessage({
			"type": "attack",
			"player": player,
			"attacker": notification.attacker,
			"target": notification.target,
			"position": notification.position,
			"targetIsDomesticAnimal": notification.targetIsDomesticAnimal
		});
	},
	"phase": function(notification, player)
	{
		addChatMessage({
			"type": "phase",
			"player": player,
			"phaseName": notification.phaseName,
			"phaseState": notification.phaseState
		});
	},
	"dialog": function(notification, player)
	{
		if (player == Engine.GetPlayerID())
			openDialog(notification.dialogName, notification.data, player);
	},
	"playercommand": function(notification, player)
	{
		// For observers, focus the camera on units commanded by the selected player
		if (!g_FollowPlayer || player != g_ViewedPlayer)
			return;

		let cmd = notification.cmd;

		// Ignore rallypoint commands of trained animals
		let entState = cmd.entities && cmd.entities[0] && GetEntityState(cmd.entities[0]);
		if (g_ViewedPlayer != 0 &&
		    entState && entState.identity && entState.identity.classes &&
		    entState.identity.classes.indexOf("Animal") != -1)
			return;

		// Focus the structure to build.
		if (cmd.type == "repair")
		{
			let targetState = GetEntityState(cmd.target);
			if (targetState)
				Engine.CameraMoveTo(targetState.position.x, targetState.position.z);
		}
		else if (cmd.type == "delete-entities" && notification.position)
			Engine.CameraMoveTo(notification.position.x, notification.position.y);
		// Focus commanded entities, but don't lose previous focus when training units
		else if (cmd.type != "train" && cmd.type != "research" && entState)
			setCameraFollow(cmd.entities[0]);

		if (["walk", "attack-walk", "patrol"].indexOf(cmd.type) != -1)
			DrawTargetMarker(cmd);

		// Select units affected by that command
		let selection = [];
		if (cmd.entities)
			selection = cmd.entities;
		if (cmd.target)
			selection.push(cmd.target);

		// Allow gaia in selection when gathering
		g_Selection.reset();
		g_Selection.addList(selection, false, cmd.type == "gather");
	},
	"play-tracks": function(notification, player)
	{
		if (notification.lock)
		{
			global.music.storeTracks(notification.tracks.map(track => ({ "Type": "custom", "File": track })));
			global.music.setState(global.music.states.CUSTOM);
		}

		global.music.setLocked(notification.lock);
	},
	"map-flare": function(notification, player)
	{
		// Don't display for the player that did the flare because they will see it immediately
		if (player != Engine.GetPlayerID() && g_Players[player].isMutualAlly[Engine.GetPlayerID()])
		{
			let now = Date.now();
			if (g_FlareRateLimitLastTimes.length)
			{
				g_FlareRateLimitLastTimes = g_FlareRateLimitLastTimes.filter(t => now - t < g_FlareRateLimitScope * 1000);
				if (g_FlareRateLimitLastTimes.length >= g_FlareRateLimitMaximumFlares)
				{
					warn("Received too many flares. Dropping a flare request by '" + g_Players[player].name + "'.");
					return;
				}
			}
			g_FlareRateLimitLastTimes.push(now);

			displayFlare(notification.target, player);
			Engine.PlayUISound(g_FlareSound, false);
		}
	},
    ////////////////
    // HC MESSAGES
    ////////////////
	"play-custom-track": function(notification, player)
	{
		global.music.tracks.CUSTOM = [];
		global.music.tracks.CUSTOM.push(notification.track);
		global.music.setState(global.music.states.CUSTOM);
		global.music.setLocked(true);
	},
    "unlockMusic": function (notification, player) {
        global.music.setLocked(false);
        global.music.setState(global.music.states.PEACE);
    },
    "UISound": function (notification, player) { // Used in Campaign only for playing 2d sounds
        Engine.PlayUISound(notification.path, false);
    },
    "cinematic": function (data, player) { // Cinematic yes/no Confirmation messages for campaign
        CampaignCinematicConfirm(data);
    },
    "genericCampaign": function (data, player) { // Used for generic/general yes/no confirmation messages for campaign
        GenericCampaignRequest(data);
    },
    "campaignEnd": function (data, player) { // Used when the campaign has ended in victory or defeat
        CampaignEnd(data);
    },
    "campaignSkipSetup": function (data, player) { // Used in Campaign only for skipping during cinematic scenes
        CampaignSkipSetup(data);
    },
    "AIDialog": function (data, player) { // The main dialog functionality used for the AI players
        //add queue data for every targeted player and run the dialog functionality
		warn(uneval(data))
        for (let targetplayer of data.targetPlayers) {
            g_AIDialogQueue[targetplayer].push(data); // add data to the queue for this player
            if (g_AIDialogQueue[targetplayer].length == 1) // if this newly added data is the only one at the moment for this player, manually run the dialog functionality
                updateAIDialog(data, targetplayer);
		}
	}
};

function registerPlayerAssignmentsChangeHandler(handler)
{
	g_PlayerAssignmentsChangeHandlers.add(handler);
}

function registerCeasefireEndedHandler(handler)
{
	g_CeasefireEndedHandlers.add(handler);
}

function registerNetworkOutOfSyncHandler(handler)
{
	g_NetworkOutOfSyncHandlers.add(handler);
}

function registerNetworkStatusChangeHandler(handler)
{
	g_NetworkStatusChangeHandlers.add(handler);
}

function registerClientsLoadingHandler(handler)
{
	g_ClientsLoadingHandlers.add(handler);
}

function findGuidForPlayerID(playerID)
{
	return Object.keys(g_PlayerAssignments).find(guid => g_PlayerAssignments[guid].player == playerID);
}

/**
 * Processes all pending notifications sent from the GUIInterface simulation component.
 */
function handleNotifications()
{
	for (let notification of Engine.GuiInterfaceCall("GetNotifications"))
	{
		if (!notification.players || !notification.type || !g_NotificationsTypes[notification.type])
		{
			error("Invalid GUI notification: " + uneval(notification));
			continue;
		}

		for (let player of notification.players)
			g_NotificationsTypes[notification.type](notification, player);
	}
}

function focusAttack(attack)
{
	if (!attack)
		return;

	const entState = attack.target && GetEntityState(attack.target);
	if (entState && hasClass(entState, "Unit"))
		setCameraFollow(attack.target);
	else
	{
		const position = attack.position;
		Engine.SetCameraTarget(position.x, position.y, position.z);
	}
}

function toggleTutorial()
{
	let tutorialPanel = Engine.GetGUIObjectByName("tutorialPanel");
	tutorialPanel.hidden = !tutorialPanel.hidden || !Engine.GetGUIObjectByName("tutorialText").caption;
}

/**
 * Updates the tutorial panel when a new goal.
 */
function updateTutorial(notification)
{
	// Show the tutorial panel if not yet done
	Engine.GetGUIObjectByName("tutorialPanel").hidden = false;

	if (notification.warning)
	{
		Engine.GetGUIObjectByName("tutorialWarning").caption = coloredText(translate(notification.warning), "orange");
		return;
	}

	let notificationText =
		notification.instructions.reduce((instructions, item) =>
			instructions + (typeof item == "string" ? translate(item) : colorizeHotkey(translate(item.text), item.hotkey)),
			"");

	Engine.GetGUIObjectByName("tutorialText").caption = g_TutorialMessages.concat(setStringTags(notificationText, g_TutorialNewMessageTags)).join("\n");
	g_TutorialMessages.push(notificationText);

	if (notification.readyButton)
	{
		Engine.GetGUIObjectByName("tutorialReady").hidden = false;
		if (notification.leave)
		{
			Engine.GetGUIObjectByName("tutorialWarning").caption = translate("Click to quit this tutorial.");
			Engine.GetGUIObjectByName("tutorialReady").caption = translate("Quit");
			Engine.GetGUIObjectByName("tutorialReady").onPress = () => { endGame(true); };
		}
		else
			Engine.GetGUIObjectByName("tutorialWarning").caption = translate("Click when ready.");
	}
	else
	{
		Engine.GetGUIObjectByName("tutorialWarning").caption = translate("Follow the instructions.");
		Engine.GetGUIObjectByName("tutorialReady").hidden = true;
	}
}

/**
 * Process every CNetMessage (see NetMessage.h, NetMessages.h) sent by the CNetServer.
 * Saves the received object to mainlog.html.
 */
function handleNetMessages()
{
	while (true)
	{
		let msg = Engine.PollNetworkClient();
		if (!msg)
			return;

		log("Net message: " + uneval(msg));

		if (g_NetMessageTypes[msg.type])
			g_NetMessageTypes[msg.type](msg);
		else
			error("Unrecognised net message type '" + msg.type + "'");
	}
}

function handleNetStatusMessage(message)
{
	if (g_Disconnected)
		return;

	g_IsNetworkedActive = message.status == "active";

	if (message.status == "disconnected")
	{
		g_Disconnected = true;
		updateCinemaPath();
		closeOpenDialogs();
	}

	for (let handler of g_NetworkStatusChangeHandlers)
		handler(message);
}

function handlePlayerAssignmentsMessage(message)
{
	for (let guid in g_PlayerAssignments)
		if (!message.newAssignments[guid])
			onClientLeave(guid);

	let joins = Object.keys(message.newAssignments).filter(guid => !g_PlayerAssignments[guid]);

	g_PlayerAssignments = message.newAssignments;

	joins.forEach(guid => {
		onClientJoin(guid);
	});

	for (let handler of g_PlayerAssignmentsChangeHandlers)
		handler();

	// TODO: use subscription instead
	updateGUIObjects();
}

function onClientJoin(guid)
{
	let playerID = g_PlayerAssignments[guid].player;

	if (g_Players[playerID])
	{
		g_Players[playerID].guid = guid;
		g_Players[playerID].name = g_PlayerAssignments[guid].name;
		g_Players[playerID].offline = false;
	}

	addChatMessage({
		"type": "connect",
		"guid": guid
	});
}

function onClientLeave(guid)
{
	g_PauseControl.setClientPauseState(guid, false);

	for (let id in g_Players)
		if (g_Players[id].guid == guid)
			g_Players[id].offline = true;

	addChatMessage({
		"type": "disconnect",
		"guid": guid
	});
}

function addChatMessage(msg)
{
	g_Chat.ChatMessageHandler.handleMessage(msg);
}

function clearChatMessages()
{
	g_Chat.ChatOverlay.clearChatMessages();
}

/**
 * This function is used for AIs, whose names don't exist in g_PlayerAssignments.
 */
function colorizePlayernameByID(playerID)
{
	let username = g_Players[playerID] && escapeText(g_Players[playerID].name);
	return colorizePlayernameHelper(username, playerID);
}

function colorizePlayernameByGUID(guid)
{
	let username = g_PlayerAssignments[guid] ? g_PlayerAssignments[guid].name : "";
	let playerID = g_PlayerAssignments[guid] ? g_PlayerAssignments[guid].player : -1;
	return colorizePlayernameHelper(username, playerID);
}

function colorizePlayernameHelper(username, playerID)
{
	let playerColor = playerID > -1 ? g_DiplomacyColors.getPlayerColor(playerID) : "white";
	return coloredText(username || translate("Unknown Player"), playerColor);
}

/**
 * Insert the colorized playername to chat messages sent by the AI and time notifications.
 */
function colorizePlayernameParameters(parameters)
{
	for (let param in parameters)
		if (param.startsWith("_player_"))
			parameters[param] = colorizePlayernameByID(parameters[param]);
}

/**
 * Custom dialog response handling, usable by trigger maps.
 */
function sendDialogAnswer(guiObject, dialogName)
{
	Engine.GetGUIObjectByName(dialogName + "-dialog").hidden = true;

	Engine.PostNetworkCommand({
		"type": "dialog-answer",
		"dialog": dialogName,
		"answer": guiObject.name.split("-").pop(),
	});

	resumeGame();
}

/**
 * Custom dialog opening, usable by trigger maps.
 */
function openDialog(dialogName, data, player)
{
	let dialog = Engine.GetGUIObjectByName(dialogName + "-dialog");
	if (!dialog)
	{
		warn("messages.js: Unknown dialog with name " + dialogName);
		return;
	}
	dialog.hidden = false;

	for (let objName in data)
	{
		let obj = Engine.GetGUIObjectByName(dialogName + "-dialog-" + objName);
		if (!obj)
		{
			warn("messages.js: Key '" + objName + "' not found in '" + dialogName + "' dialog.");
			continue;
		}

		for (let key in data[objName])
		{
			let n = data[objName][key];
			if (typeof n == "object" && n.message)
			{
				let message = n.message;
				if (n.translateMessage)
					message = translate(message);
				let parameters = n.parameters || {};
				if (n.translateParameters)
					translateObjectKeys(parameters, n.translateParameters);
				obj[key] = sprintf(message, parameters);
			}
			else
				obj[key] = n;
		}
	}

	g_PauseControl.implicitPause();
}

///////////////////
// HC-code MESSAGE FUNCTIONALITY
//////////////////
/**
 * displays the defeat and victory screen for the campaign
 */
function CampaignEnd(data) {
    g_ShowGUI = false; // dont refresh or retoggle UI
    Engine.GetGUIObjectByName("minimapPanel").hidden = true; // hide the minimap because of BS z_levels
    let window = Engine.GetGUIObjectByName("campaignEndPanel");
    let resumeButton = Engine.GetGUIObjectByName("campaignEndResume");
    let leaveButton = Engine.GetGUIObjectByName("campaignEndLeave");

    window.hidden = false;
    window.sprite = "stretched:session/portraits/dialog/" + data.image + ".png"; // change sprite

    // assign respective function calls when buttons are pressed
    resumeButton.onPress = function () {
        window.hidden = true;
        resumeGame();
    }
    leaveButton.onPress = endgame(true);
}

/**
 * sends a message box to confirm a generic campaign request
 */
function GenericCampaignRequest(data) {
    pauseGame(); // pause the game first when asking for permission from the player
    let window = Engine.GetGUIObjectByName("cinematicWindow");
    let dialogue = Engine.GetGUIObjectByName("cinematicDialogue");
    let buttonYes = Engine.GetGUIObjectByName("cinematicYes");
    let buttonNo = Engine.GetGUIObjectByName("cinematicNo");

    window.hidden = false; // show the message box
    dialogue.caption = data.dialogue; // set the dialogue

    // when yes is pressed
    buttonYes.onPress = function () {
        Engine.PostNetworkCommand({ "type": "CampaignYesNo", "function": data.functionTrue, "delay": data.delay }); // send true state to the commands for the campaign script to read
        window.hidden = true;
        resumeGame();
    }

    // when no is pressed
    buttonNo.onPress = function () {
        Engine.PostNetworkCommand({ "type": "CampaignYesNo", "function": data.functionFalse, "delay": data.delay }); // send true state to the commands for the campaign script to read
        window.hidden = true;
        resumeGame();
    }
}

/**
 * sends a message box to confirm the cinematic being loaded from the web
 */
function CampaignCinematicConfirm(data) {
    pauseGame(); // pause the game first when asking for permission from the player
    // cache the UI references required 
    let window = Engine.GetGUIObjectByName("cinematicWindow");
    let dialogue = Engine.GetGUIObjectByName("cinematicDialogue");
    let buttonYes = Engine.GetGUIObjectByName("cinematicYes");
    let buttonNo = Engine.GetGUIObjectByName("cinematicNo");

    window.hidden = false; // show the message box
    dialogue.caption = data.dialogue; // set the dialogue

    // when yes is pressed
    buttonYes.onPress = function () {
        Engine.OpenURL(data.url); // open cinematic web URL
        dialogue.caption = "Press Resume Game or Watch Cinematic";

        buttonYes.caption = "Resume Game"
        buttonYes.onPress = function () // Resume game after cinematic
        {
            window.hidden = true;
            resumeGame();
            buttonYes.caption = "Yes"; // make sure to reset the caption of the yes button
            buttonNo.caption = "No"; // make sure to reset the caption of the no button
        };

        buttonNo.caption = "Watch Cinematic"
        buttonNo.onPress = function () // re-open URL for cinematic
        {
            Engine.OpenURL(data.url);
        };
    };

    buttonNo.onPress = function () // dont play cinematic, resume game
    {
        window.hidden = true;
        resumeGame();
    };
}

function CampaignSkipSetup(data) {
    let skipButton = Engine.GetGUIObjectByName("CutsceneSkipButton");
    if (data.hide) // hide the skip button if hide is given
    {
        skipButton.hidden = true;
        return;
    }

    skipButton.hidden = false; // hide the skip button by default
    skipButton.onPress = function () {
        Engine.PostNetworkCommand({ "type": "StopCinematicCamera", "function": data.function, "delay": data.delay }); // if the skip button is pressed, stop the cinematic camera and send over function if applicable
        Engine.GetGUIObjectByName("campaignPanel").hidden = true; // hide complete panel again since we just skipped the current cutscene
        skipButton.hidden = true; // skip has done its job, back to hidden
    }
}

/**
 * Updates the campaign dialogue screen
 */
function updateAIDialog(data, origin) {
    let playerID = Engine.GetPlayerID();
    //somehow the update campaign is called for every player from the message window, if this wasnt meant for this player, simply return
    if (playerID != origin)
        return;

    //check if this dialog message was meant for this player, if not, hide and return
    if (data.hide) {
        Engine.GetGUIObjectByName("campaignPanel").hidden = true;
        return;
    }

    let campaignPanel = Engine.GetGUIObjectByName("campaignPanel");
    campaignPanel.sprite = "stretched:session/portraits/dialog/DialogueHyrule.png"; // change sprite
    campaignPanel.hidden = false; // show the campaign window

    let dialogue = data.dialogue;
    let portraitSuffix = data.portraitSuffix;
    let splitDialogue = dialogue.split("||"); // attempt to split the text if color sections are present 
    let playerColor = g_Players[data.sender].color; // get the color values of the sending player

    if (splitDialogue.length > 1) // if there are colorsets present, reshape the dialogue
    {
        let coloredSets = Math.floor(splitDialogue.length * 0.33); // get the number of sets based upon the length of the array (3 extra elements per colored set so * 0.33)
        dialogue = ""; // reset the current dialogue to nothing because we will reshape it later
        dialogue += splitDialogue[0]; // add the initial text at the start
        for (let i = 0; i < coloredSets; i++) {
            for (let metaName in data.metaData) {
                let index = data.metaData[metaName][1];
                if (splitDialogue[i * 3 + index] == metaName)
                    splitDialogue[i * 3 + index] = data.metaData[metaName][0];
            }
            if (splitDialogue[i * 3 + 1] == "RP") //set the receiving player name on this command + the player color
            {
                let receiverColor = g_Players[playerID].color; // get the color of the receiving player
                splitDialogue[i * 3 + 1] = g_Players[playerID].name; //set the name to the receiving player
                splitDialogue[i * 3 + 2] = receiverColor.r + " " + receiverColor.g + " " + receiverColor.b; // reshape RGB string value accordingly
            }
            else if (splitDialogue[i * 3 + 2] == "PC") //set the RGB values to the player color of the sender if specified
                splitDialogue[i * 3 + 2] = playerColor.r + " " + playerColor.g + " " + playerColor.b; // reshape RGB string value accordingly           

            dialogue += coloredText(splitDialogue[i * 3 + 1], splitDialogue[i * 3 + 2]) + splitDialogue[i * 3 + 3]; // rebuild the dialogue for every colored set present
        }
    }

    let character = data.character; // precache the character data
    Engine.GetGUIObjectByName("dialogueText").caption = dialogue; // set dialogue text
    Engine.GetGUIObjectByName("characterText").caption = coloredText(character, playerColor.r + " " + playerColor.g + " " + playerColor.b); // push character text to the window
    Engine.GetGUIObjectByName("characterSprite").sprite = "stretched:session/portraits/dialog/" + g_Players[data.sender].civ + "/" + character + portraitSuffix + ".png"; // show the characters image/sprite

    let index = data.soundIndex; // pre cache sound index
    if (index != -1) // dont play a sound if -1
    {
        if (index == 0) // random sound
        {
            let soundPool = [];
            for (let soundfile of Engine.ListDirectoryFiles("audio/dialog/" + g_Players[data.sender].civ + "/" + character + "/", "*.ogg", false)) // get all files in characters sound library (could sort manually with separate folder for each portraitSuffix)
            {
                if (soundfile.startsWith("audio/dialog/" + g_Players[data.sender].civ + "/" + character + "/" + portraitSuffix)) // check if the name matches with the suffix
                    soundPool.push(soundfile); // add to sound pool
            }

            let rand = randIntInclusive(1, soundPool.length);
            Engine.PlayUISound(soundPool[rand - 1], false); // play random from sound pool
        }
        else // specific sound
            Engine.PlayUISound("audio/dialog/" + g_Players[data.sender].civ + "/" + character + "/" + portraitSuffix + index + ".ogg", false);
    }

    setTimeout(updateAIDialogQueue, 10000); // after the procedures have been ran, delete this element from the queue and run the next element if applicable 
}

/**
 * shifts the AI Dialog Queue and runs the next element if available
 */
function updateAIDialogQueue() {
    g_AIDialogQueue[Engine.GetPlayerID()].shift(); // remove the old queue data
    if (g_AIDialogQueue[Engine.GetPlayerID()][0] == undefined) // if the queue is empty, close the dialog instead
        Engine.GetGUIObjectByName("campaignPanel").hidden = true;
    else // otherwise, set the next queue element
        updateAIDialog(g_AIDialogQueue[Engine.GetPlayerID()][0], Engine.GetPlayerID());
}

//HC-End
