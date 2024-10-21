var currentSubmenuType; // contains submenu type
var MARGIN = 4; // menu border size
var g_ShowSplashScreens;

/**
 * Available backdrops
 */
var g_BackgroundLayerData = [];

/**
 * Chosen backdrop
 */
var g_BackgroundLayerset;

var g_T0 = Date.now();
var g_LastTickTime = Date.now();

function init(initData, hotloadData)
{
	initMusic();

	global.music.setState(global.music.states.MENU);

	// Initialize currentSubmenuType with placeholder to avoid null when switching
	currentSubmenuType = "submenuSinglePlayer";

	// Only show splash screen(s) once at startup, but not again after hotloading
	g_ShowSplashScreens = hotloadData ? hotloadData.showSplashScreens : initData && initData.isStartup;

	// Pick a random background and initialise it
	g_BackgroundLayerset = pickRandom(g_BackgroundLayerData);
	for (let i = 0; i < g_BackgroundLayerset.length; ++i)
	{
		let guiObj = Engine.GetGUIObjectByName("background[" + i + "]");
		guiObj.hidden = false;
		guiObj.sprite = g_BackgroundLayerset[i].sprite;
		guiObj.z = i;
	}

	Engine.GetGUIObjectByName("structreeButton").tooltip = colorizeHotkey(
		translate("%(hotkey)s: View the structure tree of factions featured in Hyrule Conquest"),
		"structree");

	Engine.GetGUIObjectByName("civInfoButton").tooltip = colorizeHotkey(
        translate("%(hotkey)s: Learn about the many factions featured in Hyrule Conquest"),
		"civinfo");

	Engine.GetGUIObjectByName("lobbyButton").tooltip = colorizeHotkey(
		translate("%(hotkey)s: Launch the multiplayer lobby to join and host publicly visible games and chat with other players."),
		"lobby");
		
	initHyruleConquestHotKeys()
}

/**
 * Initializes Hyrule Conquest specific hotkeys.
 * Writes them into user.cfg.
 * Hotkey naming: HC.<SUBCATEGORY>.<HOTHEY_NAME> 
 * Hotkeys kan be user configured by the user as the game does not overweite them if they already exist
 */
function initHyruleConquestHotKeys()
{
	let hotkeyValue = undefined;
	
	// Battalion UI
	
	// Toggle units and structures - SPACE
	hotkeyValue = Engine.ConfigDB_GetValue("user", "hotkey.HC.battalionUI.toggleStructuresUnits");
    if (!hotkeyValue){
        Engine.ConfigDB_CreateValue("user", "hotkey.HC.battalionUI.toggleStructuresUnits", "Space");
        Engine.ConfigDB_WriteValueToFile("user", "hotkey.HC.battalionUI.toggleStructuresUnits", "Space", "config/user.cfg");
    }
	
	// Expand Military battalions area - C
	hotkeyValue = Engine.ConfigDB_GetValue("user", "hotkey.HC.battalionUI.expandMilitaryBattalionArea");
    if (!hotkeyValue){
        Engine.ConfigDB_CreateValue("user", "hotkey.HC.battalionUI.expandMilitaryBattalionArea", "Ctrl+Space");
        Engine.ConfigDB_WriteValueToFile("user", "hotkey.HC.battalionUI.expandMilitaryBattalionArea", "Ctrl+Space", "config/user.cfg");
    }
    
	// Add to selection - CTRL
	hotkeyValue = Engine.ConfigDB_GetValue("user", "hotkey.HC.battalionUI.addSelection");
    if (!hotkeyValue){
        Engine.ConfigDB_CreateValue("user", "hotkey.HC.battalionUI.addSelection", "Ctrl");
        Engine.ConfigDB_WriteValueToFile("user", "hotkey.HC.battalionUI.addSelection", "Ctrl", "config/user.cfg");
    }
    
	// Multi Select - SHIFT
	hotkeyValue = Engine.ConfigDB_GetValue("user", "hotkey.HC.battalionUI.multiSelect");
    if (!hotkeyValue){
        Engine.ConfigDB_CreateValue("user", "hotkey.HC.battalionUI.multiSelect", "Shift");
        Engine.ConfigDB_WriteValueToFile("user", "hotkey.HC.battalionUI.multiSelect", "Shift", "config/user.cfg");
    }
    
    // Other UI Elements
	
	// Bring up hero selection during game - SPACE
	hotkeyValue = Engine.ConfigDB_GetValue("user", "hotkey.HC.otherUI.showHeroSelectionScreen");
    if (!hotkeyValue){
        Engine.ConfigDB_CreateValue("user", "hotkey.HC.otherUI.showHeroSelectionScreen", "H");
        Engine.ConfigDB_WriteValueToFile("user", "hotkey.HC.otherUI.showHeroSelectionScreen", "H", "config/user.cfg");
    }
}

function getHotloadData()
{
	return { "showSplashScreens": g_ShowSplashScreens };
}

function scrollBackgrounds()
{
	for (let i = 0; i < g_BackgroundLayerset.length; ++i)
	{
		let guiObj = Engine.GetGUIObjectByName("background[" + i + "]");

		let screen = guiObj.parent.getComputedSize();
		let h = screen.bottom - screen.top;
		let w = h * 16/9;
		let iw = h * 2;

        let offset = g_BackgroundLayerset[i].offset((Date.now() - g_T0) / 1000, w);
        //if(i == 3 || i == 4)
        //    error("offset " + offset + " for " + i + " screen " + screen);

		if (g_BackgroundLayerset[i].tiling)
		{
			let left = offset % iw;
			if (left >= 0)
				left -= iw;
			guiObj.size = new GUISize(left, screen.top, screen.right, screen.bottom);
		}
		else
			guiObj.size = new GUISize(screen.right/2 - h + offset, screen.top, screen.right/2 + h + offset, screen.bottom);
	}
}

