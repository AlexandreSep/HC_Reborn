var g_CenterMenuItems = [
	{
		"caption": translate("Library"),
		"tooltip": translate("Discover the Hyrule Conquest maps and factions"),
		"size": "0%+5 0%+5 33.3%-3 0%+75",
		"submenuSize": "0% 0% 33.3% 100%",
		"submenu": [
			{
				"caption": translate("Faction Overview"),
				"tooltip": colorizeHotkey(translate("%(hotkey)s: Learn about the civilizations featured in Hyrule Conquest"), "civinfo"),
				"size": "0% 0% 100% 0%+45",
				"hotkey": "civinfo",
				"onPress": () => {
					let callback = data => {
						if (data.nextPage)
							Engine.PushGuiPage(data.nextPage, { "civ": data.civ }, callback);
					};
					Engine.PushGuiPage("page_civinfo.xml", {}, callback);
				}
			},
			{
				"caption": translate("Map Overview"),
				"tooltip": translate("View the different maps featured in Hyrule Conquest"),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.PushGuiPage("page_mapbrowser.xml");
				},
			}
		]
	},
	{
		"caption": translate("Single-player"),
		"tooltip": translate("Start, load, or replay a single-player game."),
		"size": "33.3%+3 0%+5 66.6%-3 0%+75",
		"submenuSize": "33.3% 0% 66.6% 100%",
		"submenu": [
			{
				"caption": translate("Hyrule Historia (Campaign)"),
				"tooltip": translate("Start a new campaign mission."),
				"size": "0% 0% 100% 0%+45",
				"onPress": () => {
					Engine.SwitchGuiPage("page_gamesetup.xml");
				}
			},
			{
				"caption": translate("Skirmish"),
				"tooltip": translate("Start a new single-player game."),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.SwitchGuiPage("page_gamesetup.xml");
				}
			},
			{
				"caption": translate("Load Game"),
				"tooltip": translate("Load a saved game."),
				"size": "0% 0%+90 100% 0%+135",
				"onPress": () => {
					Engine.PushGuiPage("page_loadgame.xml");
				}
			},
			{
				"caption": translate("Replays"),
				"tooltip": translate("Playback previous games."),
				"size": "0% 0%+135 100% 0%+180",
				"onPress": () => {
					Engine.SwitchGuiPage("page_replaymenu.xml", {
						"replaySelectionData": {
							"filters": {
								"singleplayer": "Single-player"
							}
						}
					});
				}
			}
		]
	},
	{
		"caption": translate("Multiplayer"),
		"tooltip": translate("Fight against one or more human players in a multiplayer game."),
		"size": "66.6%+3 0%+5 100%-5 0%+75",
		"submenuSize": "66.6% 0% 100% 100%",
		"submenu": [
			{
				"caption": translate("Game Lobby"),
				"tooltip":
					colorizeHotkey(translate("%(hotkey)s: Launch the multiplayer lobby to join and host publicly visible games and chat with other players."), "lobby") +
					(Engine.StartXmppClient ? "" : translate("Launch the multiplayer lobby. \\[DISABLED BY BUILD]")),
				"enabled": () => !!Engine.StartXmppClient,
				"size": "0% 0% 100% 0%+45",
				"hotkey": "lobby",
				"onPress": () => {
					 if (Engine.StartXmppClient)
						 Engine.PushGuiPage("page_prelobby_entrance.xml");
				}
			},
			{
				// Translation: Join a game by specifying the host's IP address.
				"caption": translate("Join Game"),
				"tooltip": translate("Joining an existing multiplayer game."),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.PushGuiPage("page_gamesetup_mp.xml", {
						"multiplayerGameType": "join"
					});
				}
			},
			{
				"caption": translate("Host Game"),
				"tooltip": translate("Host a multiplayer game."),
				"size": "0% 0%+90 100% 0%+135",
				"onPress": () => {
					Engine.PushGuiPage("page_gamesetup_mp.xml", {
						"multiplayerGameType": "host"
					});
				}
			},
			{
				"caption": translate("Replays"),
				"tooltip": translate("Playback previous games."),
				"size": "0% 0%+135 100% 0%+180",
				"onPress": () => {
					Engine.SwitchGuiPage("page_replaymenu.xml", {
						"replaySelectionData": {
							"filters": {
								"singleplayer": "Multiplayer"
							}
						}
					});
				}
			}
		]
	}
];
