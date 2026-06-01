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
				"onPress": async() => {
					let data = await Engine.OpenChildPage("page_civinfo.xml", {});
					while (data && data.nextPage)
						data = await Engine.OpenChildPage(data.nextPage, data.args || { "civ": data.civ });
				}
			},
			{
				"caption": translate("Map Overview"),
				"tooltip": translate("View the different maps featured in Hyrule Conquest"),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.OpenChildPage("page_mapbrowser.xml");
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
				"caption": translate("Hyrule Historia"),
				"tooltip": translate("Start a new campaign"),
				"size": "0% 0% 100% 0%+45",
				"onPress": () => {
					Engine.SwitchGuiPage("campaigns/setup/page.xml");
				}
			},
			{
				"caption": translate("Load Campaign"),
				"tooltip": translate("Load an existing campaign"),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.SwitchGuiPage("campaigns/load_modal/page.xml");
				}
			},
			{
				"caption": translate("Skirmish"),
				"tooltip": translate("Start a new single-player game."),
				"size": "0% 0%+90 100% 0%+135",
				"onPress": () => {
					Engine.SwitchGuiPage("page_gamesetup.xml");
				}
			},
			{
				"caption": translate("Load Game"),
				"tooltip": translate("Load a saved game."),
				"size": "0% 0%+135 100% 0%+180",
				"onPress": async() => {
					const gameId = await Engine.OpenChildPage("page_loadgame.xml");
					if (!gameId)
						return;

					const metadata = Engine.StartSavedGame(gameId);
					if (!metadata)
					{
						error("Could not load saved game: " + gameId);
						return;
					}

					Engine.SwitchGuiPage("page_loading.xml", {
						"attribs": metadata.initAttributes,
						"playerAssignments": {
							"local": {
								"name": metadata.initAttributes.settings.PlayerData[metadata.playerID]?.Name ??
									singleplayerName(),
								"player": metadata.playerID
							}
						},
						"savedGUIData": metadata.gui
					});
				}
			},
			{
				"caption": translate("Replays"),
				"tooltip": translate("Playback previous games."),
				"size": "0% 0%+180 100% 0%+225",
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
						 Engine.OpenChildPage("page_prelobby_entrance.xml");
				}
			},
			{
				// Translation: Join a game by specifying the host's IP address.
				"caption": translate("Join Game"),
				"tooltip": translate("Joining an existing multiplayer game."),
				"size": "0% 0%+45 100% 0%+90",
				"onPress": () => {
					Engine.OpenChildPage("page_gamesetup_mp.xml", {
						"multiplayerGameType": "join"
					});
				}
			},
			{
				"caption": translate("Host Game"),
				"tooltip": translate("Host a multiplayer game."),
				"size": "0% 0%+90 100% 0%+135",
				"onPress": () => {
					Engine.OpenChildPage("page_gamesetup_mp.xml", {
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
