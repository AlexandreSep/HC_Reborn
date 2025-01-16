var g_TopMenuButtonsLeft = [
	{
		"caption": translate("Scenario Editor"),
		"tooltip": translate('Open the Atlas Scenario Editor in a new window. You can run this more reliably by starting the game with the command-line argument "-editor".'),
		"size": "0% 0% 33.33% 100%",
		"onPress": () => {
			if (Engine.AtlasIsAvailable())
				messageBox(
					400, 200,
					translate("Are you sure you want to quit Hyrule Conquest and open the Scenario Editor?"),
					translate("Confirmation"),
					[translate("No"), translate("Yes")],
					[null, Engine.RestartInAtlas]);
			else
				messageBox(
					400, 200,
					translate("The scenario editor is not available or failed to load. See the game logs for additional information."),
					translate("Error"));
		}
	},
	{
		"caption": translate("Mod Selection"),
		"tooltip": translate("Select and download mods for the game."),
		"size": "33.33% 0% 66.66% 100%",
		"onPress": () => {
			Engine.SwitchGuiPage("page_modmod.xml");
		}
	},
	{
		"caption": translate("Hotkeys"),
		"tooltip": translate("Adjust hotkeys."),
		"size": "66.66% 0% 100% 100%",
		"onPress": () => {
			Engine.PushGuiPage("hotkeys/page_hotkeys.xml");
		}
	}
];


var g_TopMenuButtonsRight = [
	{
		"caption": translate("Language"),
		"tooltip": translate("Choose the language of the game."),
		"size": "0% 0% 33.33% 100%",
		"onPress": () => {
			Engine.PushGuiPage("page_locale.xml");
		}
	},
	{
		"caption": translate("Options"),
		"tooltip": translate("Adjust game settings."),
		"size": "33.33% 0% 66.66% 100%",
		"onPress": () => {
			Engine.PushGuiPage(
				"page_options.xml",
				{},
				fireConfigChangeHandlers);
		}
	},
	{
		"caption": translate("Exit"),
		"tooltip": translate("Exit the game."),
		"size": "66.66% 0% 100% 100%",
		"onPress": () => {
			messageBox(
				400, 200,
				translate("Are you sure you want to quit Hyrule Conquest?"),
				translate("Confirmation"),
				[translate("No"), translate("Yes")],
				[null, Engine.Exit]);
		}
	}
];