function onTick()
{
	let now = Date.now();
	let tickLength = Date.now() - g_LastTickTime;
	g_LastTickTime = now;

	scrollBackgrounds();

	updateMenuPosition(tickLength);

	// Show splash screens here, so we don't interfere with main menu hotloading
	if (g_ShowSplashScreens)
	{
		g_ShowSplashScreens = false;

		if (Engine.ConfigDB_GetValue("user", "gui.splashscreen.enable") === "true" ||
		    Engine.ConfigDB_GetValue("user", "gui.splashscreen.version") < Engine.GetFileMTime("gui/splashscreen/splashscreen.txt"))
			Engine.PushGuiPage("page_splashscreen.xml", { "page": "splashscreen", "callback": "SplashScreenClosedCallback" });
		else
			ShowRenderPathMessage();
	}
}

function ShowRenderPathMessage()
{
	// Warn about removing fixed render path
	if (Engine.Renderer_GetRenderPath() == "fixed")
		messageBox(
			600, 300,
			"[font=\"sans-bold-16\"]" +
			sprintf(translate("%(warning)s You appear to be using non-shader (fixed function) graphics. This option will be removed in a future 0 A.D. release, to allow for more advanced graphics features. We advise upgrading your graphics card to a more recent, shader-compatible model."), {
				"warning": coloredText("Warning:", "200 20 20")
			}) +
			"\n\n" +
			// Translation: This is the second paragraph of a warning. The
			// warning explains that the user is using “non-shader“ graphics,
			// and that in the future this will not be supported by the game, so
			// the user will need a better graphics card.
			translate("Please press \"Read More\" for more information or \"OK\" to continue."),
			translate("WARNING!"),
			[translate("OK"), translate("Read More")],
			[ null, function() { Engine.OpenURL("https://www.wildfiregames.com/forum/index.php?showtopic=16734"); } ]
		);
}

function SplashScreenClosedCallback()
{
	ShowRenderPathMessage();
}

/**
 * Slide menu.
 */
function updateMenuPosition(dt)
{
	let submenu = Engine.GetGUIObjectByName("submenu");

	if (submenu.hidden == false)
	{
		// Number of pixels per millisecond to move
		let SPEED = 1.2;

		let maxOffset = Engine.GetGUIObjectByName("mainMenu").size.right - submenu.size.left;
		if (maxOffset > 0)
		{
			let offset = Math.min(SPEED * dt, maxOffset);
			let size = submenu.size;
			size.left += offset;
			size.right += offset;
			submenu.size = size;
		}
	}
}

/**
 * Opens the menu by revealing the screen which contains the menu.
 */
function openMenu(newSubmenu, position, buttonHeight, numButtons)
{
	currentSubmenuType = newSubmenu;
	Engine.GetGUIObjectByName(currentSubmenuType).hidden = false;

	let submenu = Engine.GetGUIObjectByName("submenu");
	let top = position - MARGIN;
	let bottom = position + ((buttonHeight + MARGIN) * numButtons);
	submenu.size = new GUISize(submenu.size.left, top, submenu.size.right, bottom);

	// Blend in right border of main menu into the left border of the submenu
	blendSubmenuIntoMain(top, bottom);

	submenu.hidden = false;
}

function closeMenu()
{
	Engine.GetGUIObjectByName(currentSubmenuType).hidden = true;

	let submenu = Engine.GetGUIObjectByName("submenu");
	submenu.hidden = true;
	submenu.size = Engine.GetGUIObjectByName("mainMenu").size;

	Engine.GetGUIObjectByName("MainMenuPanelRightBorderTop").size = "100%-2 0 100% 100%";
}

/**
 * Sizes right border on main menu panel to match the submenu.
 */
function blendSubmenuIntoMain(topPosition, bottomPosition)
{
	Engine.GetGUIObjectByName("MainMenuPanelRightBorderTop").size = "100%-2 0 100% " + (topPosition + MARGIN);
	Engine.GetGUIObjectByName("MainMenuPanelRightBorderBottom").size = "100%-2 " + (bottomPosition) + " 100% 100%";
}

function getBuildString()
{
	return sprintf(translate("Build: %(buildDate)s (%(revision)s)"), {
		"buildDate": Engine.GetBuildTimestamp(0),
		"revision": Engine.GetBuildTimestamp(2)
	});
}

function exitGamePressed()
{
	closeMenu();

	messageBox(
		400, 200,
		translate("Are you sure you want to quit Hyrule Conquest?"),
		translate("Confirmation"),
		[translate("No"), translate("Yes")],
		[null, Engine.Exit]
	);
}

function pressedScenarioEditorButton()
{
	closeMenu();

	if (Engine.AtlasIsAvailable())
		messageBox(
			400, 200,
			translate("Are you sure you want to quit Hyrule Conquest and open the Scenario Editor?"),
			translate("Confirmation"),
			[translate("No"), translate("Yes")],
			[null, Engine.RestartInAtlas]
		);
	else
		messageBox(
			400, 200,
			translate("The scenario editor is not available or failed to load. See the game logs for additional information."),
			translate("Error")
		);
}

function getLobbyDisabledByBuild()
{
	return translate("Launch the multiplayer lobby to join and host publicly visible games and chat with other players. \\[DISABLED BY BUILD]");
}

function getManual()
{
	return translate("Manual");
}
