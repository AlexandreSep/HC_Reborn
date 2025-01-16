/**
 * Available backgrounds, added by the files in backgrounds/.
 */
var g_BackgroundLayerData = [];

var g_NewBackgroundLayerData = [];

/**
 * This is the handler that coordinates all other handlers.
 */
var g_MainMenuPage;

function init(data, hotloadData)
{
	let useNewBackground = Engine.ConfigDB_GetValue("user", "background") === "false" || Engine.ConfigDB_GetValue("user", "background") === "";
	if (useNewBackground)
		g_BackgroundLayerData = g_NewBackgroundLayerData;

	g_MainMenuPage =
		new MainMenuPage(
			data,
			hotloadData,
			g_CenterMenuItems,
			g_BackgroundLayerData,
			g_ProjectInformationItems,
			g_BottomMenuButtons,
			g_TopMenuButtonsLeft,
			g_TopMenuButtonsRight);
}

function getHotloadData()
{
	return g_MainMenuPage.getHotloadData();
}
